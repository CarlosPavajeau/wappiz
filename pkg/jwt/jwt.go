package jwt

import (
	"context"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"wappiz/pkg/db"
	"wappiz/svc/api/openapi"

	"github.com/gin-gonic/gin"
	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims holds the JWT payload expected from the external auth service.
// Field names must match what the external issuer embeds.
type Claims struct {
	UserID string `json:"id"`
	Role   string `json:"role"`
	gojwt.RegisteredClaims
}

// TenantIDLookup resolves a tenant UUID from a user ID.
// It is called by AuthMiddleware after token verification to populate the
// tenant_id context value. Set it via InitTenantFinder at startup.
type TenantIDLookup func(ctx context.Context, userID string) (uuid.UUID, error)

// jwkEntry is the wire representation of a single JSON Web Key.
type jwkEntry struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	// RSA
	N string `json:"n"`
	E string `json:"e"`
	// EC / OKP
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"` // not present in OKP
}

type parsedJWK struct {
	key any
	alg string
}

func parseJWK(k jwkEntry) (parsedJWK, error) {
	if k.Use != "" && k.Use != "sig" {
		return parsedJWK{}, fmt.Errorf("unsupported key use %q", k.Use)
	}

	var key any
	var err error

	switch k.Kty {
	case "RSA":
		key, err = parseRSAKey(k)
	case "EC":
		key, err = parseECKey(k)
	case "OKP":
		key, err = parseOKPKey(k)
	default:
		return parsedJWK{}, fmt.Errorf("unsupported key type %q", k.Kty)
	}
	if err != nil {
		return parsedJWK{}, err
	}

	return parsedJWK{key: key, alg: k.Alg}, nil
}

