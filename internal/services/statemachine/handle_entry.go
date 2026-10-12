package statemachine

import (
	"context"
	"encoding/json"
	"math/rand/v2"
	"strings"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
	"wappiz/pkg/whatsapp"

	"github.com/google/uuid"
)

func (s *service) handleEntry(ctx context.Context, msg IncomingMessage, customer db.FindCustomerByPhoneNumberRow) error {
	if msg.InteractiveID != nil {
		interactiveID := *msg.InteractiveID

		switch {
		case interactiveID == "action_schedule":
			sessionID := uuid.New()
			if err := db.Query.InsertConversationSession(ctx, s.db.Primary(), db.InsertConversationSessionParams{
				ID:               sessionID,
				TenantID:         msg.TenantID,
				WhatsappConfigID: msg.WhatsappConfigID,
				CustomerID:       customer.ID,
				Step:             string(StepSelectService),
				Data:             json.RawMessage("{}"),
				ExpiresAt:        time.Now().Add(sessionTTL),
			}); err != nil {
				return fault.Wrap(err, fault.Internal("create session"))
			}

			return s.sendServiceList(ctx, msg)

		case interactiveID == "action_my_appointments":
			return s.handleMyAppointments(ctx, msg, customer)

		case interactiveID == "action_cancel":
			return s.handleCancelFlow(ctx, msg, customer)

		case strings.HasPrefix(interactiveID, "cancel_"):
			return s.handleCancelConfirm(ctx, msg, customer)

		case strings.HasPrefix(interactiveID, "confirm_cancel_"):
			return s.handleCancelExecute(ctx, msg, customer)

		case interactiveID == "action_keep":
			return s.whatsapp.SendText(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, "👍 Perfecto, tu cita sigue agendada. ¿Hay algo más en lo que pueda ayudarte?")
		default:
			logger.Warn("[scheduling] unknown interactive ID on entry step, ignoring",
				"tenant_id", msg.TenantID,
				"interactive_id", interactiveID)
		}
	}

	release, claimed := s.claimWelcomeMenu(ctx, msg)
	if !claimed {
		return nil
	}
	if err := s.sendWelcomeMenu(ctx, msg); err != nil {
		release()
		return err
	}
	return nil
}

func (s *service) sendWelcomeMenu(ctx context.Context, msg IncomingMessage) error {
	tenant, err := db.Query.FindTenantByID(ctx, s.db.Primary(), msg.TenantID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find tenant"))
	}

	tenantSettings, err := db.UnmarshalNullableJSONTo[db.TenantSettings]([]byte(tenant.Settings))
	if err != nil {
		return fault.Wrap(err, fault.Internal("unmarshal tenant settings"))
	}

	var welcomeMsg string
	if len(tenantSettings.WelcomeMessage) > 0 {
		welcomeMsg = tenantSettings.WelcomeMessage
	} else {
		welcomeMsg = "¡Hola! Bienvenido a *" + tenant.Name + "*"
	}

	body := "👋 " + welcomeMsg + "\n\n¿Qué deseas hacer?"
	buttons := []whatsapp.Button{
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "action_schedule", Title: "📅 Agendar cita"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "action_my_appointments", Title: "📋 Mis citas"}},
		{Type: "reply", Reply: whatsapp.ButtonReply{ID: "action_cancel", Title: "❌ Cancelar cita"}},
	}

	return s.whatsapp.SendButtons(ctx, msg.From, msg.PhoneNumberID, msg.AccessToken, body, buttons)
}

// claimWelcomeMenu keeps a customer who greets several times in a row, such
// as "Hola" three times, from getting the menu once per message: the first
// one already shows every option, and repeating it reads as spam. Messages
// within the cooldown get no reply. A store failure sends the menu, since a
// repeated menu is better than silence.
//
// It returns the function that forgets the claim when the menu could not be
// sent, so the customer's next greeting, or a redelivery of this one, gets it
// instead of silence. Each claim stores its own token and the release only
// deletes the key while it still holds that token: a worker paused past the
// cooldown would otherwise erase the claim of a menu sent after it expired.
// After a store failure ownership is unknown, so nothing is released.
func (s *service) claimWelcomeMenu(ctx context.Context, msg IncomingMessage) (release func(), claimed bool) {
	key := welcomeMenuKey(msg)
	token := rand.Int64()

	first, err := s.cooldowns.SetIfNotExists(ctx, key, token, welcomeMenuCooldown)
	if err != nil {
		logger.Warn("[scheduling] failed to record welcome menu, sending anyway",
			"tenant_id", msg.TenantID,
			"err", err)
		return func() {}, true
	}
	if !first {
		logger.Info("[scheduling] welcome menu sent recently, ignoring message",
			"tenant_id", msg.TenantID,
			"from", maskPhone(msg.From))
		return func() {}, false
	}
	return func() { s.releaseWelcomeMenu(ctx, msg, key, token) }, true
}

// releaseWelcomeMenu runs after a failed send, which may be the deadline
// itself, so it detaches from it and gets its own short deadline.
func (s *service) releaseWelcomeMenu(ctx context.Context, msg IncomingMessage, key string, token int64) {
	releaseCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()

	if _, err := s.cooldowns.DeleteIfEquals(releaseCtx, key, token); err != nil {
		logger.Warn("[scheduling] failed to release welcome menu",
			"tenant_id", msg.TenantID,
			"err", err)
	}
}

func welcomeMenuKey(msg IncomingMessage) string {
	return "whatsapp-welcome-menu:" + msg.TenantID.String() + ":" + msg.From
}
