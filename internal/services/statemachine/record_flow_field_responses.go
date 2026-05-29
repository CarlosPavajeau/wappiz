package statemachine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

func recordFlowFieldResponses(ctx context.Context, txx db.DBTX, appointmentID uuid.UUID, answers map[string]string) error {
	for fieldKey, response := range answers {
		if response == "" {
			continue
		}
		if err := db.Query.InsertAppointmentFieldResponse(ctx, txx, db.InsertAppointmentFieldResponseParams{
			ID:            uuid.New(),
			AppointmentID: appointmentID,
			FieldKey:      fieldKey,
			Response:      response,
		}); err != nil {
			return fault.Wrap(err, fault.Internal("insert appointment field response"))
		}
	}

	return nil
}
