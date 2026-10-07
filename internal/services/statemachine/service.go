package statemachine

import (
	"wappiz/internal/events"
	"wappiz/internal/services/plans"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"
)

type Config struct {
	DB         db.Database
	Whatsapp   whatsapp.Client
	SlotFinder slotfinder.SlotFinderService
	Publisher  *events.Publisher
	Plans      plans.Service
}

type service struct {
	db         db.Database
	whatsapp   whatsapp.Client
	slotFinder slotfinder.SlotFinderService
	publisher  *events.Publisher
	plans      plans.Service
}

func New(cfg Config) *service {
	return &service{
		db:         cfg.DB,
		whatsapp:   cfg.Whatsapp,
		slotFinder: cfg.SlotFinder,
		publisher:  cfg.Publisher,
		plans:      cfg.Plans,
	}
}
