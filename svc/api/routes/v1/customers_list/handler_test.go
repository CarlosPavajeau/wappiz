package customers_list

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func contextWithQuery(rawQuery string) *gin.Context {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/?"+rawQuery, nil)
	return c
}

func TestParseQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("defaults to the first page with no filters", func(t *testing.T) {
		q, err := parseQuery(contextWithQuery(""))
		require.NoError(t, err)
		require.Equal(t, int32(1), q.page)
		require.Equal(t, int32(defaultLimit), q.limit)
		require.False(t, q.name.Valid)
		require.False(t, q.phoneDigits.Valid)
		require.False(t, q.isBlocked.Valid)
	})

	t.Run("treats blank filters as absent", func(t *testing.T) {
		q, err := parseQuery(contextWithQuery("name=%20%20&phone=&status="))
		require.NoError(t, err)
		require.False(t, q.name.Valid)
		require.False(t, q.phoneDigits.Valid)
		require.False(t, q.isBlocked.Valid)
	})

	t.Run("parses every filter", func(t *testing.T) {
		q, err := parseQuery(contextWithQuery("name=%20Jos%C3%A9%20&phone=%2B57%20300-123&status=blocked&page=3&limit=50"))
		require.NoError(t, err)
		require.Equal(t, "José", q.name.String)
		require.Equal(t, "57300123", q.phoneDigits.String)
		require.True(t, q.isBlocked.Valid)
		require.True(t, q.isBlocked.Bool)
		require.Equal(t, int32(3), q.page)
		require.Equal(t, int32(50), q.limit)
	})

	t.Run("maps active to not blocked", func(t *testing.T) {
		q, err := parseQuery(contextWithQuery("status=active"))
		require.NoError(t, err)
		require.True(t, q.isBlocked.Valid)
		require.False(t, q.isBlocked.Bool)
	})

	t.Run("rejects invalid input", func(t *testing.T) {
		for name, raw := range map[string]string{
			"zero page":         "page=0",
			"non-numeric page":  "page=abc",
			"page overflow":     "page=99999999999",
			"offset overflow":   "page=2147483647&limit=100",
			"zero limit":        "limit=0",
			"limit above max":   "limit=101",
			"unknown status":    "status=deleted",
			"phone sans digits": "phone=abc",
			"phone too long":    "phone=123456789012345678901",
		} {
			_, err := parseQuery(contextWithQuery(raw))
			require.Error(t, err, name)
		}
	})
}
