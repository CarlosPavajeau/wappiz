package jobs

import (
	"strings"
	"testing"
)

func TestBuildCustomerBlockMessageIncludesTenantName(t *testing.T) {
	msg := buildCustomerBlockMessage("Acme Spa")
	if msg == "" {
		t.Fatal("expected non-empty block message")
	}
	if want := "*Acme Spa*"; !strings.Contains(msg, want) {
		t.Fatalf("expected message to contain %q, got %q", want, msg)
	}
}

func TestBuildCustomerWarningMessageIncludesRemaining(t *testing.T) {
	msg := buildCustomerWarningMessage("Acme Spa", 2)
	if msg == "" {
		t.Fatal("expected non-empty warning message")
	}
	if want := "2 ausencia(s)"; !strings.Contains(msg, want) {
		t.Fatalf("expected message to contain %q, got %q", want, msg)
	}
}
