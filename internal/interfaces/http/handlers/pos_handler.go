package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/hospitalityos/pkg/httputil"
)

type POSHandler struct {
	pool *pgxpool.Pool
}

func NewPOSHandler(pool *pgxpool.Pool) *POSHandler {
	return &POSHandler{pool: pool}
}

func (h *POSHandler) setCtx(ctx context.Context, tenantID string) {
	h.pool.Exec(ctx, `SET app.current_tenant = $1`, tenantID)
}

func (h *POSHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	rows, err := h.pool.Query(ctx, `SELECT id::text, name, sort_order, active FROM pos_categories WHERE tenant_id = $1 ORDER BY sort_order`, tenantID)
	if err != nil {
		httputil.InternalServerError(w, "failed")
		return
	}
	defer rows.Close()

	type Cat struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Order  int    `json:"sort_order"`
		Active bool   `json:"active"`
	}
	var cats []Cat
	for rows.Next() {
		var c Cat
		rows.Scan(&c.ID, &c.Name, &c.Order, &c.Active)
		cats = append(cats, c)
	}
	if cats == nil {
		cats = []Cat{}
	}
	httputil.JSON(w, http.StatusOK, map[string]interface{}{"categories": cats})
}

func (h *POSHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	var body struct {
		Name string `json:"name"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Name == "" {
		httputil.BadRequest(w, "name required")
		return
	}

	var id string
	err := h.pool.QueryRow(ctx,
		`INSERT INTO pos_categories (tenant_id, name) VALUES ($1, $2) RETURNING id::text`,
		tenantID, body.Name).Scan(&id)
	if err != nil {
		httputil.InternalServerError(w, "failed to create category")
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id, "name": body.Name})
}

func (h *POSHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)
	categoryID := r.URL.Query().Get("category_id")

	query := `SELECT i.id::text, i.name, COALESCE(i.description,''), i.price_cents, i.cost_cents,
	                 COALESCE(i.sku,''), i.tax_rate, i.active, c.name as category_name
	          FROM pos_items i JOIN pos_categories c ON c.id = i.category_id
	          WHERE i.tenant_id = $1`
	args := []interface{}{tenantID}
	if categoryID != "" {
		query += ` AND i.category_id = $2`
		args = append(args, categoryID)
	}
	query += ` ORDER BY c.sort_order, i.name`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		httputil.InternalServerError(w, "failed")
		return
	}
	defer rows.Close()

	type Item struct {
		ID           string  `json:"id"`
		Name         string  `json:"name"`
		Description  string  `json:"description"`
		PriceCents   int64   `json:"price_cents"`
		CostCents    int64   `json:"cost_cents"`
		SKU          string  `json:"sku"`
		TaxRate      float64 `json:"tax_rate"`
		Active       bool    `json:"active"`
		CategoryName string  `json:"category_name"`
	}
	var items []Item
	for rows.Next() {
		var i Item
		rows.Scan(&i.ID, &i.Name, &i.Description, &i.PriceCents, &i.CostCents, &i.SKU, &i.TaxRate, &i.Active, &i.CategoryName)
		items = append(items, i)
	}
	if items == nil {
		items = []Item{}
	}
	httputil.JSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func (h *POSHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	var body struct {
		Name        string  `json:"name"`
		CategoryID  string  `json:"category_id"`
		Description string  `json:"description"`
		PriceCents  int64   `json:"price_cents"`
		CostCents   int64   `json:"cost_cents"`
		SKU         string  `json:"sku"`
		TaxRate     float64 `json:"tax_rate"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Name == "" || body.CategoryID == "" {
		httputil.BadRequest(w, "name and category_id required")
		return
	}

	var id string
	err := h.pool.QueryRow(ctx,
		`INSERT INTO pos_items (tenant_id, category_id, name, description, price_cents, cost_cents, sku, tax_rate)
		 VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7,''), $8) RETURNING id::text`,
		tenantID, body.CategoryID, body.Name, body.Description, body.PriceCents, body.CostCents, body.SKU, body.TaxRate).Scan(&id)
	if err != nil {
		httputil.InternalServerError(w, "failed to create item")
		return
	}
	httputil.JSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *POSHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()

	var body struct {
		ReservationID string `json:"reservation_id"`
		RoomNumber    string `json:"room_number"`
		GuestName     string `json:"guest_name"`
		OrderType     string `json:"order_type"`
		Items         []struct {
			ItemID   string `json:"item_id"`
			Quantity int    `json:"quantity"`
			Notes    string `json:"notes"`
		} `json:"items"`
		CreatedBy string `json:"created_by"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if len(body.Items) == 0 {
		httputil.BadRequest(w, "items required")
		return
	}
	if body.OrderType == "" {
		body.OrderType = "dine_in"
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		httputil.InternalServerError(w, "tx failed")
		return
	}
	defer tx.Rollback(ctx)
	tx.Exec(ctx, `SET LOCAL app.current_tenant = $1`, tenantID)

	var orderID string
	var subtotal, tax int64
	err = tx.QueryRow(ctx,
		`INSERT INTO pos_orders (tenant_id, reservation_id, room_number, guest_name, order_type, created_by)
		 VALUES ($1, NULLIF($2,''), $3, $4, $5, $6) RETURNING id::text`,
		tenantID, body.ReservationID, body.RoomNumber, body.GuestName, body.OrderType, body.CreatedBy).Scan(&orderID)
	if err != nil {
		httputil.InternalServerError(w, "failed to create order")
		return
	}

	for _, item := range body.Items {
		var priceCents int64
		var taxRate float64
		var itemName string
		err = tx.QueryRow(ctx,
			`SELECT name, price_cents, tax_rate FROM pos_items WHERE id = $1 AND tenant_id = $2`,
			item.ItemID, tenantID).Scan(&itemName, &priceCents, &taxRate)
		if err != nil {
			continue
		}
		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}
		lineTotal := priceCents * int64(qty)
		lineTax := int64(float64(lineTotal) * taxRate / 100)

		tx.Exec(ctx,
			`INSERT INTO pos_order_items (tenant_id, order_id, item_id, item_name, quantity, unit_price_cents, total_cents, notes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			tenantID, orderID, item.ItemID, itemName, qty, priceCents, lineTotal, item.Notes)
		subtotal += lineTotal
		tax += lineTax
	}

	total := subtotal + tax
	tx.Exec(ctx,
		`UPDATE pos_orders SET subtotal_cents=$1, tax_cents=$2, total_cents=$3 WHERE id=$4 AND tenant_id=$5`,
		subtotal, tax, total, orderID, tenantID)

	tx.Commit(ctx)

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":             orderID,
		"subtotal_cents": subtotal,
		"tax_cents":      tax,
		"total_cents":    total,
	})
}

