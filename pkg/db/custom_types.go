package db

import (
	"encoding/json"
	"fmt"
)

type TenantSettings struct {
	WelcomeMessage           string `json:"welcomeMessage,omitempty"`
	BotName                  string `json:"botName,omitempty"`
	CancellationMsg          string `json:"cancellationMessage,omitempty"`
	ContactEmail             string `json:"contactEmail,omitempty"`
	OwnerPhone               string `json:"ownerPhone,omitempty"`
	LateCancelHours          int    `json:"lateCancelHours"`          // default: 2
	AutoBlockAfterNoShows    int    `json:"autoBlockAfterNoShows"`    // default: 3
	AutoBlockAfterLateCancel int    `json:"autoBlockAfterLateCancel"` // default: 3
	SendWarningBeforeBlock   bool   `json:"sendWarningBeforeBlock"`
	// PublicBookingEnabled exposes the tenant's public booking page at
	// /<slug>. Off by default so a tenant opts in once it is ready.
	PublicBookingEnabled bool `json:"publicBookingEnabled"`
}

type PlanFeatures struct {
	MaxServices             *int `json:"maxServices,omitempty"`
	MaxResources            *int `json:"maxResources,omitempty"`
	MaxAppointmentsPerMonth *int `json:"maxAppointmentsPerMonth,omitempty"`
	FeatureAnalytics        bool `json:"featureAnalytics"`
	FeatureBasicReminders   bool `json:"featureBasicReminders"`
	FeatureCustomReminders  bool `json:"featureCustomReminders"`
	FeatureMultiLocation    bool `json:"featureMultiLocation"`
	FeaturePrioritySupport  bool `json:"featurePrioritySupport"`
	FeaturePublicBooking    bool `json:"featurePublicBooking"`
	FeatureRecurring        bool `json:"featureRecurring"`
	FeatureWaitingList      bool `json:"featureWaitingList"`
}

// UnmarshalNullableJSONTo unmarshals JSON data from database columns into Go types.
// It handles the common pattern where database queries return JSON as []byte that needs
// to be deserialized into structs, slices, or maps.
//
// The function accepts 'any' type because database drivers return interface{} for JSON columns,
// even though the underlying value is typically []byte.
//
// Returns:
//   - (T, nil) on successful unmarshal
//   - (zero, nil) if data is nil or empty []byte (these are valid null/empty states)
//   - (zero, error) if type assertion fails or JSON unmarshal fails
//
// Example usage:
//
//	settings, err := UnmarshalNullableJSONTo[TenantSettings](row.Settings)
//	if err != nil {
//	    logger.Error("failed to unmarshal settings", "error", err)
//	    return err
//	}
func UnmarshalNullableJSONTo[T any](data any) (T, error) {
	var zero T
	if data == nil {
		return zero, nil
	}

	var bytes []byte
	switch v := data.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return zero, fmt.Errorf("type assertion failed during unmarshal: expected []byte or string, got %T", data)
	}

	if len(bytes) == 0 {
		return zero, nil
	}

	var result T
	if err := json.Unmarshal(bytes, &result); err != nil {
		return zero, fmt.Errorf("json unmarshal failed: %w", err)
	}

	return result, nil
}
