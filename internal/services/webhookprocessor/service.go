package webhookprocessor

import (
	"context"
	"database/sql"
	"hash/fnv"
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

// processTimeout bounds the handling of one message, replies included.
const processTimeout = 10 * time.Second

// senderLockTTL outlives processTimeout so a lock is never released by expiry
// while its holder is still processing; it only expires on its own when the
// holder crashed before releasing it.
const senderLockTTL = processTimeout + 5*time.Second

// senderLockWait gives a sender's message being processed by another instance
// time to finish, since that one is bounded by processTimeout.
const senderLockWait = processTimeout

const senderLockPoll = 100 * time.Millisecond

type Config struct {
	DB           db.Database
	StateMachine statemachine.StateMachineService
	Crypto       *crypto.Service
	// SeenMessages records processed message IDs, shared by every instance.
	SeenMessages counter.Counter
	// SenderLocks holds the per-sender locks, shared by every instance.
	SenderLocks counter.Counter
	Workers     int
	// BufferCap is the number of messages waiting to be processed, split
	// evenly between the workers.
	BufferCap int
}

// job is one inbound message. Payloads are split into jobs on enqueue so
// each message can be routed by its sender.
type job struct {
	metadata Metadata
	msg      Message
}

type service struct {
	db           db.Database
	stateMachine statemachine.StateMachineService
	crypto       *crypto.Service
	seenMessages counter.Counter
	senderLocks  counter.Counter
	lockWait     time.Duration
	// shards holds one queue per worker. A sender always lands in the same
	// one, so its messages are processed one at a time and in arrival order:
	// a customer who taps twice or types fast would otherwise have two
	// workers read and advance the same conversation step concurrently.
	shards []*buffer.Buffer[job]
	wg     sync.WaitGroup
}

func New(cfg Config) Service {
	workers := max(cfg.Workers, 1)
	s := &service{
		db:           cfg.DB,
		stateMachine: cfg.StateMachine,
		crypto:       cfg.Crypto,
		seenMessages: cfg.SeenMessages,
		senderLocks:  cfg.SenderLocks,
		lockWait:     senderLockWait,
		shards:       make([]*buffer.Buffer[job], workers),
	}
	for i := range s.shards {
		s.shards[i] = buffer.New[job](buffer.Config{
			Name:     "webhook_messages_" + strconv.Itoa(i),
			Capacity: max(cfg.BufferCap/workers, 1),
			Drop:     true,
		})
	}
	s.wg.Add(workers)
	for _, shard := range s.shards {
		go s.worker(shard)
	}
	return s
}

func (s *service) Enqueue(req Request) {
	for _, entry := range req.Entry {
		for _, change := range entry.Changes {
			if change.Field != "messages" {
				continue
			}
			for _, msg := range change.Value.Messages {
				shard := s.shards[shardIndex(change.Value.Metadata.PhoneNumberID, msg.From, len(s.shards))]
				shard.Buffer(job{metadata: change.Value.Metadata, msg: msg})
			}
		}
	}
}

func (s *service) Close() error {
	for _, shard := range s.shards {
		shard.Close()
	}
	s.wg.Wait()
	return nil
}

func (s *service) worker(shard *buffer.Buffer[job]) {
	defer s.wg.Done()
	for j := range shard.Consume() {
		s.processJob(j)
	}
}

// shardIndex maps a sender to a stable shard among n.
func shardIndex(phoneNumberID, from string, n int) int {
	h := fnv.New32a()
	_, _ = h.Write([]byte(phoneNumberID + ":" + from))
	return int(h.Sum32() % uint32(n))
}

func (s *service) processJob(j job) {
	phoneNumberID := j.metadata.PhoneNumberID
	msg := j.msg

	if isStale(msg.Timestamp, time.Now()) {
		logger.Info("webhook: stale message ignored",
			"phone_number_id", phoneNumberID,
			"message_id", msg.ID,
			"timestamp", msg.Timestamp)
		return
	}

	unlock := s.lockSender(phoneNumberID, msg.From)
	defer unlock()

	ctx, cancel := context.WithTimeout(context.Background(), processTimeout)
	defer cancel()

	waConfig, err := db.Query.FindTenantWhatsappConfigByPhoneNumberID(ctx, s.db.Primary(), sql.NullString{
		String: phoneNumberID,
		Valid:  true,
	})
	if err != nil {
		logger.Warn("webhook: unknown phone_number_id",
			"phone_number_id", phoneNumberID,
			"err", err)
		return
	}

	decryptedAccessToken, err := s.crypto.Decrypt(waConfig.AccessToken.String)
	if err != nil {
		logger.Warn("webhook: failed to decrypt access token",
			"phone_number_id", phoneNumberID,
			"tenant_id", waConfig.TenantID,
			"err", err)
		return
	}

	if !s.claimMessage(ctx, phoneNumberID, msg.ID) {
		return
	}

	incoming, err := s.buildIncomingMessage(msg, j.metadata, waConfig, decryptedAccessToken)
	if err != nil {
		logger.Warn("webhook: failed to build message",
			"from", msg.From,
			"err", err)
		s.releaseMessage(ctx, phoneNumberID, msg.ID)
		return
	}

	if err := s.stateMachine.Process(ctx, *incoming); err != nil {
		logger.Warn("webhook: error processing message from",
			"from", msg.From,
			"err", err)
		s.releaseMessage(ctx, phoneNumberID, msg.ID)
	}
}

// lockSender extends the per-sender serialization of the shards to every
// instance, which only matters once several run behind the webhook. It
// returns the function that releases the lock. Locking gives mutual
// exclusion, not ordering: across instances messages still race for the lock.
//
// A store failure, or a holder that does not finish within lockWait, lets the
// message through unlocked: as in claimMessage, a rare race beats a
// customer's message lost. The lock is released by deleting its key, which is
// safe without an owner token only because senderLockTTL outlives
// processTimeout, so the key cannot have expired and been taken by another
// instance while this one held it.
func (s *service) lockSender(phoneNumberID, from string) func() {
	key := senderLockKey(phoneNumberID, from)
	ctx, cancel := context.WithTimeout(context.Background(), s.lockWait)
	defer cancel()

	for {
		acquired, err := s.senderLocks.SetIfNotExists(ctx, key, 1, senderLockTTL)
		if err != nil && ctx.Err() == nil {
			logger.Warn("webhook: failed to lock sender, processing anyway",
				"phone_number_id", phoneNumberID,
				"err", err)
			return func() {}
		}
		if err == nil && acquired {
			return func() { s.unlockSender(phoneNumberID, key) }
		}

		select {
		case <-ctx.Done():
			logger.Warn("webhook: timed out waiting for sender lock, processing anyway",
				"phone_number_id", phoneNumberID)
			return func() {}
		case <-time.After(senderLockPoll):
		}
	}
}

func (s *service) unlockSender(phoneNumberID, key string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := s.senderLocks.Delete(ctx, key); err != nil {
		logger.Warn("webhook: failed to release sender lock",
			"phone_number_id", phoneNumberID,
			"err", err)
	}
}

func senderLockKey(phoneNumberID, from string) string {
	return "whatsapp-sender-lock:" + phoneNumberID + ":" + from
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

	first, err := s.seenMessages.SetIfNotExists(ctx, seenMessageKey(phoneNumberID, msgID), 1, seenMessageTTL)
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

// releaseMessage forgets a claimed message whose processing failed, so a
// redelivery gets another chance instead of being skipped as a duplicate.
// Processing may have failed after replying, so a redelivery can repeat that
// reply; as in claimMessage, a rare duplicate beats a lost message. The
// failure may be the payload deadline itself, so the release detaches from
// it and gets its own short deadline.
func (s *service) releaseMessage(ctx context.Context, phoneNumberID, msgID string) {
	if msgID == "" {
		return
	}

	releaseCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()

	if err := s.seenMessages.Delete(releaseCtx, seenMessageKey(phoneNumberID, msgID)); err != nil {
		logger.Warn("webhook: failed to release message id",
			"phone_number_id", phoneNumberID,
			"message_id", msgID,
			"err", err)
	}
}

func seenMessageKey(phoneNumberID, msgID string) string {
	return "whatsapp-message:" + phoneNumberID + ":" + msgID
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
