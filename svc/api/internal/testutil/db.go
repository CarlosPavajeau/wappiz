package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
	"wappiz/pkg/db"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	postgresImage = "postgres:16-alpine"
	adminDatabase = "wappiz_template"
	adminUser     = "postgres"
	adminPassword = "postgres"
)

type Harness struct {
	DB db.Database
}

type postgresServer struct {
	container *postgres.PostgresContainer
	dsn       string
}

var (
	serverOnce sync.Once
	server     postgresServer
	serverErr  error
)

func NewHarness(t *testing.T) Harness {
	t.Helper()

	ctx := context.Background()
	server := requirePostgresServer(t, ctx)
	databaseName := "wappiz_test_" + strings.ReplaceAll(uuid.NewString(), "-", "_")

	adminDB := openSQL(t, server.dsn)
	t.Cleanup(func() {
		require.NoError(t, adminDB.Close())
	})

	_, err := adminDB.ExecContext(ctx, fmt.Sprintf(`CREATE DATABASE %s WITH TEMPLATE %s`, quoteIdent(databaseName), quoteIdent(adminDatabase)))
	require.NoError(t, err)

	t.Cleanup(func() {
		_, err := adminDB.ExecContext(ctx, `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, databaseName)
		require.NoError(t, err)

		_, err = adminDB.ExecContext(ctx, fmt.Sprintf(`DROP DATABASE IF EXISTS %s WITH (FORCE)`, quoteIdent(databaseName)))
		require.NoError(t, err)
	})

	databaseDSN := databaseDSN(t, server.dsn, databaseName)
	database, err := db.New(db.Config{PrimaryDSN: databaseDSN})
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, database.Close())
	})

	return Harness{DB: database}
}

func InsertUser(t *testing.T, database db.Database, userID, name, email string) {
	t.Helper()

	_, err := database.Primary().ExecContext(
		context.Background(),
		`INSERT INTO users (id, name, email, email_verified) VALUES ($1, $2, $3, TRUE)`,
		userID,
		name,
		email,
	)
	require.NoError(t, err)
}

func requirePostgresServer(t *testing.T, ctx context.Context) postgresServer {
	t.Helper()

	serverOnce.Do(func() {
		schemaPath, err := findSchemaPath()
		if err != nil {
			serverErr = err
			return
		}

		container, err := postgres.Run(
			ctx,
			postgresImage,
			postgres.WithDatabase(adminDatabase),
			postgres.WithUsername(adminUser),
			postgres.WithPassword(adminPassword),
			postgres.WithInitScripts(schemaPath),
			testcontainers.WithWaitStrategy(
				wait.ForLog("database system is ready to accept connections").
					WithOccurrence(2).
					WithStartupTimeout(2*time.Minute),
			),
		)
		if err != nil {
			serverErr = err
			return
		}

		containerDSN, err := container.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			serverErr = err
			return
		}

		dsn, err := databaseDSNFrom(containerDSN, "postgres")
		if err != nil {
			serverErr = err
			return
		}

		server = postgresServer{
			container: container,
			dsn:       dsn,
		}
	})

	require.NoError(t, serverErr)
	return server
}

func openSQL(t *testing.T, dsn string) *sql.DB {
	t.Helper()

	database, err := sql.Open("pgx", dsn)
	require.NoError(t, err)

	require.NoError(t, database.Ping())
	return database
}

func databaseDSN(t *testing.T, dsn, databaseName string) string {
	t.Helper()

	parsed, err := databaseDSNFrom(dsn, databaseName)
	require.NoError(t, err)

	return parsed
}

func databaseDSNFrom(dsn, databaseName string) (string, error) {
	parsed, err := url.Parse(dsn)
	if err != nil {
		return "", err
	}

	parsed.Path = "/" + databaseName
	return parsed.String(), nil
}

func quoteIdent(ident string) string {
	return `"` + strings.ReplaceAll(ident, `"`, `""`) + `"`
}

func findSchemaPath() (string, error) {
	candidates := []string{
		filepath.Join("pkg", "db", "schema.sql"),
		filepath.Join("..", "..", "..", "pkg", "db", "schema.sql"),
	}

	for _, candidate := range candidates {
		absolute, err := filepath.Abs(candidate)
		if err != nil {
			return "", err
		}
		if _, err := os.Stat(absolute); err == nil {
			return absolute, nil
		}
	}

	workingDirectory, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		candidate := filepath.Join(workingDirectory, "pkg", "db", "schema.sql")
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}

		parent := filepath.Dir(workingDirectory)
		if parent == workingDirectory {
			return "", fmt.Errorf("pkg/db/schema.sql not found")
		}
		workingDirectory = parent
	}
}
