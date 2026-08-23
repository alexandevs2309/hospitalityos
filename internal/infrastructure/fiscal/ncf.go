package fiscal

import (
	"fmt"
	"strings"
)

type NCFType string

const (
	NCFTypeNormal       NCFType = "B01"
	NCFTypeCreditoFiscal NCFType = "B02"
	NCFTypeNotaCredito  NCFType = "B03"
	NCFTypeNotaDebito   NCFType = "B04"
	NCFTypeComprobante  NCFType = "B14"
	NCFTypeGubernamental NCFType = "B15"
)

type NCFGenerator struct {
	sequences map[NCFType]*Sequence
}

type Sequence struct {
	Type          NCFType
	Prefix        string
	CurrentNumber int
	MaxNumber     int
}

func NewNCFGenerator() *NCFGenerator {
	return &NCFGenerator{
		sequences: make(map[NCFType]*Sequence),
	}
}

func (g *NCFGenerator) RegisterSequence(ncfType NCFType, prefix string, start, max int) {
	g.sequences[ncfType] = &Sequence{
		Type:          ncfType,
		Prefix:        prefix,
		CurrentNumber: start,
		MaxNumber:     max,
	}
}

func (g *NCFGenerator) NextNCF(ncfType NCFType) (string, error) {
	seq, ok := g.sequences[ncfType]
	if !ok {
		return "", fmt.Errorf("NCF type %s not registered", ncfType)
	}

	if seq.CurrentNumber > seq.MaxNumber {
		return "", fmt.Errorf("NCF sequence exhausted for type %s", ncfType)
	}

	ncf := fmt.Sprintf("%s%s%08d", seq.Prefix, string(ncfType), seq.CurrentNumber)
	seq.CurrentNumber++

	return ncf, nil
}

func (g *NCFGenerator) CurrentNumber(ncfType NCFType) int {
	seq, ok := g.sequences[ncfType]
	if !ok {
		return 0
	}
	return seq.CurrentNumber
}

func (g *NCFGenerator) Remaining(ncfType NCFType) int {
	seq, ok := g.sequences[ncfType]
	if !ok {
		return 0
	}
	return seq.MaxNumber - seq.CurrentNumber + 1
}

type TaxCalculator struct {
	ITBISRate  float64 // 18%
	PropinaRate float64 // 10%
}

func NewTaxCalculator() *TaxCalculator {
	return &TaxCalculator{
		ITBISRate:   0.18,
		PropinaRate: 0.10,
	}
}

type TaxBreakdown struct {
	SubtotalCents  int64 `json:"subtotal_cents"`
	ITBISCents     int64 `json:"itbis_cents"`
	PropinaCents   int64 `json:"propina_cents"`
	TotalCents     int64 `json:"total_cents"`
}

func (tc *TaxCalculator) Calculate(subtotalCents int64) TaxBreakdown {
	itbis := int64(float64(subtotalCents) * tc.ITBISRate)
	propina := int64(float64(subtotalCents) * tc.PropinaRate)
	total := subtotalCents + itbis + propina

	return TaxBreakdown{
		SubtotalCents: subtotalCents,
		ITBISCents:    itbis,
		PropinaCents:  propina,
		TotalCents:    total,
	}
}

func ValidateRNC(rnc string) bool {
	rnc = strings.TrimSpace(rnc)
	rnc = strings.ReplaceAll(rnc, "-", "")

	if len(rnc) == 9 {
		return validateRNCJuridico(rnc)
	}
	if len(rnc) == 11 {
		return validateRNCFisico(rnc)
	}
	return false
}

func validateRNCJuridico(rnc string) bool {
	if len(rnc) != 9 {
		return false
	}

	weights := []int{7, 9, 8, 6, 5, 4, 3, 2}
	sum := 0
	for i, w := range weights {
		digit := int(rnc[i] - '0')
		if digit < 0 || digit > 9 {
			return false
		}
		sum += digit * w
	}

	remainder := sum % 11
	var checkDigit int
	if remainder == 0 {
		checkDigit = 2
	} else if remainder == 1 {
		checkDigit = 1
	} else {
		checkDigit = 11 - remainder
	}

	lastDigit := int(rnc[8] - '0')
	return checkDigit == lastDigit
}

func validateRNCFisico(rnc string) bool {
	if len(rnc) != 11 {
		return false
	}

	weights := []int{1, 2, 1, 2, 1, 2, 1, 2, 1, 2}
	sum := 0
	for i, w := range weights {
		digit := int(rnc[i] - '0')
		if digit < 0 || digit > 9 {
			return false
		}
		product := digit * w
		sum += product / 10 + product%10
	}

	checkDigit := (10 - (sum % 10)) % 10
	lastDigit := int(rnc[10] - '0')
	return checkDigit == lastDigit
}

func FormatRNC(rnc string) string {
	rnc = strings.ReplaceAll(rnc, "-", "")
	rnc = strings.TrimSpace(rnc)
	if len(rnc) == 9 {
		return fmt.Sprintf("%s-%s-%s", rnc[:3], rnc[3:5], rnc[5:])
	}
	if len(rnc) == 11 {
		return fmt.Sprintf("%s-%s-%s", rnc[:3], rnc[3:7], rnc[7:])
	}
	return rnc
}
