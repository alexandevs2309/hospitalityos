package folio

import (
	"testing"
	"time"
)

func TestNewFolio(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	if f.TenantID != "tenant-1" {
		t.Errorf("TenantID = %q, want %q", f.TenantID, "tenant-1")
	}
	if f.ReservationID != "res-1" {
		t.Errorf("ReservationID = %q, want %q", f.ReservationID, "res-1")
	}
	if f.Balance != 0 {
		t.Errorf("Balance = %d, want 0", f.Balance)
	}
	if len(f.Entries) != 0 {
		t.Errorf("Entries len = %d, want 0", len(f.Entries))
	}
}

func TestFolioAddCharge(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	entry := Entry{
		ID:          "entry-1",
		Type:        EntryTypeCharge,
		Description: "Room rate",
		AmountCents: 150000,
		Currency:    "DOP",
		CreatedAt:   time.Now(),
	}

	f.AddEntry(entry)

	if f.Balance != 150000 {
		t.Errorf("Balance = %d, want 150000", f.Balance)
	}
	if len(f.Entries) != 1 {
		t.Errorf("Entries len = %d, want 1", len(f.Entries))
	}
}

func TestFolioAddPayment(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 150000})
	f.AddEntry(Entry{Type: EntryTypePayment, AmountCents: 150000})

	if f.Balance != 0 {
		t.Errorf("Balance = %d, want 0 after payment", f.Balance)
	}
}

func TestFolioMixedEntries(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 150000})
	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 50000})
	f.AddEntry(Entry{Type: EntryTypePayment, AmountCents: 100000})

	if f.Balance != 100000 {
		t.Errorf("Balance = %d, want 100000", f.Balance)
	}
}

func TestFolioTotalCharges(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 150000})
	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 50000})
	f.AddEntry(Entry{Type: EntryTypePayment, AmountCents: 100000})

	if f.TotalCharges() != 200000 {
		t.Errorf("TotalCharges = %d, want 200000", f.TotalCharges())
	}
}

func TestFolioTotalPayments(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 150000})
	f.AddEntry(Entry{Type: EntryTypePayment, AmountCents: 50000})
	f.AddEntry(Entry{Type: EntryTypeRefund, AmountCents: 10000})

	if f.TotalPayments() != 60000 {
		t.Errorf("TotalPayments = %d, want 60000", f.TotalPayments())
	}
}

func TestFolioCanClose(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	if !f.CanClose() {
		t.Error("empty folio should be closeable (balance=0)")
	}

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 150000})
	if f.CanClose() {
		t.Error("folio with charges should not be closeable")
	}

	f.AddEntry(Entry{Type: EntryTypePayment, AmountCents: 150000})
	if !f.CanClose() {
		t.Error("folio with zero balance should be closeable")
	}
}

func TestFolioCanCloseWithAdjustment(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 150000})
	f.AddEntry(Entry{Type: EntryTypeAdjustment, AmountCents: 150000})

	if !f.CanClose() {
		t.Error("folio with zero balance via adjustment should be closeable")
	}
}

func TestFolioSignedAmount(t *testing.T) {
	tests := []struct {
		entryType EntryType
		amount    int64
		expected  int64
	}{
		{EntryTypeCharge, 100000, 100000},
		{EntryTypeTransfer, 50000, 50000},
		{EntryTypePayment, 100000, -100000},
		{EntryTypeRefund, 25000, -25000},
		{EntryTypeDeposit, 75000, -75000},
		{EntryTypeAdjustment, 10000, -10000},
	}

	for _, tt := range tests {
		e := Entry{Type: tt.entryType, AmountCents: tt.amount}
		if e.SignedAmount() != tt.expected {
			t.Errorf("Entry{Type:%s, Amount:%d}.SignedAmount() = %d, want %d",
				tt.entryType, tt.amount, e.SignedAmount(), tt.expected)
		}
	}
}

func TestFolioIsDebitCredit(t *testing.T) {
	debitTypes := []EntryType{EntryTypeCharge, EntryTypeTransfer}
	creditTypes := []EntryType{EntryTypePayment, EntryTypeRefund, EntryTypeDeposit}
	neutralTypes := []EntryType{EntryTypeAdjustment}

	for _, dt := range debitTypes {
		e := Entry{Type: dt}
		if !e.IsDebit() {
			t.Errorf("EntryType %s should be debit", dt)
		}
		if e.IsCredit() {
			t.Errorf("EntryType %s should not be credit", dt)
		}
	}

	for _, ct := range creditTypes {
		e := Entry{Type: ct}
		if e.IsDebit() {
			t.Errorf("EntryType %s should not be debit", ct)
		}
		if !e.IsCredit() {
			t.Errorf("EntryType %s should be credit", ct)
		}
	}

	for _, nt := range neutralTypes {
		e := Entry{Type: nt}
		if e.IsDebit() {
			t.Errorf("EntryType %s should not be debit", nt)
		}
		if e.IsCredit() {
			t.Errorf("EntryType %s should not be credit", nt)
		}
	}
}

func TestFolioCalculateBalanceConsistency(t *testing.T) {
	f := NewFolio("tenant-1", "res-1")

	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 200000})
	f.AddEntry(Entry{Type: EntryTypePayment, AmountCents: 50000})
	f.AddEntry(Entry{Type: EntryTypeCharge, AmountCents: 30000})
	f.AddEntry(Entry{Type: EntryTypeRefund, AmountCents: 10000})

	calculated := f.CalculateBalance()
	if f.Balance != calculated {
		t.Errorf("Balance (%d) != CalculateBalance (%d)", f.Balance, calculated)
	}
}
