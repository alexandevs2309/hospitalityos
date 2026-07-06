package eventstore

import (
	"fmt"
	"sync"

	"github.com/hospitalityos/pkg/es"
)

type InMemoryStore struct {
	mu     sync.RWMutex
	events map[string][]es.Event
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		events: make(map[string][]es.Event),
	}
}

func (s *InMemoryStore) Save(streamID string, newEvents []es.Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream := s.events[streamID]
	for i, event := range newEvents {
		event.Version = len(stream) + i + 1
		s.events[streamID] = append(s.events[streamID], event)
	}
	return nil
}

func (s *InMemoryStore) Load(streamID string) ([]es.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events, ok := s.events[streamID]
	if !ok {
		return nil, fmt.Errorf("stream %s not found", streamID)
	}
	result := make([]es.Event, len(events))
	copy(result, events)
	return result, nil
}


