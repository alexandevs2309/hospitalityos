package fiscal

import (
	"testing"
)

func TestNCFGeneratorNextNCF(t *testing.T) {
	gen := NewNCFGenerator()
	gen.RegisterSequence(NCFTypeNormal, "", 1, 100)

	ncf1, err := gen.NextNCF(NCFTypeNormal)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ncf1 != "B0100000001" {
		t.Errorf("expected B0100000001, got %s", ncf1)
	}

	ncf2, _ := gen.NextNCF(NCFTypeNormal)
	if ncf2 != "B0100000002" {
		t.Errorf("expected B0100000002, got %s", ncf2)
	}
}

func TestNCFGeneratorExhausted(t *testing.T) {
	gen := NewNCFGenerator()
	gen.RegisterSequence(NCFTypeNormal, "", 99, 100)

	gen.NextNCF(NCFTypeNormal)
	gen.NextNCF(NCFTypeNormal)

	_, err := gen.NextNCF(NCFTypeNormal)
	if err == nil {
		t.Error("expected error for exhausted sequence")
	}
}

func TestNCFGeneratorUnregisteredType(t *testing.T) {
	gen := NewNCFGenerator()

	_, err := gen.NextNCF(NCFTypeNormal)
	if err == nil {
		t.Error("expected error for unregistered type")
	}
}

func TestNCFGeneratorRemaining(t *testing.T) {
	gen := NewNCFGenerator()
	gen.RegisterSequence(NCFTypeNormal, "", 1, 100)

	remaining := gen.Remaining(NCFTypeNormal)
	if remaining != 100 {
		t.Errorf("expected 100 remaining, got %d", remaining)
	}

	gen.NextNCF(NCFTypeNormal)
	remaining = gen.Remaining(NCFTypeNormal)
	if remaining != 99 {
		t.Errorf("expected 99 remaining, got %d", remaining)
	}
}

func TestNCFGeneratorMultipleTypes(t *testing.T) {
	gen := NewNCFGenerator()
	gen.RegisterSequence(NCFTypeNormal, "", 1, 1000)
	gen.RegisterSequence(NCFTypeCreditoFiscal, "", 1, 1000)

	ncf1, _ := gen.NextNCF(NCFTypeNormal)
	ncf2, _ := gen.NextNCF(NCFTypeCreditoFiscal)
	ncf3, _ := gen.NextNCF(NCFTypeNormal)

	if ncf1 == ncf2 {
		t.Error("different types should produce different NCFs")
	}
	if ncf1 == ncf3 {
		t.Error("same type should increment")
	}
}
