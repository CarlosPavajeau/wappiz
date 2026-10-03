package public_availability_list

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func contextWithQuery(rawQuery string) *gin.Context {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/?"+rawQuery, nil)
	return c
}

func TestParseQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)

	loc, err := time.LoadLocation("America/Bogota")
	require.NoError(t, err)
	// 23:30 in Bogotá is already the next day in UTC: "today" must follow
	// the tenant's calendar, not the server's.
	now := time.Date(2026, time.October, 3, 23, 30, 0, 0, loc)
	serviceID := uuid.New()

	t.Run("parses date as midnight in tenant timezone", func(t *testing.T) {
		q, err := parseQuery(contextWithQuery("serviceId="+serviceID.String()+"&date=2026-10-03"), loc, now)
		require.NoError(t, err)
		require.Equal(t, serviceID, q.serviceID)
		require.Equal(t, uuid.Nil, q.resourceID)
		require.True(t, q.date.Equal(time.Date(2026, time.October, 3, 0, 0, 0, 0, loc)))
	})

	t.Run("accepts an explicit resource", func(t *testing.T) {
		resourceID := uuid.New()
		q, err := parseQuery(contextWithQuery("serviceId="+serviceID.String()+"&resourceId="+resourceID.String()+"&date=2026-10-04"), loc, now)
		require.NoError(t, err)
		require.Equal(t, resourceID, q.resourceID)
	})

	t.Run("rejects invalid input", func(t *testing.T) {
		for name, raw := range map[string]string{
			"missing service":   "date=2026-10-04",
			"bad resource":      "serviceId=" + serviceID.String() + "&resourceId=nope&date=2026-10-04",
			"nil resource":      "serviceId=" + serviceID.String() + "&resourceId=" + uuid.Nil.String() + "&date=2026-10-04",
			"bad date":          "serviceId=" + serviceID.String() + "&date=04/10/2026",
			"past date":         "serviceId=" + serviceID.String() + "&date=2026-10-02",
			"beyond the window": "serviceId=" + serviceID.String() + "&date=2026-12-03",
		} {
			_, err := parseQuery(contextWithQuery(raw), loc, now)
			require.Error(t, err, name)
		}
	})
}
