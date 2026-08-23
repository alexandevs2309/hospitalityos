package fiscal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type DGIClient struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewDGIClient(apiKey string) *DGIClient {
	return &DGIClient{
		apiKey:     apiKey,
		baseURL:    "https://api.dgii.gov.do",
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type ECFRequest struct {
	RNC             string `json:"rnc"`
	NCF             string `json:"ncf"`
	NCFType         string `json:"ncf_type"`
	RNCDestino      string `json:"rnc_destino"`
	FechaEmision    string `json:"fecha_emision"`
	MontoTotal      int64  `json:"monto_total"`
	MontoGravado    int64  `json:"monto_gravado"`
	ITBIS           int64  `json:"itbis"`
	ITBISRetenido   int64  `json:"itbis_retenido"`
	Propina         int64  `json:"propina"`
	FormaPago       string `json:"forma_pago"`
	TipoPago        string `json:"tipo_pago"`
	CodigoSeguridad string `json:"codigo_seguridad"`
}

type eCFResponse struct {
	TrackID         string `json:"track_id"`
	Estado          string `json:"estado"`
	FechaProcesado  string `json:"fecha_procesado"`
	Mensaje         string `json:"mensaje"`
}

type ValidationResponse struct {
	Valido  bool   `json:"valido"`
	RNC     string `json:"rnc"`
	Nombre  string `json:"nombre"`
	Estado  string `json:"estado"`
	Mensaje string `json:"mensaje"`
}

func (c *DGIClient) SubmitECF(req ECFRequest) (*eCFResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/eCF/v1/remision", c.baseURL)
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("DGII error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result eCFResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

func (c *DGIClient) ValidateRNC(rnc string) (*ValidationResponse, error) {
	url := fmt.Sprintf("%s/eCF/v1/validar-rnc/%s", c.baseURL, rnc)
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result ValidationResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

func (c *DGIClient) CheckStatus(trackID string) (*eCFResponse, error) {
	url := fmt.Sprintf("%s/eCF/v1/consulta/%s", c.baseURL, trackID)
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result eCFResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}
