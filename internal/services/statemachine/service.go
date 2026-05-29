package statemachine

import (
	"wappiz/internal/services/slotfinder"
	"wappiz/pkg/db"
	"wappiz/pkg/whatsapp"
)

type Config struct {
	DB          db.Database
	Whatsapp    whatsapp.Client
	SlotFinder  slotfinder.SlotFinderService
	Environment string
}

type service struct {
	db          db.Database
	whatsapp    whatsapp.Client
	slotFinder  slotfinder.SlotFinderService
	environment string
}

func New(cfg Config) *service {
	return &service{
		db:          cfg.DB,
		whatsapp:    cfg.Whatsapp,
		slotFinder:  cfg.SlotFinder,
		environment: cfg.Environment,
	}
}
