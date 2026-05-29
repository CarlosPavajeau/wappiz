package webhookprocessor

import (
	"context"
	"database/sql"
	"sync"
	"time"
	"wappiz/internal/services/statemachine"
	"wappiz/pkg/buffer"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/logger"
)

type Config struct {
	DB           db.Database
	StateMachine statemachine.StateMachineService
	Crypto       *crypto.Service
	Workers      int
	BufferCap    int
}

type service struct {
	db           db.Database
	stateMachine statemachine.StateMachineService
	crypto       *crypto.Service
	msgBuffer    *buffer.Buffer[Request]
	wg           sync.WaitGroup
}

func New(cfg Config) Service {
	s := &service{
		db:           cfg.DB,
		stateMachine: cfg.StateMachine,
		crypto:       cfg.Crypto,
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
