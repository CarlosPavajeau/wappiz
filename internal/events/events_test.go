package events

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type testHandler struct {
	id    HandlerID
	calls *int
	err   error
	panic bool
}

func (h testHandler) HandlerID() HandlerID {
	return h.id
}

func (h testHandler) EventType() Type {
	return TypeAppointmentCreated
}

func (h testHandler) Handle(context.Context, Event) error {
	*h.calls++
	if h.panic {
		panic("boom")
	}
	return h.err
}

func TestDispatcherSkipsCompletedHandlersAndContinuesAfterFailure(t *testing.T) {
	firstCalls := 0
	secondCalls := 0
	thirdCalls := 0
	handlerErr := errors.New("handler failed")
	dispatcher := NewDispatcher()
	dispatcher.Register(testHandler{id: "first", calls: &firstCalls})
	dispatcher.Register(testHandler{id: "second", calls: &secondCalls, err: handlerErr})
	dispatcher.Register(testHandler{id: "third", calls: &thirdCalls})

	results, err := dispatcher.Dispatch(context.Background(), Event{EventType: TypeAppointmentCreated}, map[HandlerID]struct{}{
		"first": {},
	})

	require.NoError(t, err)
	require.Equal(t, 0, firstCalls)
	require.Equal(t, 1, secondCalls)
	require.Equal(t, 1, thirdCalls)
	require.Len(t, results, 2)
	require.ErrorIs(t, results[0].Err, handlerErr)
	require.NoError(t, results[1].Err)
}

func TestDispatcherConvertsHandlerPanicToError(t *testing.T) {
	calls := 0
	dispatcher := NewDispatcher()
	dispatcher.Register(testHandler{id: "panics", calls: &calls, panic: true})

	results, err := dispatcher.Dispatch(context.Background(), Event{EventType: TypeAppointmentCreated}, nil)

	require.NoError(t, err)
	require.Equal(t, 1, calls)
	require.Len(t, results, 1)
	require.ErrorContains(t, results[0].Err, `handler "panics" panicked: boom`)
}

func TestDispatcherRejectsDuplicateHandlerID(t *testing.T) {
	calls := 0
	dispatcher := NewDispatcher()
	dispatcher.Register(testHandler{id: "duplicate", calls: &calls})

	require.Panics(t, func() {
		dispatcher.Register(testHandler{id: "duplicate", calls: &calls})
	})
}

func TestDispatcherFailsWhenEventHasNoHandlers(t *testing.T) {
	results, err := NewDispatcher().Dispatch(context.Background(), Event{EventType: TypeAppointmentCreated}, nil)

	require.Error(t, err)
	require.Empty(t, results)
}