func parseRSAKey(k jwkEntry) (*rsa.PublicKey, error) {
	if k.N == "" || k.E == "" {
		return nil, errors.New("RSA key is missing modulus or exponent")
	}

	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("decode n: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("decode e: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	eInt := new(big.Int).SetBytes(eBytes)

	if !eInt.IsInt64() || eInt.Int64() > (1<<31-1) {
		return nil, errors.New("RSA exponent out of range")
	}
	if eInt.Int64() < 3 || eInt.Int64()%2 == 0 {
		return nil, errors.New("RSA exponent must be an odd integer greater than one")
	}

	pub := &rsa.PublicKey{N: n, E: int(eInt.Int64())}
	if pub.N.BitLen() < 2048 {
		return nil, fmt.Errorf("RSA key too short: %d bits (minimum 2048)", pub.N.BitLen())
	}
	return pub, nil
}

func parseECKey(k jwkEntry) (*ecdsa.PublicKey, error) {
	if k.X == "" || k.Y == "" {
		return nil, errors.New("EC key is missing coordinates")
	}

	var curve elliptic.Curve
	switch k.Crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported EC curve %q", k.Crv)
	}

	xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil {
		return nil, fmt.Errorf("decode x: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
	if err != nil {
		return nil, fmt.Errorf("decode y: %w", err)
	}

	point, err := uncompressedPoint(curve, xBytes, yBytes)
	if err != nil {
		return nil, err
	}

	pub, err := ecdsa.ParseUncompressedPublicKey(curve, point)
	if err != nil {
		return nil, fmt.Errorf("parse EC public key: %w", err)
	}
	return pub, nil
}

func parseOKPKey(k jwkEntry) (ed25519.PublicKey, error) {
	if k.X == "" {
		return nil, errors.New("OKP key is missing x coordinate")
	}
	if k.Crv != "Ed25519" {
		return nil, fmt.Errorf("unsupported OKP curve %q (only Ed25519 is supported)", k.Crv)
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil {
		return nil, fmt.Errorf("decode x: %w", err)
	}
	if len(xBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("ed25519 public key must be %d bytes, got %d", ed25519.PublicKeySize, len(xBytes))
	}
	return xBytes, nil
}

func uncompressedPoint(curve elliptic.Curve, xBytes, yBytes []byte) ([]byte, error) {
	byteLen := (curve.Params().BitSize + 7) / 8
	if len(xBytes) > byteLen || len(yBytes) > byteLen {
		return nil, errors.New("EC coordinate length exceeds curve size")
	}

	point := make([]byte, 1+2*byteLen)
	point[0] = 4
	copy(point[1+byteLen-len(xBytes):1+byteLen], xBytes)
	copy(point[1+2*byteLen-len(yBytes):], yBytes)
	return point, nil
}

// extractTokenHeader decodes the JWT header segment to read kid and alg
// without performing any signature verification.
func extractTokenHeader(tokenStr string) (kid, alg string, err error) {
	dot := strings.IndexByte(tokenStr, '.')
	if dot < 0 {
		return "", "", errors.New("missing separator")
	}

	headerBytes, err := base64.RawURLEncoding.DecodeString(tokenStr[:dot])
	if err != nil {
		return "", "", fmt.Errorf("decode header: %w", err)
	}

	var h struct {
		Kid string `json:"kid"`
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &h); err != nil {
		return "", "", fmt.Errorf("parse header: %w", err)
	}
	if h.Alg == "" {
		return "", "", errors.New("missing alg")
	}
	return h.Kid, h.Alg, nil
}

// isAllowedAlg returns true for asymmetric algorithms only.
// HMAC algorithms and "none" are intentionally excluded to prevent
// algorithm confusion attacks.
func isAllowedAlg(alg string) bool {
	switch alg {
	case "RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA":
		return true
	default:
		return false
	}
}

var defaultVerifier *DBVerifier
var defaultTenantFinder TenantIDLookup

// InitTenantFinder registers the function used by AuthMiddleware to resolve
// a tenant UUID from the authenticated user ID. Call this at startup after
// the tenant use-case is initialised.
func InitTenantFinder(f TenantIDLookup) {
	defaultTenantFinder = f
}

// Init initialises the package-level DB-backed JWT verifier.
// It must be called once at application startup, before any requests are served.
func Init(dbtx db.DBTX, issuer string) {
	defaultVerifier = NewDBVerifier(dbtx, issuer)
}

// AuthMiddleware is a Gin middleware that validates Bearer JWTs using public keys
// stored in the database jwks table. Init must be called before routes are served.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if defaultVerifier == nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, openapi.InternalServerErrorResponse{
				Meta: openapi.Meta{
					RequestId: c.GetString("request_id"),
				},
				Error: openapi.BaseError{
					Title:  "DB verification failed.",
					Type:   "internal_server_error",
					Detail: "JWT verifier is not initialized. This is a server configuration error. Contact support.",
					Status: http.StatusInternalServerError,
				},
			})
			return
		}

		header := c.GetHeader("Authorization")
		if len(header) < 8 || header[:7] != "Bearer " {
			c.AbortWithStatusJSON(http.StatusUnauthorized, openapi.UnauthorizedErrorResponse{
				Meta: openapi.Meta{
					RequestId: c.GetString("request_id"),
				},
				Error: openapi.BaseError{
					Title:  "Missing or invalid Authorization header.",
					Type:   "unauthorized",
					Detail: "JWT header is missing or is malformed.",
					Status: http.StatusUnauthorized,
				},
			})
			return
		}

		claims, err := defaultVerifier.VerifyToken(c.Request.Context(), header[7:])
		if err != nil {
			if errors.Is(err, gojwt.ErrTokenExpired) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, openapi.UnauthorizedErrorResponse{
					Meta: openapi.Meta{
						RequestId: c.GetString("request_id"),
					},
					Error: openapi.BaseError{
						Title:  "Token expired",
						Type:   "unauthorized",
						Detail: "Authentication token is expired. Please obtain a new token and try again.",
						Status: http.StatusUnauthorized,
					},
				})
				return
			}

			c.AbortWithStatusJSON(http.StatusUnauthorized, openapi.UnauthorizedErrorResponse{
				Meta: openapi.Meta{
					RequestId: c.GetString("request_id"),
				},
				Error: openapi.BaseError{
					Title:  "Token invalid",
					Type:   "unauthorized",
					Detail: err.Error(),
					Status: http.StatusUnauthorized,
				},
			})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)

		if defaultTenantFinder != nil {
			tenantID, err := defaultTenantFinder(c.Request.Context(), claims.UserID)
			if err == nil {
				c.Set("tenant_id", tenantID)
			}
		}

		c.Next()
	}
}

func TenantIDFromContext(c *gin.Context) uuid.UUID {
	return c.MustGet("tenant_id").(uuid.UUID)
}

// TenantIDFromContextOK returns the tenant UUID and whether it was present.
// Use this when the tenant may not exist yet (e.g. first-time registration).
func TenantIDFromContextOK(c *gin.Context) (uuid.UUID, bool) {
	v, exists := c.Get("tenant_id")
	if !exists {
		return uuid.UUID{}, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}

func UserIDFromContext(c *gin.Context) string {
	return c.MustGet("user_id").(string)
}