func (h *POSHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	orderID := chi.URLParam(r, "id")
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	type OrderItem struct {
		ID        string `json:"id"`
		Name      string `json:"item_name"`
		Quantity  int    `json:"quantity"`
		UnitPrice int64  `json:"unit_price_cents"`
		Total     int64  `json:"total_cents"`
		Notes     string `json:"notes"`
	}
	type Order struct {
		ID            string      `json:"id"`
		ReservationID string      `json:"reservation_id"`
		RoomNumber    string      `json:"room_number"`
		GuestName     string      `json:"guest_name"`
		OrderType     string      `json:"order_type"`
		Status        string      `json:"status"`
		SubtotalCents int64       `json:"subtotal_cents"`
		TaxCents      int64       `json:"tax_cents"`
		TotalCents    int64       `json:"total_cents"`
		CreatedBy     string      `json:"created_by"`
		CreatedAt     string      `json:"created_at"`
		Items         []OrderItem `json:"items"`
	}

	var o Order
	err := h.pool.QueryRow(ctx,
		`SELECT id::text, COALESCE(reservation_id,''), COALESCE(room_number,''), COALESCE(guest_name,''),
		        order_type, status, subtotal_cents, tax_cents, total_cents, COALESCE(created_by,''), created_at::text
		 FROM pos_orders WHERE id = $1 AND tenant_id = $2`, orderID, tenantID).Scan(
		&o.ID, &o.ReservationID, &o.RoomNumber, &o.GuestName, &o.OrderType, &o.Status,
		&o.SubtotalCents, &o.TaxCents, &o.TotalCents, &o.CreatedBy, &o.CreatedAt)
	if err != nil {
		httputil.NotFound(w, "order not found")
		return
	}

	rows, _ := h.pool.Query(ctx,
		`SELECT id::text, item_name, quantity, unit_price_cents, total_cents, COALESCE(notes,'')
		 FROM pos_order_items WHERE order_id = $1 AND tenant_id = $2`, orderID, tenantID)
	defer rows.Close()
	for rows.Next() {
		var i OrderItem
		rows.Scan(&i.ID, &i.Name, &i.Quantity, &i.UnitPrice, &i.Total, &i.Notes)
		o.Items = append(o.Items, i)
	}

	httputil.JSON(w, http.StatusOK, o)
}

