package channelmanager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Channel string

const (
	ChannelBooking    Channel = "booking_com"
	ChannelExpedia    Channel = "expedia"
	ChannelAirbnb     Channel = "airbnb"
	ChannelHostelworld Channel = "hostelworld"
	ChannelCustom     Channel = "custom"
)

type Client struct {
	channel    Channel
	apiKey     string
	apiSecret  string
	propertyID string
	baseURL    string
	httpClient *http.Client
}

func NewClient(channel Channel, apiKey, apiSecret, propertyID string) *Client {
	baseURLs := map[Channel]string{
		ChannelBooking:     "https://admin.booking.com",
		ChannelExpedia:     "https://expedia.com",
		ChannelAirbnb:      "https://www.airbnb.com",
		ChannelHostelworld: "https://www.hostelworld.com",
		ChannelCustom:      "https://api.custom-channel.com",
	}

	return &Client{
		channel:    channel,
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		propertyID: propertyID,
		baseURL:    baseURLs[channel],
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type RateUpdate struct {
	RoomTypeID  string `json:"room_type_id"`
	Date        string `json:"date"`
	Price       int64  `json:"price_cents"`
	Currency    string `json:"currency"`
	MinStay     int    `json:"min_stay"`
	MaxStay     int    `json:"max_stay"`
	Available   bool   `json:"available"`
}

type AvailabilityUpdate struct {
	RoomTypeID  string `json:"room_type_id"`
	Date        string `json:"date"`
	Rooms       int    `json:"rooms_available"`
}

type ReservationUpdate struct {
	ChannelReservationID string `json:"channel_reservation_id"`
	GuestName           string `json:"guest_name"`
	GuestEmail          string `json:"guest_email"`
	GuestPhone          string `json:"guest_phone"`
	RoomTypeID          string `json:"room_type_id"`
	CheckIn             string `json:"check_in"`
	CheckOut            string `json:"check_out"`
	Adults              int    `json:"adults"`
	Children            int    `json:"children"`
	TotalAmount         int64  `json:"total_amount_cents"`
	Currency            string `json:"currency"`
	Status              string `json:"status"`
}

type SyncResult struct {
	Success   bool   `json:"success"`
	MessageID string `json:"message_id,omitempty"`
	Error     string `json:"error,omitempty"`
	Timestamp string `json:"timestamp"`
}

func (c *Client) SyncRates(rates []RateUpdate) (*SyncResult, error) {
	return c.sendUpdate("rates", rates)
}

func (c *Client) SyncAvailability(availability []AvailabilityUpdate) (*SyncResult, error) {
	return c.sendUpdate("availability", availability)
}

func (c *Client) SyncReservation(reservation ReservationUpdate) (*SyncResult, error) {
	return c.sendUpdate("reservations", reservation)
}

func (c *Client) sendUpdate(updateType string, data interface{}) (*SyncResult, error) {
	payload := map[string]interface{}{
		"property_id": c.propertyID,
		"update_type": updateType,
		"data":        data,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return &SyncResult{
			Success:   false,
			Error:     err.Error(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}, err
	}

	url := fmt.Sprintf("%s/api/v1/properties/%s/sync/%s", c.baseURL, c.propertyID, updateType)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return &SyncResult{
			Success:   false,
			Error:     err.Error(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("X-Channel", string(c.channel))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &SyncResult{
			Success:   false,
			Error:     err.Error(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return &SyncResult{
			Success:   false,
			Error:     fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBody)),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}, nil
	}

	return &SyncResult{
		Success:   true,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (c *Client) PullReservations() ([]ReservationUpdate, error) {
	url := fmt.Sprintf("%s/api/v1/properties/%s/reservations", c.baseURL, c.propertyID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("X-Channel", string(c.channel))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var reservations []ReservationUpdate
	if err := json.NewDecoder(resp.Body).Decode(&reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}
