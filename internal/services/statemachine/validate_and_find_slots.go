package statemachine

import (
	"context"
	"time"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/codes"
	"wappiz/pkg/datetime"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
)

func (s *service) validateAndFindSlots(ctx context.Context, input, timezone string, session db.ConversationSession) (*DateValidationResult, error) {
	loc, _ := time.LoadLocation(timezone)
	t, err := datetime.ParseDateTime(input, loc)
	if err != nil {
		return nil, err
	}

	if t.Before(time.Now()) {
		return nil, fault.New("date is in the past", fault.Code(codes.AppErrorsDateInPast))
	}

	sessionData, err := db.UnmarshalNullableJSONTo[SessionData]([]byte(session.Data))
	if err != nil {
		return nil, fault.Wrap(err, fault.Internal("unmarshal session data"))
	}

	svc, err := db.Query.FindServiceByID(ctx, s.db.Primary(), *sessionData.ServiceID)
	if err != nil {
		return nil, fault.Wrap(err, fault.Internal("find service by id"))
	}

	endsAt := t.Add(time.Duration(svc.DurationMinutes) * time.Minute)

	// Check customer-level conflict for the requested time upfront so the
	// confirmation screen is never shown when the customer is already busy.
	customerConflict, err := s.hasCustomerOverlap(ctx, session.TenantID, session.CustomerID, t, endsAt)
	if err != nil {
		return nil, fault.Wrap(err, fault.Internal("check customer overlap"))
	}

	if sessionData.ResourceID != nil {
		slots, err := s.slotFinder.FindAvailableSlots(ctx, slotfinder.FindAvailableSlotsParams{
			ResourceID: *sessionData.ResourceID,
			Date:       t,
			Service: slotfinder.ServiceParam{
				DurationMinutes: svc.DurationMinutes,
				BufferMinutes:   svc.BufferMinutes,
			},
		})

		if err != nil {
			return nil, fault.Wrap(err, fault.Internal("find available slots"))
		}

		if len(slots) == 0 {
			return nil, fault.New("day off", fault.Code(codes.AppErrorsDayOff))
		}

		if !customerConflict {
			for _, slot := range slots {
				if slot.StartsAt.Equal(t) {
					return &DateValidationResult{
						StartsAt:   t,
						ResourceID: new(*sessionData.ResourceID),
					}, nil
				}
			}
		}

		suggestions, err := s.slotFinder.GetSuggestedSlots(ctx, slotfinder.GetSuggestedSlotsParams{
			ResourceID: *sessionData.ResourceID,
			From:       t,
			Service: slotfinder.ServiceParam{
				DurationMinutes: svc.DurationMinutes,
				BufferMinutes:   svc.BufferMinutes,
			},
		})

		if err != nil {
			return nil, fault.Wrap(err, fault.Internal("get suggested slots"))
		}

		filtered := s.filterSlotsByCustomerAvailability(ctx, session.TenantID, session.CustomerID, suggestions)
		return &DateValidationResult{StartsAt: t, SlotTaken: true, Slots: filtered}, nil
	}

	rsc, err := db.Query.FindResourcesByServiceID(ctx, s.db.Primary(), db.FindResourcesByServiceIDParams{
		TenantID:  session.TenantID,
		ServiceID: *sessionData.ServiceID,
	})

	if err != nil {
		return nil, fault.Wrap(err, fault.Internal("find resources by service id"))
	}

	if !customerConflict {
		for _, res := range rsc {
			slots, err := s.slotFinder.FindAvailableSlots(ctx, slotfinder.FindAvailableSlotsParams{
				ResourceID: res.ID,
				Date:       t,
				Service: slotfinder.ServiceParam{
					DurationMinutes: svc.DurationMinutes,
					BufferMinutes:   svc.BufferMinutes,
				},
			})

			if err != nil {
				continue
			}

			for _, slot := range slots {
				if slot.StartsAt.Equal(t) {
					return &DateValidationResult{
						StartsAt:   t,
						ResourceID: new(res.ID),
					}, nil
				}
			}
		}
	}

	// Find suggestions across all resources and filter out slots the customer
	// is already booked for.
	var allSuggestions []slotfinder.TimeSlot
	for _, res := range rsc {
		suggestions, _ := s.slotFinder.GetSuggestedSlots(ctx, slotfinder.GetSuggestedSlotsParams{
			ResourceID: res.ID,
			From:       t,
			Service: slotfinder.ServiceParam{
				DurationMinutes: svc.DurationMinutes,
				BufferMinutes:   svc.BufferMinutes,
			},
		})

		allSuggestions = append(allSuggestions, suggestions...)

		if len(allSuggestions) >= 3 {
			break
		}
	}

	filtered := s.filterSlotsByCustomerAvailability(ctx, session.TenantID, session.CustomerID, allSuggestions)
	return &DateValidationResult{StartsAt: t, SlotTaken: true, Slots: filtered}, nil
}
