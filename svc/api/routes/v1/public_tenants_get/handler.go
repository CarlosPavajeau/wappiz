package public_tenants_get

import (
	"net/http"
	"sort"
	"strconv"
	"wappiz/pkg/db"
	"wappiz/pkg/fault"
	"wappiz/svc/api/internal/publicbooking"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ServiceResponse struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	DurationMinutes int32     `json:"durationMinutes"`
	Price           float64   `json:"price"`
}

type ResourceResponse struct {
	ID         uuid.UUID   `json:"id"`
	Name       string      `json:"name"`
	AvatarURL  string      `json:"avatarUrl"`
	ServiceIDs []uuid.UUID `json:"serviceIds"`
}

type Response struct {
	Name      string             `json:"name"`
	Slug      string             `json:"slug"`
	Timezone  string             `json:"timezone"`
	Currency  string             `json:"currency"`
	Services  []ServiceResponse  `json:"services"`
	Resources []ResourceResponse `json:"resources"`
	// BookingWindowDays is how many days ahead availability can be queried.
	BookingWindowDays int `json:"bookingWindowDays"`
}

type Handler struct {
	DB db.Database
}

func (h *Handler) Method() string { return http.MethodGet }
func (h *Handler) Path() string   { return "/v1/public/tenants/:slug" }

// Handle returns what a customer needs to start booking: the services that
// at least one active resource offers, and the active resources with the
// services each one offers. Unbookable services and resources are omitted.
func (h *Handler) Handle(c *gin.Context) error {
	ctx := c.Request.Context()

	tenant, err := publicbooking.FindTenant(ctx, h.DB, c.Param("slug"))
	if err != nil {
		return err
	}

	services, err := db.Query.FindServicesWithAssignedResourceByTenantID(ctx, h.DB.Primary(), tenant.ID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find bookable services"))
	}
	sort.SliceStable(services, func(i, j int) bool {
		return services[i].SortOrder < services[j].SortOrder
	})

	links, err := db.Query.FindBookableResourceServicesByTenant(ctx, h.DB.Primary(), tenant.ID)
	if err != nil {
		return fault.Wrap(err, fault.Internal("find bookable resource services"))
	}

	serviceResponses := make([]ServiceResponse, len(services))
	for i, s := range services {
		price, err := strconv.ParseFloat(s.Price, 64)
		if err != nil {
			return fault.Wrap(err, fault.Internal("parse service price"))
		}
		serviceResponses[i] = ServiceResponse{
			ID:              s.ID,
			Name:            s.Name,
			Description:     s.Description.String,
			DurationMinutes: s.DurationMinutes,
			Price:           price,
		}
	}

	c.JSON(http.StatusOK, Response{
		Name:      tenant.Name,
		Slug:      tenant.Slug,
		Timezone:  tenant.Timezone,
		Currency:  tenant.Currency,
		Services:  serviceResponses,
		Resources: groupResources(links),

		BookingWindowDays: publicbooking.BookingWindowDays,
	})
	return nil
}

// groupResources folds the (resource, service) rows, already ordered by
// resource, into one entry per resource keeping the query order.
func groupResources(links []db.FindBookableResourceServicesByTenantRow) []ResourceResponse {
	resources := []ResourceResponse{}
	index := make(map[uuid.UUID]int)

	for _, l := range links {
		i, ok := index[l.ResourceID]
		if !ok {
			i = len(resources)
			index[l.ResourceID] = i
			resources = append(resources, ResourceResponse{
				ID:         l.ResourceID,
				Name:       l.ResourceName,
				AvatarURL:  l.ResourceAvatarUrl,
				ServiceIDs: []uuid.UUID{},
			})
		}
		resources[i].ServiceIDs = append(resources[i].ServiceIDs, l.ServiceID)
	}

	return resources
}
