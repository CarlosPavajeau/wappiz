package state_machine

import (
	"context"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"

	"github.com/google/uuid"
)

func (s *service) recordFlowFieldResponses(ctx context.Context, appointmentID uuid.UUID, answers map[string]string) error {
	for fieldKey, response := range answers {
		if err := db.Query.InsertAppointmentFieldResponse(ctx, s.db.Primary(), db.InsertAppointmentFieldResponseParams{
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
