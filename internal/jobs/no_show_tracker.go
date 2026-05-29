package jobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
	"wappiz/pkg/crypto"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/pkg/logger"
	"wappiz/pkg/whatsapp"

	"github.com/google/uuid"
)

type NoShowTrackerConfig struct {
	DB       db.Database
	Whatsapp whatsapp.Client
	Crypto   *crypto.Service
}

type noShowTrackerJob struct {
	db       db.Database
	whatsapp whatsapp.Client
	crypto   *crypto.Service
}

type customerTenantKey struct {
	customerID uuid.UUID
	tenantID   uuid.UUID
}

type evalContext struct {
	tenants       map[uuid.UUID]db.Tenant
	settings      map[uuid.UUID]db.TenantSettings
	waConfigs     map[uuid.UUID]db.FindTenantWhatsappConfigRow
	accessTokens  map[uuid.UUID]string
	penaltyCounts map[customerTenantKey]penaltyCounts
}

type penaltyCounts struct {
	noShows     int32
	lateCancels int32
}

func NewNoShowTracker(cfg NoShowTrackerConfig) Job {
	return &noShowTrackerJob{
		db:       cfg.DB,
		whatsapp: cfg.Whatsapp,
		crypto:   cfg.Crypto,
	}
}

func (j *noShowTrackerJob) Run(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	logger.Info("[no_show_tracker] started")

	for {
		select {
		case <-ctx.Done():
			logger.Info("[no_show_tracker] stopped")
			return
		case <-ticker.C:
			if err := j.process(ctx); err != nil {
				logger.Error("[no_show_tracker] failed to process job",
					"err", err)
			}
		}
	}
}

