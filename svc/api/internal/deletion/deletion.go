// Package deletion holds the rules shared by routes that soft-delete
// entities appointments depend on.
package deletion

import (
	"fmt"
	"wappiz/pkg/codes"
	"wappiz/pkg/fault"
)

// Entity names what is being deleted in the user-facing message. It is a
// closed set so every message reads correctly in Spanish.
type Entity string

const (
	EntityResource Entity = "recurso"
	EntityService  Entity = "servicio"
)

// UpcomingAppointmentsError explains why entity cannot be deleted while
// count appointments still need it. The public message carries the count
// and what the owner can do, so clients can show it as is.
func UpcomingAppointmentsError(entity Entity, count int64) error {
	message := "Este %s tiene %d citas programadas. Cancélalas o espera a que terminen antes de eliminarlo."
	if count == 1 {
		message = "Este %s tiene %d cita programada. Cancélala o espera a que termine antes de eliminarlo."
	}

	return fault.New(fmt.Sprintf("%s has upcoming appointments", entity),
		fault.Code(codes.AppErrorsHasUpcomingAppointments),
		fault.Internal(fmt.Sprintf("%s has %d upcoming appointments", entity, count)),
		fault.Public(fmt.Sprintf(message, entity, count)),
	)
}
