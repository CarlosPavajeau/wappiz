package codes

// URN is a string type for error code constants
type URN string

const (
	ErrorsNotFound        URN = "err:user:not_found"
	ErrorsUnauthorized    URN = "err:user:unauthorized"
	ErrorsForbidden       URN = "err:user:forbidden"
	ErrorsConflict        URN = "err:user:conflict"
	ErrorsTooManyRequests URN = "err:user:too_many_requests"
	ErrorsBadRequest      URN = "err:user:bad_request"

	// ErrorsForbiddenResourceQuotaExceeded indicates the tenant has exceeded their resource quota for the requested operation.
	ErrorsForbiddenResourceQuotaExceeded URN = "err:user:forbidden:resource_quota_exceeded"

	// Internal

	// UnexpectedError represents an unhandled or unexpected error condition.
	AppErrorsInternalUnexpectedError URN = "err:application:unexpected_error"
	// ServiceUnavailable indicates a service is temporarily unavailable.
	AppErrorsInternalServiceUnavailable URN = "err:application:service_unavailable"
	// PlanLimitReached indicates the tenant has reached their plan limit for the requested operation.
	AppErrorsPlanLimitReached URN = "err:application:plan_limit_reached"

	AppErrorsNotFound           URN = "err:application:not_found"
	AppErrorsSessionNotFound    URN = "err:application:session_not_found"
	AppErrorsInvalidFormat      URN = "err:application:invalid_format"
	AppErrorsDateInPast         URN = "err:application:date_in_past"
	AppErrorsDayOff             URN = "err:application:day_off"
	AppErrorsOutsideHours       URN = "err:application:outside_working_hours"
	AppErrorsSlotTaken          URN = "err:application:slot_taken"
	AppErrorsNoSlotsAvailable   URN = "err:application:no_slots_available"
	AppErrorsClientBlocked      URN = "err:application:client_blocked"
	AppErrorsAppointmentOverlap URN = "err:application:appointment_overlap"
	AppErrorsEmailAlreadyInUse  URN = "err:application:email_already_in_use"
)
