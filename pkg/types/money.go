package types

import "fmt"

type Currency string

const (
	USD Currency = "USD"
	EUR Currency = "EUR"
	MXN Currency = "MXN"
	GBP Currency = "GBP"
	ARS Currency = "ARS"
	DOP Currency = "DOP"
)

type Money struct {
	cents    int64
	currency Currency
}

func NewMoney(cents int64, currency Currency) Money {
	return Money{cents: cents, currency: currency}
}

func (m Money) Cents() int64        { return m.cents }
func (m Money) Currency() Currency  { return m.currency }
func (m Money) IsZero() bool        { return m.cents == 0 }

func (m Money) Add(other Money) (Money, error) {
	if m.currency != other.currency {
		return Money{}, fmt.Errorf("currency mismatch: %s vs %s", m.currency, other.currency)
	}
	return Money{cents: m.cents + other.cents, currency: m.currency}, nil
}

func (m Money) Multiply(factor int64) Money {
	return Money{cents: m.cents * factor, currency: m.currency}
}
