package jobs

import "testing"

func TestSignalProcessQueuesWakeup(t *testing.T) {
	notifyCh := make(chan struct{}, 1)

	signalProcess(notifyCh)

	select {
	case <-notifyCh:
	default:
		t.Fatal("expected wakeup signal")
	}
}

func TestSignalProcessDoesNotBlockWhenWakeupAlreadyQueued(t *testing.T) {
	notifyCh := make(chan struct{}, 1)
	notifyCh <- struct{}{}

	signalProcess(notifyCh)

	select {
	case <-notifyCh:
	default:
		t.Fatal("expected existing wakeup signal")
	}
}