func (j *noShowTrackerJob) process(ctx context.Context) error {
	affected := make(map[customerTenantKey]struct{})
	noShowUpdates := make(map[customerTenantKey]int32)
	lateCancelUpdates := make(map[customerTenantKey]int32)

	err := db.Tx(ctx, j.db.Primary(), func(ctx context.Context, txx db.DBTX) error {
		unattended, err := db.Query.MarkUnattendedAppointmentsNoShow(ctx, txx)
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to mark unattended appointments"))
		}

		for _, a := range unattended {
			if err := db.Query.InsertAppointmentStatusHistory(ctx, txx, db.InsertAppointmentStatusHistoryParams{
				ID:            uuid.New(),
				AppointmentID: a.ID,
				FromStatus:    db.AppointmentStatusConfirmed,
				ToStatus:      db.AppointmentStatusNoShow,
				ChangedBy:     sql.NullString{},
				ChangedByRole: sql.NullString{String: "system", Valid: true},
				Reason:        sql.NullString{String: "Auto-detected: customer did not check in", Valid: true},
			}); err != nil {
				logger.Warn("[no_show_tracker] failed to insert appointment history",
					"appointment_id", a.ID,
					"err", err)
				continue
			}

			inserted, err := db.Query.InsertAppointmentPenaltyEvent(ctx, txx, db.InsertAppointmentPenaltyEventParams{
				ID:            uuid.New(),
				AppointmentID: a.ID,
				TenantID:      a.TenantID,
				CustomerID:    a.CustomerID,
				EventType:     "no_show",
				OccurredAt:    time.Now().UTC(),
			})
			if err != nil {
				logger.Warn("[no_show_tracker] failed to insert no-show penalty event",
					"appointment_id", a.ID,
					"err", err)
				continue
			}

			if inserted == 0 {
				continue
			}

			key := customerTenantKey{customerID: a.CustomerID, tenantID: a.TenantID}
			noShowUpdates[key]++
			affected[key] = struct{}{}
		}

		recentlyCancelled, err := db.Query.FindRecentlyCancelledAppointments(ctx, txx)
		if err != nil {
			return fault.Wrap(err, fault.Internal("failed to find recently cancelled appointments"))
		}

		tenantSettingsCache := make(map[uuid.UUID]db.TenantSettings)
		for _, a := range recentlyCancelled {
			if !a.CancelledAt.Valid {
				continue
			}

			tenantSettings, ok := tenantSettingsCache[a.TenantID]
			if !ok {
				tenant, tenantErr := db.Query.FindTenantByID(ctx, txx, a.TenantID)
				if tenantErr != nil {
					logger.Warn("[no_show_tracker] failed to find tenant",
						"tenant_id", a.TenantID,
						"err", tenantErr)
					continue
				}

				if err := json.Unmarshal(tenant.Settings, &tenantSettings); err != nil {
					logger.Warn("[no_show_tracker] failed to unmarshal tenant settings",
						"tenant_id", a.TenantID,
						"err", err)
					continue
				}
				tenantSettingsCache[a.TenantID] = tenantSettings
			}

			lateHours := tenantSettings.LateCancelHours
			if lateHours == 0 {
				lateHours = 2
			}

			if a.StartsAt.Sub(a.CancelledAt.Time).Hours() >= float64(lateHours) {
				continue // not a late cancellation
			}

			inserted, err := db.Query.InsertAppointmentPenaltyEvent(ctx, txx, db.InsertAppointmentPenaltyEventParams{
				ID:            uuid.New(),
				AppointmentID: a.ID,
				TenantID:      a.TenantID,
				CustomerID:    a.CustomerID,
				EventType:     "late_cancel",
				OccurredAt:    a.CancelledAt.Time,
			})
			if err != nil {
				logger.Warn("[no_show_tracker] failed to insert late-cancel penalty event",
					"appointment_id", a.ID,
					"err", err)
				continue
			}

			if inserted == 0 {
				continue
			}

			key := customerTenantKey{customerID: a.CustomerID, tenantID: a.TenantID}
			lateCancelUpdates[key]++
			affected[key] = struct{}{}
		}

		if err := incrementNoShowBatch(ctx, txx, noShowUpdates); err != nil {
			return fault.Wrap(err, fault.Internal("failed to increment no-show batch"))
		}

		if err := incrementLateCancelBatch(ctx, txx, lateCancelUpdates); err != nil {
			return fault.Wrap(err, fault.Internal("failed to increment late batch"))
		}

		return nil
	})

	if err != nil {
		logger.Warn("[no_show_tracker] failed to process records",
			"err", err)
		return err
	}

	eCtx := &evalContext{
		tenants:       make(map[uuid.UUID]db.Tenant),
		settings:      make(map[uuid.UUID]db.TenantSettings),
		waConfigs:     make(map[uuid.UUID]db.FindTenantWhatsappConfigRow),
		accessTokens:  make(map[uuid.UUID]string),
		penaltyCounts: make(map[customerTenantKey]penaltyCounts),
	}

	for key := range affected {
		j.evaluateCustomer(ctx, eCtx, key.tenantID, key.customerID)
	}

	return nil
}

