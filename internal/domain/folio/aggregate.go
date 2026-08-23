package folio

import (
	"time"
)

type EntryType string

const (
	EntryTypeCharge     EntryType = "charge"
	EntryTypePayment    EntryType = "payment"
	EntryTypeAdjustment EntryType = "adjustment"
	EntryTypeRefund     EntryType = "refund"
	EntryTypeDeposit    EntryType = "deposit"
	EntryTypeTransfer   EntryType = "transfer"
)

type Entry struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	ReservationID string    `json:"reservation_id"`
	Type          EntryType `json:"type"`
	Description   string    `json:"description"`
	AmountCents   int64     `json:"amount_cents"`
	Currency      string    `json:"currency"`
	Reference     string    `json:"reference"`
	Metadata      string    `json:"metadata,omitempty"`
	CreatedBy     string    `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}

func (e *Entry) IsDebit() bool {
	return e.Type == EntryTypeCharge || e.Type == EntryTypeTransfer
}

func (e *Entry) IsCredit() bool {
	return e.Type == EntryTypePayment || e.Type == EntryTypeRefund || e.Type == EntryTypeDeposit
}

func (e *Entry) SignedAmount() int64 {
	if e.IsDebit() {
		return e.AmountCents
	}
	return -e.AmountCents
}

type Folio struct {
	TenantID      string    `json:"tenant_id"`
	ReservationID string    `json:"reservation_id"`
	Entries       []Entry   `json:"entries"`
	Balance       int64     `json:"balance"`
	Closed        bool      `json:"closed"`
	ClosedAt      time.Time `json:"closed_at,omitempty"`
}

func NewFolio(tenantID, reservationID string) *Folio {
	return &Folio{
		TenantID:      tenantID,
		ReservationID: reservationID,
		Entries:       []Entry{},
		Balance:       0,
	}
}

func (f *Folio) AddEntry(entry Entry) {
	f.Entries = append(f.Entries, entry)
	f.Balance += entry.SignedAmount()
}

func (f *Folio) CalculateBalance() int64 {
	var balance int64
	for _, e := range f.Entries {
		balance += e.SignedAmount()
	}
	return balance
}

func (f *Folio) CanClose() bool {
	return f.CalculateBalance() == 0
}

func (f *Folio) TotalCharges() int64 {
	var total int64
	for _, e := range f.Entries {
		if e.IsDebit() {
			total += e.AmountCents
		}
	}
	return total
}

func (f *Folio) TotalPayments() int64 {
	var total int64
	for _, e := range f.Entries {
		if e.IsCredit() {
			total += e.AmountCents
		}
	}
	return total
}
