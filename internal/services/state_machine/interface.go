package state_machine

import (
	"context"
	"time"
	"wappiz/internal/services/slot_finder"

	"github.com/google/uuid"
)

type StateMachineService interface {
	Process(ctx context.Context, msg IncomingMessage) error
}

type IncomingMessage struct {
	TenantID         uuid.UUID
	WhatsappConfigID uuid.UUID
	PhoneNumberID    string
	AccessToken      string
	From             string
	Body             string
	InteractiveID    *string
	ReceivedAt       time.Time
}

type SessionData struct {
	ServiceID           *uuid.UUID        `json:"service_id,omitempty"`
	ResourceID          *uuid.UUID        `json:"resource_id,omitempty"`
	StartsAt            *time.Time        `json:"starts_at,omitempty"`
	DateAttempts        int               `json:"date_attempts"`
	ConfirmedName       *string           `json:"confirmed_name,omitempty"`
	FlowFieldAnswers    map[string]string `json:"flow_field_answers,omitempty"`
	PendingFlowFieldKey *string           `json:"pending_flow_field_key,omitempty"`
}

type DateValidationResult struct {
	StartsAt   time.Time
	ResourceID *uuid.UUID
	Slots      []slot_finder.TimeSlot // empty if is available
	SlotTaken  bool
}

type SessionStep string

const (
	StepSelectService  SessionStep = "SELECT_SERVICE"
	StepSelectResource SessionStep = "SELECT_RESOURCE"
	StepSelectDate     SessionStep = "SELECT_DATE"
	StepSelectTime     SessionStep = "SELECT_TIME"
	StepAwaitingName   SessionStep = "AWAITING_NAME"
	StepCaptureField   SessionStep = "CAPTURE_FLOW_FIELD"
	StepConfirm        SessionStep = "CONFIRM"
)
