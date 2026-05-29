package reminder_job

import (
	"context"
	"database/sql"
	"fmt"
	"time"
	"wappiz/pkg/crypto"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
	"wappiz/pkg/whatsapp"

	"github.com/google/uuid"
)

type job struct {
	db       db.Database
	whatsapp whatsapp.Client
	crypto   *crypto.Service
}

func New(cfg Config) *job {
	return &job{
		db:       cfg.DB,
		whatsapp: cfg.Whatsapp,
		crypto:   cfg.Crypto,
	}
}

func (j *job) Run(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	logger.Info("[reminder_job] started")

	for {
		select {
		case <-ctx.Done():
			logger.Info("[reminder_job] stopped")
			return
		case <-ticker.C:
			if err := j.process(ctx); err != nil {
				logger.Error("[reminder_job] failed to process job",
					"err", err)
			}
		}
	}
}

func (j *job) process(ctx context.Context) error {
	err := db.Tx(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		if err := db.Query.ClaimDueAppointmentReminderEvents(ctx, txx); err != nil {
			return fault.Wrap(err, fault.Internal("failed to claim due appointment reminders"))
		}

		pending, err := db.Query.FindPendingAppointmentReminderEvents(ctx, txx)
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to find pending appointment reminders"))
		}

		waConfigs := make(map[uuid.UUID]db.FindTenantWhatsappConfigRow)
		customers := make(map[uuid.UUID]db.FindCustomerByIDRow)
		decryptedByTenant := make(map[uuid.UUID]string)
		decryptErrByTenant := make(map[uuid.UUID]error)

		for _, reminder := range pending {
			waConfig, ok := waConfigs[reminder.TenantID]

			if !ok {
				waConfig, err = db.Query.FindTenantWhatsappConfig(ctx, txx, reminder.TenantID)
				if err != nil {
					j.markReminderFailed(ctx, txx, reminder.ID, err)
					continue
				}

				waConfigs[reminder.TenantID] = waConfig
			}

			customer, ok := customers[reminder.CustomerID]
			if !ok {
				customer, err = db.Query.FindCustomerByID(ctx, txx, reminder.CustomerID)
				if err != nil {
					j.markReminderFailed(ctx, txx, reminder.ID, err)
					continue
				}
				customers[reminder.CustomerID] = customer
			}

			if err := j.sendReminder(ctx, reminder, customer, waConfig, decryptedByTenant, decryptErrByTenant); err != nil {
				j.markReminderFailed(ctx, txx, reminder.ID, err)
				logger.Warn("[reminder_job] failed to send reminder",
					"err", err)
				continue
			}

			if err := j.markReminderSent(ctx, txx, reminder); err != nil {
				logger.Warn("[reminder_job] failed to mark reminder as sent",
					"event_id", reminder.ID,
					"err", err)
			}
		}

		return nil
	})

	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to process job"))
	}

	return nil
}

func (j *job) sendReminder(
	ctx context.Context,
	reminder db.FindPendingAppointmentReminderEventsRow,
	customer db.FindCustomerByIDRow,
	waConfig db.FindTenantWhatsappConfigRow,
	decryptedByTenant map[uuid.UUID]string,
	decryptErrByTenant map[uuid.UUID]error,
) error {
	if !waConfig.PhoneNumberID.Valid || !waConfig.AccessToken.Valid {
		return nil
	}

	timeLabel := "en 1 hora"
	if reminder.ReminderType == "24h" {
		timeLabel = "mañana"
	}

	// Fallback guard for any legacy rows.
	if reminder.ReminderType != "24h" && reminder.ReminderType != "1h" {
		timeUntil := time.Until(reminder.StartsAt)
		timeLabel = "mañana"
		if timeUntil < 2*time.Hour {
			timeLabel = "en 1 hora"
		}
	}

	body := fmt.Sprintf(
		"⏰ *Recordatorio de cita*\n\n"+
			"Hola, te recordamos que tienes una cita *%s*:\n\n"+
			"📅 %s\n"+
			"Si necesitas cancelar escríbenos aquí.",
		timeLabel,
		datetime.FormatTime(reminder.StartsAt, "Monday, 02 de January de 2006 a las 3:04 PM"),
	)

	decrypted, err := j.decryptedTokenForTenant(waConfig.TenantID, waConfig.AccessToken.String, decryptedByTenant, decryptErrByTenant)
	if err != nil {
		return fault.Wrap(err, fault.Internal("failed to decrypt token"))
	}

	if err := j.whatsapp.SendText(ctx, customer.PhoneNumber, waConfig.PhoneNumberID.String, decrypted, body); err != nil {
		return fault.Wrap(err, fault.Internal("failed to send reminder"))
	}

	return nil
}

// decryptedTokenForTenant returns the decrypted access token for a tenant, using
// decryptedByTenant / decryptErrByTenant so each tenant is decrypted at most once per process run.
func (j *job) decryptedTokenForTenant(
	tenantID uuid.UUID,
	ciphertext string,
	decryptedByTenant map[uuid.UUID]string,
	decryptErrByTenant map[uuid.UUID]error,
) (string, error) {
	if err, ok := decryptErrByTenant[tenantID]; ok {
		return "", err
	}
	if tok, ok := decryptedByTenant[tenantID]; ok {
		return tok, nil
	}
	tok, err := j.crypto.Decrypt(ciphertext)
	if err != nil {
		decryptErrByTenant[tenantID] = err
		return "", err
	}
	decryptedByTenant[tenantID] = tok
	return tok, nil
}

func (j *job) markReminderSent(ctx context.Context, txx db.DBTX, reminder db.FindPendingAppointmentReminderEventsRow) error {
	if err := db.Query.MarkAppointmentReminderSentByType(ctx, txx, db.MarkAppointmentReminderSentByTypeParams{
		ReminderType:  reminder.ReminderType,
		AppointmentID: reminder.AppointmentID,
	}); err != nil {
		return fault.Wrap(err, fault.Internal("failed to mark reminder as sent"))
	}

	if err := db.Query.MarkAppointmentReminderEventSent(ctx, txx, reminder.ID); err != nil {
		return fault.Wrap(err, fault.Internal("failed to mark reminder as sent"))
	}

	return nil
}

func (j *job) markReminderFailed(ctx context.Context, txx db.DBTX, eventID uuid.UUID, reminderErr error) {
	errMsg := reminderErr.Error()
	if len(errMsg) > 1000 {
		errMsg = errMsg[:1000]
	}

	if err := db.Query.MarkAppointmentReminderEventFailed(ctx, txx, db.MarkAppointmentReminderEventFailedParams{
		ID:        eventID,
		LastError: sql.NullString{String: errMsg, Valid: true},
	}); err != nil {
		logger.Warn("[reminder_job] failed to mark reminder event as failed",
			"event_id", eventID,
			"err", err)
	}
}