func (j *noShowTrackerJob) evaluateCustomer(ctx context.Context, eCtx *evalContext, tenantID, customerID uuid.UUID) {
	customer, err := db.Query.FindCustomerByID(ctx, j.db.Primary(), customerID)
	if err != nil {
		logger.Warn("[no_show_tracker] failed to find customer",
			"customer_id", customerID,
			"err", err)
		return
	}

	if customer.IsBlocked { // Don't notify blocked customers
		return
	}

	tenant, tenantSettings, err := j.getTenantEvaluationData(ctx, eCtx, tenantID)
	if err != nil {
		return
	}

	counts, err := j.getCustomerPenaltyCounts(ctx, eCtx, tenantID, customerID)
	if err != nil {
		return
	}

	autoBlockNoShows := tenantSettings.AutoBlockAfterNoShows
	if autoBlockNoShows == 0 {
		autoBlockNoShows = 3
	}
	autoBlockLateCancel := tenantSettings.AutoBlockAfterLateCancel
	if autoBlockLateCancel == 0 {
		autoBlockLateCancel = 3
	}

	autoBlockThreshold := autoBlockNoShows
	if autoBlockLateCancel < autoBlockThreshold {
		autoBlockThreshold = autoBlockLateCancel
	}

	warningThreshold := autoBlockThreshold - 1
	totalEvents := counts.noShows + counts.lateCancels

	waConfig, accessToken, err := j.getTenantWhatsappData(ctx, eCtx, tenantID)
	if err != nil {
		return
	}

	if !waConfig.PhoneNumberID.Valid {
		return
	}

	phoneNumberID := waConfig.PhoneNumberID.String

	if totalEvents >= int32(autoBlockThreshold) {
		err := db.Query.BlockCustomer(ctx, j.db.Primary(), db.BlockCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		})
		if err != nil {
			logger.Warn("[no_show_tracker] failed to block customer",
				"err", err)
			return
		}

		// TODO: Notify to tenant owner about customer's block

		if tenantSettings.SendWarningBeforeBlock {
			customerMsg := buildCustomerBlockMessage(tenant.Name)
			if err := j.whatsapp.SendText(ctx, customer.PhoneNumber, phoneNumberID, accessToken, customerMsg); err != nil {
				logger.Warn("[no_show_tracker] failed to send block notification to customer",
					"customer_id", customerID,
					"err", err)
			}
		}
	} else if totalEvents == int32(warningThreshold) && tenantSettings.SendWarningBeforeBlock {
		remaining := int32(autoBlockThreshold) - totalEvents
		customerMsg := buildCustomerWarningMessage(tenant.Name, remaining)

		if err := j.whatsapp.SendText(ctx, customer.PhoneNumber, phoneNumberID, accessToken, customerMsg); err != nil {
			logger.Warn("[no_show_tracker] failed to send block notification to customer",
				"customer_id", customerID,
				"err", err)
		}
	}
}

func (j *noShowTrackerJob) getTenantEvaluationData(ctx context.Context, eCtx *evalContext, tenantID uuid.UUID) (db.Tenant, db.TenantSettings, error) {
	tenant, ok := eCtx.tenants[tenantID]
	if !ok {
		var err error
		tenant, err = db.Query.FindTenantByID(ctx, j.db.Primary(), tenantID)
		if err != nil {
			logger.Warn("[no_show_tracker] failed to find tenant",
				"tenant_id", tenantID,
				"err", err)
			return db.Tenant{}, db.TenantSettings{}, err
		}
		eCtx.tenants[tenantID] = tenant
	}

	settings, ok := eCtx.settings[tenantID]
	if !ok {
		if err := json.Unmarshal(tenant.Settings, &settings); err != nil {
			logger.Warn("[no_show_tracker] failed to unmarshal tenant settings",
				"tenant_id", tenantID,
				"err", err)
			return db.Tenant{}, db.TenantSettings{}, err
		}
		eCtx.settings[tenantID] = settings
	}

	return tenant, settings, nil
}

func (j *noShowTrackerJob) getTenantWhatsappData(
	ctx context.Context,
	eCtx *evalContext,
	tenantID uuid.UUID,
) (db.FindTenantWhatsappConfigRow, string, error) {
	waConfig, ok := eCtx.waConfigs[tenantID]
	if !ok {
		var err error
		waConfig, err = db.Query.FindTenantWhatsappConfig(ctx, j.db.Primary(), tenantID)
		if err != nil {
			logger.Warn("[no_show_tracker] failed to find tenant whatsapp config",
				"tenant_id", tenantID,
				"err", err)
			return db.FindTenantWhatsappConfigRow{}, "", err
		}
		eCtx.waConfigs[tenantID] = waConfig
	}

	if !waConfig.PhoneNumberID.Valid || !waConfig.AccessToken.Valid {
		return waConfig, "", nil
	}

	accessToken, ok := eCtx.accessTokens[tenantID]
	if !ok {
		decrypted, err := j.crypto.Decrypt(waConfig.AccessToken.String)
		if err != nil {
			logger.Warn("[no_show_tracker] failed to decrypt tenant whatsapp token",
				"tenant_id", tenantID,
				"err", err)
			return db.FindTenantWhatsappConfigRow{}, "", err
		}
		accessToken = decrypted
		eCtx.accessTokens[tenantID] = accessToken
	}

	return waConfig, accessToken, nil
}

