package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"wappiz/pkg/db"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
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
		schemaDir, err := findSchemaDir()
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
			postgres.BasicWaitStrategies(),
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

		if err := applySchema(ctx, containerDSN, schemaDir); err != nil {
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

func applySchema(ctx context.Context, dsn, schemaDir string) error {
	database, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	defer database.Close()

	if err := database.PingContext(ctx); err != nil {
		return err
	}

	if _, err := database.ExecContext(ctx, `CREATE EXTENSION IF NOT EXISTS btree_gist`); err != nil {
		return fmt.Errorf("create btree_gist extension: %w", err)
	}

	schema, err := loadSchema(schemaDir)
	if err != nil {
		return err
	}

	for _, statement := range schema {
		if _, err := database.ExecContext(ctx, statement.SQL); err != nil {
			return fmt.Errorf("apply schema %s: %w", statement.Path, err)
		}
	}

	return nil
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

type schemaStatement struct {
	Path string
	SQL  string
}

func loadSchema(schemaDir string) ([]schemaStatement, error) {
	entries, err := os.ReadDir(schemaDir)
	if err != nil {
		return nil, err
	}

	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		paths = append(paths, filepath.Join(schemaDir, entry.Name()))
	}
	if len(paths) == 0 {
		return nil, fmt.Errorf("schema directory %s has no .sql files", schemaDir)
	}
	sort.Strings(paths)

	types := make([]schemaStatement, 0)
	tables := make([]schemaStatement, 0, len(paths))
	deferred := make([]schemaStatement, 0, len(paths))

	for _, path := range paths {
		content, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}

		for _, statement := range splitSQLStatements(string(content)) {
			switch {
			case strings.HasPrefix(statement, "CREATE TYPE "):
				types = append(types, schemaStatement{Path: path, SQL: statement})
			case strings.HasPrefix(statement, "CREATE TABLE "):
				tables = append(tables, schemaStatement{Path: path, SQL: statement})
			default:
				deferred = append(deferred, schemaStatement{Path: path, SQL: statement})
			}
		}
	}

	schema := make([]schemaStatement, 0, len(types)+len(tables)+len(deferred))
	schema = append(schema, types...)
	schema = append(schema, tables...)
	schema = append(schema, deferred...)
	return schema, nil
}

func splitSQLStatements(content string) []string {
	statements := make([]string, 0)
	start := 0
	inSingleQuote := false

	for index, char := range content {
		if char == '\'' {
			inSingleQuote = !inSingleQuote
			continue
		}

		if char != ';' || inSingleQuote {
			continue
		}

		statement := strings.TrimSpace(content[start : index+1])
		if statement != "" {
			statements = append(statements, statement)
		}
		start = index + 1
	}

	trailing := strings.TrimSpace(content[start:])
	if trailing != "" {
		statements = append(statements, trailing)
	}

	return statements
}

func findSchemaDir() (string, error) {
	candidates := []string{
		filepath.Join("pkg", "db", "schema"),
		filepath.Join("..", "..", "..", "pkg", "db", "schema"),
	}

	for _, candidate := range candidates {
		absolute, err := filepath.Abs(candidate)
		if err != nil {
			return "", err
		}
		if info, err := os.Stat(absolute); err == nil && info.IsDir() {
			return absolute, nil
		}
	}

	workingDirectory, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		candidate := filepath.Join(workingDirectory, "pkg", "db", "schema")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}

		parent := filepath.Dir(workingDirectory)
		if parent == workingDirectory {
			return "", fmt.Errorf("pkg/db/schema not found")
		}
		workingDirectory = parent
	}
}
