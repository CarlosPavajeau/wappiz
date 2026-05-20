package main

import (
	"context"
	"os"
	"wappiz/pkg/logger"
	"wappiz/svc/api"
)

func main() {
	cfg := api.LoadConfiguration()
	err := api.Run(context.Background(), cfg)

	if err != nil {
		logger.Error("failed to run API", "err", err)
		os.Exit(1)
	}
}
