package statemachine

import (
	"wappiz/internal/events"
	"wappiz/internal/services/plans"
	"wappiz/internal/services/ratelimit"
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/counter"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"
)

type Config struct {
	DB         db.Database
	Whatsapp   whatsapp.Client
	SlotFinder slotfinder.SlotFinderService
	Publisher  *events.Publisher
	Plans      plans.Service
	Ratelimit  ratelimit.Service
	// Cooldowns records short-lived per-sender markers, shared by every
	// instance.
	Cooldowns counter.Counter
}

type service struct {
	db         db.Database
	whatsapp   whatsapp.Client
	slotFinder slotfinder.SlotFinderService
	publisher  *events.Publisher
	plans      plans.Service
	ratelimit  ratelimit.Service
	cooldowns  counter.Counter
}

func New(cfg Config) *service {
	return &service{
		db:         cfg.DB,
		whatsapp:   cfg.Whatsapp,
		slotFinder: cfg.SlotFinder,
		publisher:  cfg.Publisher,
		plans:      cfg.Plans,
		ratelimit:  cfg.Ratelimit,
		cooldowns:  cfg.Cooldowns,
	}
}
