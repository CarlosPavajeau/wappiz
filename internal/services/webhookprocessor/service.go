package webhookprocessor

import (
	"context"
	"database/sql"
	"strconv"
	"sync"
	"time"
	"wappiz/internal/services/statemachine"
	"wappiz/pkg/buffer"
	"wappiz/pkg/counter"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/logger"
)

// seenMessageTTL only needs to outlive retries of messages already processed,
// which happen when our acknowledgement was lost or slow; Meta resends those
// within minutes to hours. A message that never reached us is not a duplicate,
// so covering Meta's whole multi-day retry window would only cost memory:
// Redis holds one key per message received in the last TTL.
const seenMessageTTL = 24 * time.Hour

// maxMessageAge matches the conversation session TTL. Meta can deliver a
// message hours or days late after an outage on either side; by then the
// session it belonged to has expired, so answering would restart a booking
// the customer no longer expects. They are dropped without a reply: after an
// outage a customer may have several queued, and one late reply each would
// read as spam.
const maxMessageAge = 30 * time.Minute

type Config struct {
	DB           db.Database
	StateMachine statemachine.StateMachineService
	Crypto       *crypto.Service
	// SeenMessages records processed message IDs, shared by every instance.
	SeenMessages counter.Counter
	Workers      int
	BufferCap    int
}

type service struct {
	db           db.Database
	stateMachine statemachine.StateMachineService
	crypto       *crypto.Service
	seenMessages counter.Counter
	msgBuffer    *buffer.Buffer[Request]
	wg           sync.WaitGroup
}

func New(cfg Config) Service {
	s := &service{
		db:           cfg.DB,
		stateMachine: cfg.StateMachine,
		crypto:       cfg.Crypto,
		seenMessages: cfg.SeenMessages,
		msgBuffer: buffer.New[Request](buffer.Config{
			Name:     "webhook_payloads",
			Capacity: cfg.BufferCap,
			Drop:     true,
		}),
	}
	s.wg.Add(cfg.Workers)
	for range cfg.Workers {
		go s.worker()
	}
	return s
}

func (s *service) Enqueue(req Request) {
	s.msgBuffer.Buffer(req)
}

func (s *service) Close() error {
	s.msgBuffer.Close()
	s.wg.Wait()
	return nil
}

func (s *service) worker() {
	defer s.wg.Done()
	for req := range s.msgBuffer.Consume() {
		s.processPayload(req)
	}
}

func (s *service) processPayload(req Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for _, entry := range req.Entry {
		for _, change := range entry.Changes {
			if change.Field != "messages" {
				continue
			}

			phoneNumberID := change.Value.Metadata.PhoneNumberID
			waConfig, err := db.Query.FindTenantWhatsappConfigByPhoneNumberID(ctx, s.db.Primary(), sql.NullString{
				String: phoneNumberID,
				Valid:  true,
			})

			if err != nil {
				logger.Warn("webhook: unknown phone_number_id",
					"phone_number_id", phoneNumberID,
					"err", err)
				continue
			}

			decryptedAccessToken, err := s.crypto.Decrypt(waConfig.AccessToken.String)
			if err != nil {
				logger.Warn("webhook: failed to decrypt access token",
					"phone_number_id", phoneNumberID,
					"tenant_id", waConfig.TenantID,
					"err", err)
				continue
			}

			for _, msg := range change.Value.Messages {
				if isStale(msg.Timestamp, time.Now()) {
					logger.Info("webhook: stale message ignored",
						"phone_number_id", phoneNumberID,
						"message_id", msg.ID,
						"timestamp", msg.Timestamp)
					continue
				}

				if !s.claimMessage(ctx, phoneNumberID, msg.ID) {
					continue
				}

				incoming, err := s.buildIncomingMessage(msg, change.Value.Metadata, waConfig, decryptedAccessToken)
				if err != nil {
					logger.Warn("webhook: failed to build message",
						"from", msg.From,
						"err", err)
					continue
				}

				if err := s.stateMachine.Process(ctx, *incoming); err != nil {
					logger.Warn("webhook: error processing message from",
						"from", msg.From,
						"err", err)
				}
			}
		}
	}
}

// isStale reports whether a message was sent more than maxMessageAge before
// now. Timestamp is the Unix time in seconds Meta sends as a string; a
// missing or malformed one is treated as fresh so no message is lost to a
// payload change.
func isStale(timestamp string, now time.Time) bool {
	sentAt, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}
	return now.Sub(time.Unix(sentAt, 0)) > maxMessageAge
}

// claimMessage reports whether msgID is seen for the first time. Meta
// delivers webhooks at least once, so the same message can arrive again
// after a timeout or a restart; processing it twice would answer twice and
// count a single reply as two failed attempts. Messages without an ID, or a
// store failure, are let through: a rare duplicate is better than a
// customer's message silently lost.
func (s *service) claimMessage(ctx context.Context, phoneNumberID, msgID string) bool {
	if msgID == "" {
		return true
	}

	first, err := s.seenMessages.SetIfNotExists(ctx, "whatsapp-message:"+phoneNumberID+":"+msgID, 1, seenMessageTTL)
	if err != nil {
		logger.Warn("webhook: failed to record message id, processing anyway",
			"phone_number_id", phoneNumberID,
			"err", err)
		return true
	}
	if !first {
		logger.Info("webhook: duplicate message ignored",
			"phone_number_id", phoneNumberID,
			"message_id", msgID)
	}
	return first
}

func (s *service) buildIncomingMessage(
	msg Message,
	metadata Metadata,
	waConfig db.FindTenantWhatsappConfigByPhoneNumberIDRow,
	decryptedAccessToken string,
) (*statemachine.IncomingMessage, error) {
	incoming := &statemachine.IncomingMessage{
		TenantID:         waConfig.TenantID,
		WhatsappConfigID: waConfig.ID,
		PhoneNumberID:    metadata.PhoneNumberID,
		AccessToken:      decryptedAccessToken,
		From:             msg.From,
		ReceivedAt:       time.Now(),
	}

	switch msg.Type {
	case "text":
		if msg.Text != nil {
			incoming.Body = msg.Text.Body
		}

	case "interactive":
		if msg.Interactive == nil {
			break
		}
		switch msg.Interactive.Type {
		case "button_reply":
			if msg.Interactive.ButtonReply != nil {
				incoming.InteractiveID = new(msg.Interactive.ButtonReply.ID)
				incoming.Body = msg.Interactive.ButtonReply.Title
			}
		case "list_reply":
			if msg.Interactive.ListReply != nil {
				incoming.InteractiveID = new(msg.Interactive.ListReply.ID)
				incoming.Body = msg.Interactive.ListReply.Title
			}
		}

	default:
		// Unsupported message types: audio, image, document, video, sticker, location, contacts, etc.
		// We can log them for now, but we won't process them until we have a use case for it.
		logger.Warn("webhook: unsupported message",
			"type", msg.Type,
			"from", msg.From)
	}

	return incoming, nil
}