func (j *noShowTrackerJob) getCustomerPenaltyCounts(
	ctx context.Context,
	eCtx *evalContext,
	tenantID, customerID uuid.UUID,
) (penaltyCounts, error) {
	key := customerTenantKey{customerID: customerID, tenantID: tenantID}
	if counts, ok := eCtx.penaltyCounts[key]; ok {
		return counts, nil
	}

	row, err := db.Query.FindCustomerPenaltyCounts(ctx, j.db.Primary(), db.FindCustomerPenaltyCountsParams{
		ID:       customerID,
		TenantID: tenantID,
	})
	if err != nil {
		logger.Warn("[no_show_tracker] failed to load customer penalty counts",
			"customer_id", customerID,
			"tenant_id", tenantID,
			"err", err)
		return penaltyCounts{}, err
	}
	counts := penaltyCounts{
		noShows:     row.NoShowCount,
		lateCancels: row.LateCancelCount,
	}

	eCtx.penaltyCounts[key] = counts
	return counts, nil
}

func incrementNoShowBatch(ctx context.Context, tx db.DBTX, updates map[customerTenantKey]int32) error {
	if len(updates) == 0 {
		return nil
	}

	customerIDs := make([]uuid.UUID, 0, len(updates))
	tenantIDs := make([]uuid.UUID, 0, len(updates))
	increments := make([]int32, 0, len(updates))
	for key, increment := range updates {
		if increment <= 0 {
			continue
		}
		customerIDs = append(customerIDs, key.customerID)
		tenantIDs = append(tenantIDs, key.tenantID)
		increments = append(increments, increment)
	}

	if len(increments) == 0 {
		return nil
	}

	if err := db.Query.IncrementCustomersNoShowsBatch(ctx, tx, db.IncrementCustomersNoShowsBatchParams{
		CustomerIds: customerIDs,
		TenantIds:   tenantIDs,
		Increments:  increments,
	}); err != nil {
		logger.Warn("[no_show_tracker] failed to increment no-show penalties in batch",
			"err", err)
		return err
	}

	return nil
}

func incrementLateCancelBatch(ctx context.Context, tx db.DBTX, updates map[customerTenantKey]int32) error {
	if len(updates) == 0 {
		return nil
	}

	customerIDs := make([]uuid.UUID, 0, len(updates))
	tenantIDs := make([]uuid.UUID, 0, len(updates))
	increments := make([]int32, 0, len(updates))
	for key, increment := range updates {
		if increment <= 0 {
			continue
		}
		customerIDs = append(customerIDs, key.customerID)
		tenantIDs = append(tenantIDs, key.tenantID)
		increments = append(increments, increment)
	}

	if len(increments) == 0 {
		return nil
	}

	if err := db.Query.IncrementCustomersLateCancelsBatch(ctx, tx, db.IncrementCustomersLateCancelsBatchParams{
		CustomerIds: customerIDs,
		TenantIds:   tenantIDs,
		Increments:  increments,
	}); err != nil {
		logger.Warn("[no_show_tracker] failed to increment late-cancel penalties in batch",
			"err", err)
		return err
	}

	return nil
}

func buildCustomerBlockMessage(tenantName string) string {
	return fmt.Sprintf(
		"Hola, lamentablemente hemos tenido que suspender tu acceso para agendar citas en *%s* debido a ausencias repetidas. Comunícate directamente con el negocio.",
		tenantName,
	)
}

func buildCustomerWarningMessage(tenantName string, remaining int32) string {
	return fmt.Sprintf(
		"Hola, hemos registrado ausencias en tus citas con *%s*. Por favor recuerda cancelar con anticipación. %d ausencia(s) más podría suspender tu acceso.",
		tenantName, remaining,
	)
}
