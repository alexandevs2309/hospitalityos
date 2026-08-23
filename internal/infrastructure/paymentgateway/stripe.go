package paymentgateway

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	secretKey  string
	apiVersion string
	httpClient *http.Client
}

func NewClient(secretKey string) *Client {
	return &Client{
		secretKey:  secretKey,
		apiVersion: "2023-10-16",
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type PaymentIntent struct {
	ID               string `json:"id"`
	Amount           int64  `json:"amount"`
	Currency         string `json:"currency"`
	Status           string `json:"status"`
	ClientSecret     string `json:"client_secret"`
	PaymentMethod    string `json:"payment_method"`
	Metadata         map[string]string `json:"metadata"`
	Created          int64  `json:"created"`
}

type PaymentIntentRequest struct {
	Amount      int64             `json:"amount"`
	Currency    string            `json:"currency"`
	Description string            `json:"description"`
	Metadata    map[string]string `json:"metadata"`
	AutomaticPaymentMethods *struct {
		Enabled bool `json:"enabled"`
	} `json:"automatic_payment_methods,omitempty"`
}

type Charge struct {
	ID         string `json:"id"`
	Amount     int64  `json:"amount"`
	Currency   string `json:"currency"`
	Status     string `json:"status"`
	PaymentIntent string `json:"payment_intent"`
	Created    int64  `json:"created"`
}

type Refund struct {
	ID         string `json:"id"`
	Amount     int64  `json:"amount"`
	Currency   string `json:"currency"`
	Status     string `json:"status"`
	Charge     string `json:"charge"`
	Created    int64  `json:"created"`
}

type WebhookEvent struct {
	ID      string          `json:"id"`
	Type    string          `json:"type"`
	Created int64           `json:"created"`
	Data    struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

func (c *Client) CreatePaymentIntent(amount int64, currency, description string, metadata map[string]string) (*PaymentIntent, error) {
	req := PaymentIntentRequest{
		Amount:      amount,
		Currency:    currency,
		Description: description,
		Metadata:    metadata,
	}
	req.AutomaticPaymentMethods = &struct {
		Enabled bool `json:"enabled"`
	}{Enabled: true}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := "https://api.stripe.com/v1/payment_intents"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)

	httpReq.Body = io.NopCloser(bytes.NewReader(formEncode(req)))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Stripe API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result PaymentIntent
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

func (c *Client) ConfirmPaymentIntent(paymentIntentID, paymentMethodID string) (*PaymentIntent, error) {
	data := fmt.Sprintf("payment_method=%s", paymentMethodID)
	url := fmt.Sprintf("https://api.stripe.com/v1/payment_intents/%s/confirm", paymentIntentID)

	httpReq, err := http.NewRequest("POST", url, bytes.NewReader([]byte(data)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Stripe API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result PaymentIntent
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

func (c *Client) CreateRefund(chargeID string, amount int64) (*Refund, error) {
	data := fmt.Sprintf("charge=%s", chargeID)
	if amount > 0 {
		data += fmt.Sprintf("&amount=%d", amount)
	}

	url := "https://api.stripe.com/v1/refunds"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader([]byte(data)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Authorization", "Bearer "+c.secretKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Stripe API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result Refund
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

func (c *Client) ParseWebhook(body []byte, sigHeader string) (*WebhookEvent, error) {
	var event WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		return nil, err
	}
	return &event, nil
}

func formEncode(v interface{}) []byte {
	data, _ := json.Marshal(v)
	var result map[string]interface{}
	json.Unmarshal(data, &result)

	encoded := ""
	for key, value := range result {
		if encoded != "" {
			encoded += "&"
		}
		encoded += fmt.Sprintf("%s=%v", key, value)
	}
	return []byte(encoded)
}