func (h *POSHandler) ChargeToFolio(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	orderID := chi.URLParam(r, "id")
	ctx := r.Context()

	var body struct {
		ReservationID string `json:"reservation_id"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.ReservationID == "" {
		httputil.BadRequest(w, "reservation_id required")
		return
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		httputil.InternalServerError(w, "tx failed")
		return
	}
	defer tx.Rollback(ctx)
	tx.Exec(ctx, `SET LOCAL app.current_tenant = $1`, tenantID)

	var totalCents int64
	var status string
	err = tx.QueryRow(ctx,
		`SELECT total_cents, status FROM pos_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
		orderID, tenantID).Scan(&totalCents, &status)
	if err != nil {
		httputil.NotFound(w, "order not found")
		return
	}
	if status != "open" {
		httputil.BadRequest(w, "order already "+status)
		return
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO folio_entries (id, tenant_id, reservation_id, description, amount_cents, type, created_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, 'charge', NOW())`,
		tenantID, body.ReservationID, "POS Order", totalCents)
	if err != nil {
		httputil.InternalServerError(w, "failed to charge folio")
		return
	}

	tx.Exec(ctx,
		`UPDATE pos_orders SET status = 'charged', reservation_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
		body.ReservationID, orderID, tenantID)

	tx.Commit(ctx)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"status":       "charged",
		"amount_cents": totalCents,
		"message":      "Cobrado al folio exitosamente",
	})
}

func (h *POSHandler) POSDashboard(w http.ResponseWriter, r *http.Request) {
	tenantID := httputil.ExtractTenantID(r)
	ctx := r.Context()
	h.setCtx(ctx, tenantID)

	type TopItem struct {
		Name  string `json:"name"`
		Count int    `json:"count"`
		Rev   int64  `json:"revenue_cents"`
	}
	type Stats struct {
		TodayOrders  int       `json:"today_orders"`
		TodayRevenue int64     `json:"today_revenue_cents"`
		OpenOrders   int       `json:"open_orders"`
		TopItems     []TopItem `json:"top_items"`
	}
	var s Stats

	h.pool.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(total_cents),0) FROM pos_orders WHERE tenant_id=$1 AND created_at::date = CURRENT_DATE`, tenantID).Scan(&s.TodayOrders, &s.TodayRevenue)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM pos_orders WHERE tenant_id=$1 AND status='open'`, tenantID).Scan(&s.OpenOrders)

	rows, _ := h.pool.Query(ctx,
		`SELECT poi.item_name, COUNT(*) as cnt, SUM(poi.total_cents) as rev
		 FROM pos_order_items poi JOIN pos_orders po ON po.id = poi.order_id
		 WHERE poi.tenant_id=$1 AND po.created_at::date = CURRENT_DATE
		 GROUP BY poi.item_name ORDER BY cnt DESC LIMIT 10`, tenantID)
	defer rows.Close()
	for rows.Next() {
		var item TopItem
		rows.Scan(&item.Name, &item.Count, &item.Rev)
		s.TopItems = append(s.TopItems, item)
	}
	if s.TopItems == nil {
		s.TopItems = []TopItem{}
	}

	httputil.JSON(w, http.StatusOK, s)
}
