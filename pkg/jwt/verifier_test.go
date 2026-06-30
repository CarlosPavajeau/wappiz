package jwt

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"testing"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

type testClaims struct {
	Scope string `json:"scope"`
	gojwt.RegisteredClaims
}

func TestHS256Verifier(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	now := time.Date(2026, 6, 30, 12, 0, 0, 0, time.UTC)
	claims := testClaims{
		Scope: "appointments:read",
		RegisteredClaims: gojwt.RegisteredClaims{
			Issuer:    "wappiz",
			ExpiresAt: gojwt.NewNumericDate(now.Add(time.Hour)),
		},
	}
	token, err := gojwt.NewWithClaims(gojwt.SigningMethodHS256, claims).SignedString(secret)
	require.NoError(t, err)

	verifier, err := NewHS256Verifier(secret, func() *testClaims { return &testClaims{} }, WithVerifierIssuer("wappiz"))
	require.NoError(t, err)

	got, err := verifier.Verify(token, now)
	require.NoError(t, err)
	require.Equal(t, "appointments:read", got.Scope)
	require.Equal(t, "wappiz", got.Issuer)
}

func TestHS256VerifierRejectsWrongAlgorithm(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	claims := testClaims{
		RegisteredClaims: gojwt.RegisteredClaims{
			ExpiresAt: gojwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token, err := gojwt.NewWithClaims(gojwt.SigningMethodHS384, claims).SignedString(secret)
	require.NoError(t, err)

	verifier, err := NewHS256Verifier(secret, func() *testClaims { return &testClaims{} })
	require.NoError(t, err)

	_, err = verifier.Verify(token)
	require.Error(t, err)
}

func TestHS256VerifierRejectsShortSecret(t *testing.T) {
	_, err := NewHS256Verifier([]byte("short"), func() *testClaims { return &testClaims{} })
	require.Error(t, err)
}

func TestParserAllowsExtraClaimsWhenStrictDecodingDisabled(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	now := time.Date(2026, 6, 30, 12, 0, 0, 0, time.UTC)
	token, err := gojwt.NewWithClaims(gojwt.SigningMethodHS256, gojwt.MapClaims{
		"exp":   now.Add(time.Hour).Unix(),
		"id":    "user_123",
		"role":  "admin",
		"email": "user@example.com",
	}).SignedString(secret)
	require.NoError(t, err)

	claims, err := parseVerifiedToken(token, func() *Claims { return &Claims{} }, verifierConfig{leeway: defaultLeeway}, []time.Time{now}, gojwt.SigningMethodHS256.Alg(), func(t *gojwt.Token) (any, error) {
		if t.Method != gojwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	require.NoError(t, err)
	require.Equal(t, "user_123", claims.UserID)
	require.Equal(t, "admin", claims.Role)
}

func TestParseECKey(t *testing.T) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	publicKeyBytes, err := privateKey.PublicKey.Bytes()
	require.NoError(t, err)
	coordinateSize := (len(publicKeyBytes) - 1) / 2

	entry := jwkEntry{
		Kty: "EC",
		Use: "sig",
		Crv: "P-256",
		X:   base64.RawURLEncoding.EncodeToString(publicKeyBytes[1 : 1+coordinateSize]),
		Y:   base64.RawURLEncoding.EncodeToString(publicKeyBytes[1+coordinateSize:]),
	}

	parsed, err := parseECKey(entry)
	require.NoError(t, err)

	parsedBytes, err := parsed.Bytes()
	require.NoError(t, err)
	require.Equal(t, publicKeyBytes, parsedBytes)
}

func TestParseECKeyRejectsPointOffCurve(t *testing.T) {
	entry := jwkEntry{
		Kty: "EC",
		Use: "sig",
		Crv: "P-256",
		X:   base64.RawURLEncoding.EncodeToString([]byte{1}),
		Y:   base64.RawURLEncoding.EncodeToString([]byte{1}),
	}

	_, err := parseJWK(entry)
	require.Error(t, err)
}
