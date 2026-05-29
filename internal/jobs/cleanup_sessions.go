package jobs

import (
	"context"
	"time"
	"wappiz/pkg/db"
	"wappiz/pkg/logger"
)

type cleanupSessionsJob struct {
	db db.Database
}

func NewCleanupSessions(db db.Database) Job {
	return &cleanupSessionsJob{
		db: db,
	}
}

func (j *cleanupSessionsJob) Run(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	logger.Info("[cleanup_sessions_job] started")

	for {
		select {
		case <-ctx.Done():
			logger.Info("[cleanup_sessions_job] stopped")
			return
		case <-ticker.C:
			if err := db.Query.DeleteExpiredConversationSessions(ctx, j.db.Primary()); err != nil {
				logger.Warn("[cleanup_sessions_job] failed to delete expired sessions",
					"err", err)
			}
		}
	}
}
