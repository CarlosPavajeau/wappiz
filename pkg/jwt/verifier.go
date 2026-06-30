package jwt

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/logger"

	gojwt "github.com/golang-jwt/jwt/v5"
)

const defaultLeeway = 10 * time.Second

// Verifier validates a JWT string and returns claims of the requested type.
type Verifier[T any] interface {
	Verify(token string, at ...time.Time) (T, error)
}

type claimsFactory[T gojwt.Claims] func() T

type verifierConfig struct {
	issuer         string
	leeway         time.Duration
	strictDecoding bool
}

// VerifierOption customizes token claim validation.
type VerifierOption func(*verifierConfig)

// WithVerifierIssuer requires tokens to contain the expected issuer.
func WithVerifierIssuer(issuer string) VerifierOption {
	return func(c *verifierConfig) {
		c.issuer = issuer
	}
}

// WithVerifierLeeway allows a bounded clock skew for time-based claims.
func WithVerifierLeeway(leeway time.Duration) VerifierOption {
	return func(c *verifierConfig) {
		c.leeway = leeway
	}
}

// HS256Verifier validates HS256-signed JWTs with a shared secret.
type HS256Verifier[T gojwt.Claims] struct {
	secret    []byte
	newClaims claimsFactory[T]
	config    verifierConfig
}

// NewHS256Verifier creates a verifier for HS256 tokens.
// The secret must be at least 32 bytes, matching the HS256 key size.
func NewHS256Verifier[T gojwt.Claims](secret []byte, newClaims claimsFactory[T], opts ...VerifierOption) (*HS256Verifier[T], error) {
	if len(secret) < 32 {
		return nil, fmt.Errorf("HS256 secret must be at least 32 bytes, got %d", len(secret))
	}
	if newClaims == nil {
		return nil, errors.New("claims factory is required")
	}

	config := verifierConfig{leeway: defaultLeeway, strictDecoding: true}
	for _, opt := range opts {
		opt(&config)
	}

	secretCopy := make([]byte, len(secret))
	copy(secretCopy, secret)

	return &HS256Verifier[T]{
		secret:    secretCopy,
		newClaims: newClaims,
		config:    config,
	}, nil
}

// Verify validates the token and returns its claims.
func (v *HS256Verifier[T]) Verify(tokenStr string, at ...time.Time) (T, error) {
	return parseVerifiedToken(tokenStr, v.newClaims, v.config, at, gojwt.SigningMethodHS256.Alg(), func(t *gojwt.Token) (any, error) {
		if t.Method != gojwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return v.secret, nil
	})
}

// DBVerifier validates JWTs using public keys fetched from the database jwks table.
// It is safe for concurrent use.
type DBVerifier struct {
	dbtx   db.DBTX
	issuer string // optional; empty = skip iss validation
}

// NewDBVerifier creates a DBVerifier backed by the given database connection.
// When issuer is non-empty, the "iss" JWT claim must match it.
func NewDBVerifier(dbtx db.DBTX, issuer string) *DBVerifier {
	return &DBVerifier{dbtx: dbtx, issuer: issuer}
}

// lookupKey fetches the public key for the given kid from the database.
func (v *DBVerifier) lookupKey(ctx context.Context, kid string) (parsedJWK, error) {
	row, err := db.Query.FindJWKByID(ctx, v.dbtx, kid)
	if errors.Is(err, sql.ErrNoRows) {
		return parsedJWK{}, fmt.Errorf("signing key %q not found", kid)
	}
	if err != nil {
		return parsedJWK{}, fmt.Errorf("jwk lookup: %w", err)
	}

	var entry jwkEntry
	if err := json.Unmarshal([]byte(row.PublicKey), &entry); err != nil {
		return parsedJWK{}, fmt.Errorf("parse public key for kid %q: %w", kid, err)
	}
	return parseJWK(entry)
}

// VerifyToken validates the JWT string and returns its claims.
func (v *DBVerifier) VerifyToken(ctx context.Context, tokenStr string) (*Claims, error) {
	kid, alg, err := extractTokenHeader(tokenStr)
	if err != nil {
		return nil, errors.New("malformed token")
	}
	if kid == "" {
		return nil, errors.New("token is missing kid")
	}

	// Enforce algorithm allowlist before touching any key material.
	// This prevents algorithm confusion attacks (e.g. RS256 -> HS256, alg:none).
	if !isAllowedAlg(alg) {
		return nil, fmt.Errorf("algorithm %q is not permitted", alg)
	}

	parsedKey, err := v.lookupKey(ctx, kid)
	if err != nil {
		logger.Warn("[jwt] key lookup failed", "kid", kid, "err", err)
		return nil, err
	}
	if parsedKey.alg != "" && parsedKey.alg != alg {
		return nil, fmt.Errorf("token algorithm %q does not match key algorithm %q", alg, parsedKey.alg)
	}

	config := verifierConfig{issuer: v.issuer, leeway: defaultLeeway}
	claims, err := parseVerifiedToken(tokenStr, func() *Claims { return &Claims{} }, config, nil, alg, func(t *gojwt.Token) (any, error) {
		if t.Method.Alg() != alg {
			return nil, errors.New("unexpected signing method")
		}
		return parsedKey.key, nil
	})
	if err != nil {
		logger.Warn("[jwt] ParseWithClaims failed", "kid", kid, "alg", alg, "err", err)
		return nil, err
	}

	return claims, nil
}

func parseVerifiedToken[T gojwt.Claims](
	tokenStr string,
	newClaims claimsFactory[T],
	config verifierConfig,
	at []time.Time,
	validMethod string,
	keyFunc gojwt.Keyfunc,
) (T, error) {
	claims := newClaims()
	var zero T

	parser, err := newParser(config, at, validMethod)
	if err != nil {
		return zero, err
	}

	token, err := parser.ParseWithClaims(tokenStr, claims, keyFunc)
	if err != nil {
		return zero, err
	}
	if !token.Valid {
		return zero, errors.New("invalid token")
	}

	return claims, nil
}

func newParser(config verifierConfig, at []time.Time, validMethod string) (*gojwt.Parser, error) {
	if len(at) > 1 {
		return nil, errors.New("verify accepts at most one validation time")
	}

	opts := []gojwt.ParserOption{
		gojwt.WithLeeway(config.leeway),
		gojwt.WithValidMethods([]string{validMethod}),
	}
	if config.strictDecoding {
		opts = append(opts, gojwt.WithStrictDecoding())
	}
	if config.issuer != "" {
		opts = append(opts, gojwt.WithIssuer(config.issuer))
	}
	if len(at) == 1 {
		validationTime := at[0]
		opts = append(opts, gojwt.WithTimeFunc(func() time.Time { return validationTime }))
	}

	return gojwt.NewParser(opts...), nil
}
