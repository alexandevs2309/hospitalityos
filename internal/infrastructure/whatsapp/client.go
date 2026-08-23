package whatsapp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	accessToken string
	phoneNumberID string
	businessAccountID string
	httpClient *http.Client
}

func NewClient(accessToken, phoneNumberID, businessAccountID string) *Client {
	return &Client{
		accessToken: accessToken,
		phoneNumberID: phoneNumberID,
		businessAccountID: businessAccountID,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type TemplateMessage struct {
	MessagingProduct string `json:"messaging_product"`
	To               string `json:"to"`
	Type             string `json:"type"`
	Template         struct {
		Name       string `json:"name"`
		Language   struct {
			Code string `json:"code"`
		} `json:"language"`
		Components []TemplateComponent `json:"components,omitempty"`
	} `json:"template"`
}

type TemplateComponent struct {
	Type       string            `json:"type"`
	Parameters []TemplateParam   `json:"parameters"`
}

type TemplateParam struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type TextMessage struct {
	MessagingProduct string `json:"messaging_product"`
	To               string `json:"to"`
	Type             string `json:"type"`
	Text             struct {
		PreviewURL bool   `json:"preview_url"`
		Body       string `json:"body"`
	} `json:"text"`
}

type MediaMessage struct {
	MessagingProduct string `json:"messaging_product"`
	To               string `json:"to"`
	Type             string `json:"type"`
	Image            struct {
		Link string `json:"link"`
	} `json:"image"`
}

type MessageResponse struct {
	Messages []struct {
		ID string `json:"id"`
	} `json:"messages"`
}

type WebhookMessage struct {
	Object string `json:"object"`
	Entry  []struct {
		ID      string `json:"id"`
		Changes []struct {
			Value struct {
				MessagingProduct string `json:"messaging_product"`
				Contacts         []struct {
					WaID    string `json:"wa_id"`
					Profile struct {
						Name string `json:"name"`
					} `json:"profile"`
				} `json:"contacts"`
				Messages []struct {
					From string `json:"from"`
					ID   string `json:"id"`
					Type string `json:"type"`
					Text struct {
						Body string `json:"body"`
					} `json:"text"`
					Image *struct {
						ID string `json:"id"`
					} `json:"image,omitempty"`
				} `json:"messages"`
				Statuses []struct {
					ID           string `json:"id"`
					Status       string `json:"status"`
					Timestamp    string `json:"timestamp"`
					RecipientID  string `json:"recipient_id"`
				} `json:"statuses"`
			} `json:"value"`
			Field string `json:"field"`
		} `json:"changes"`
	} `json:"entry"`
}

func (c *Client) SendTemplate(to, templateName, languageCode string, params []string) (*MessageResponse, error) {
	msg := TemplateMessage{
		MessagingProduct: "whatsapp",
		To:               to,
		Type:             "template",
	}
	msg.Template.Name = templateName
	msg.Template.Language.Code = languageCode

	if len(params) > 0 {
		comp := TemplateComponent{
			Type: "body",
		}
		for _, p := range params {
			comp.Parameters = append(comp.Parameters, TemplateParam{
				Type: "text",
				Text: p,
			})
		}
		msg.Template.Components = append(msg.Template.Components, comp)
	}

	return c.sendRequest(msg)
}

func (c *Client) SendText(to, text string) (*MessageResponse, error) {
	msg := TextMessage{
		MessagingProduct: "whatsapp",
		To:               to,
		Type:             "text",
	}
	msg.Text.PreviewURL = false
	msg.Text.Body = text

	return c.sendRequest(msg)
}

func (c *Client) SendImage(to, imageURL string) (*MessageResponse, error) {
	msg := MediaMessage{
		MessagingProduct: "whatsapp",
		To:               to,
		Type:             "image",
	}
	msg.Image.Link = imageURL

	return c.sendRequest(msg)
}

func (c *Client) sendRequest(payload interface{}) (*MessageResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal message: %w", err)
	}

	url := fmt.Sprintf("https://graph.facebook.com/v18.0/%s/messages", c.phoneNumberID)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("WhatsApp API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result MessageResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

func (c *Client) ParseWebhook(body []byte) (*WebhookMessage, error) {
	var msg WebhookMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}
