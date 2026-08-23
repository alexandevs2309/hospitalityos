package fiscal

import (
	"testing"
)

func TestTaxCalculator(t *testing.T) {
	calc := NewTaxCalculator()

	tests := []struct {
		name           string
		subtotalCents  int64
		expectedITBIS  int64
		expectedPropina int64
		expectedTotal  int64
	}{
		{
			name:           "100 pesos",
			subtotalCents:  10000,
			expectedITBIS:  1800,
			expectedPropina: 1000,
			expectedTotal:  12800,
		},
		{
			name:           "1000 pesos",
			subtotalCents:  100000,
			expectedITBIS:  18000,
			expectedPropina: 10000,
			expectedTotal:  128000,
		},
		{
			name:           "zero",
			subtotalCents:  0,
			expectedITBIS:  0,
			expectedPropina: 0,
			expectedTotal:  0,
		},
		{
			name:           "1 peso",
			subtotalCents:  100,
			expectedITBIS:  18,
			expectedPropina: 10,
			expectedTotal:  128,
		},
		{
			name:           "1500 pesos (typical room rate)",
			subtotalCents:  150000,
			expectedITBIS:  27000,
			expectedPropina: 15000,
			expectedTotal:  192000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calc.Calculate(tt.subtotalCents)

			if result.SubtotalCents != tt.subtotalCents {
				t.Errorf("SubtotalCents = %d, want %d", result.SubtotalCents, tt.subtotalCents)
			}
			if result.ITBISCents != tt.expectedITBIS {
				t.Errorf("ITBISCents = %d, want %d", result.ITBISCents, tt.expectedITBIS)
			}
			if result.PropinaCents != tt.expectedPropina {
				t.Errorf("PropinaCents = %d, want %d", result.PropinaCents, tt.expectedPropina)
			}
			if result.TotalCents != tt.expectedTotal {
				t.Errorf("TotalCents = %d, want %d", result.TotalCents, tt.expectedTotal)
			}
		})
	}
}

func TestTaxCalculatorITBISRate(t *testing.T) {
	calc := NewTaxCalculator()
	if calc.ITBISRate != 0.18 {
		t.Errorf("ITBISRate = %f, want 0.18", calc.ITBISRate)
	}
}

func TestTaxCalculatorPropinaRate(t *testing.T) {
	calc := NewTaxCalculator()
	if calc.PropinaRate != 0.10 {
		t.Errorf("PropinaRate = %f, want 0.10", calc.PropinaRate)
	}
}
