"use client";

import { useState, useEffect } from "react";
import {
  listPOSCategories, createPOSCategory, listPOSItems, createPOSItem,
  createPOSOrder, getPOSOrder, chargePOSOrderToFolio, getPOSDashboard,
} from "@/lib/api";
import {
  Button, Card, CardContent, Input, Select, Textarea, StatusBadge,
  Modal, LoadingState, ErrorState, EmptyState, useToast,
} from "@/components/ui";
import { ShoppingCart, Plus, X, Loader2, CreditCard, BarChart3, Coffee, UtensilsCrossed } from "lucide-react";

const TENANT = "eden-hotel";

function formatCents(c) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format((c || 0) / 100);
}

export default function POSPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [catForm, setCatForm] = useState("");
  const [itemForm, setItemForm] = useState({ name: "", category_id: "", price_cents: 0, tax_rate: 18, description: "" });
  const [selectedCat, setSelectedCat] = useState("");
  const [orderType, setOrderType] = useState("dine_in");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [lastOrder, setLastOrder] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [catRes, itemRes, dashRes] = await Promise.all([
        listPOSCategories(TENANT),
        listPOSItems(TENANT, selectedCat || undefined),
        getPOSDashboard(TENANT),
      ]);
      setCategories(catRes.categories || []);
      setItems(itemRes.items || []);
      setDashboard(dashRes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedCat]);

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, unit_price_cents: item.price_cents, quantity: 1, notes: "" }];
    });
  }

  function updateCartQty(itemId, qty) {
    if (qty < 1) { setCart(prev => prev.filter(c => c.item_id !== itemId)); return; }
    setCart(prev => prev.map(c => c.item_id === itemId ? { ...c, quantity: qty } : c));
  }

  function cartTotal() {
    return cart.reduce((sum, c) => sum + c.unit_price_cents * c.quantity, 0);
  }

  async function handleCreateOrder() {
    if (cart.length === 0) { toast("Agrega items al carrito", "error"); return; }
    setSaving(true);
    try {
      const res = await createPOSOrder({
        order_type: orderType,
        room_number: roomNumber,
        guest_name: guestName,
        items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity, notes: c.notes })),
        created_by: "admin",
      }, TENANT);
      if (res.error) throw new Error(res.error.message);
      setLastOrder(res);
      setCart([]);
      toast("Orden #" + res.id.slice(0, 8) + " creada", "success");
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory() {
    if (!catForm) return;
    try {
      const res = await createPOSCategory({ name: catForm }, TENANT);
      if (res.error) throw new Error(res.error.message);
      toast("Categoria creada", "success");
      setShowNewCat(false);
      setCatForm("");
      load();
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleCreateItem() {
    if (!itemForm.name || !itemForm.category_id) { toast("Nombre y categoria requeridos", "error"); return; }
    try {
      const res = await createPOSItem({ ...itemForm, price_cents: Math.round(itemForm.price_cents * 100) }, TENANT);
      if (res.error) throw new Error(res.error.message);
      toast("Item creado", "success");
      setShowNewItem(false);
      load();
    } catch (e) { toast(e.message, "error"); }
  }

  async function handleCharge(orderId) {
    try {
      const res = await chargePOSOrderToFolio(orderId, { reservation_id: "21fa9c83-0e36-4c6e-b423-62de2028ee2f" }, TENANT);
      if (res.error) throw new Error(res.error.message);
      toast("Cobrado al folio: " + formatCents(res.amount_cents), "success");
      setLastOrder(null);
      load();
    } catch (e) { toast(e.message, "error"); }
  }

  if (loading) return <LoadingState message="Cargando POS..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Point of Sale</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewCat(true)}><Plus className="w-4 h-4 mr-1" />Categoria</Button>
          <Button variant="outline" size="sm" onClick={() => { setItemForm(f => ({ ...f, category_id: categories[0]?.id || "" })); setShowNewItem(true); }}><Plus className="w-4 h-4 mr-1" />Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ordenes Hoy</div><div className="text-2xl font-bold">{dashboard?.today_orders || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ingresos Hoy</div><div className="text-2xl font-bold">{formatCents(dashboard?.today_revenue_cents)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ordenes Abiertas</div><div className="text-2xl font-bold">{dashboard?.open_orders || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Items Top Hoy</div><div className="text-2xl font-bold">{dashboard?.top_items?.length || 0}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${!selectedCat ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/50"}`}
              onClick={() => setSelectedCat("")}
            >Todos</button>
            {categories.map(c => (
              <button
                key={c.id}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedCat === c.id ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/50"}`}
                onClick={() => setSelectedCat(c.id)}
              >{c.name}</button>
            ))}
          </div>

          {items.length === 0 ? (
            <EmptyState message="No hay items. Crea categorias y items primero." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map(item => (
                <button
                  key={item.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 text-left transition-all hover:shadow-sm"
                  onClick={() => addToCart(item)}
                >
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.category_name}</div>
                  <div className="text-sm font-semibold mt-2 text-primary">{formatCents(item.price_cents)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Carrito</h3>
                <span className="text-sm text-muted-foreground">{cart.length} items</span>
              </div>

              <div className="flex gap-2">
                <Select value={orderType} onChange={e => setOrderType(e.target.value)} className="flex-1">
                  <option value="dine_in">Mesa</option>
                  <option value="takeaway">Para llevar</option>
                  <option value="room_service">Room Service</option>
                  <option value="bar">Bar</option>
                </Select>
              </div>
              <Input placeholder="Habitacion (opcional)" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
              <Input placeholder="Nombre huesped (opcional)" value={guestName} onChange={e => setGuestName(e.target.value)} />

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin items</p>}
                {cart.map(c => (
                  <div key={c.item_id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-muted-foreground">{formatCents(c.unit_price_cents)}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button className="w-6 h-6 rounded border text-xs" onClick={() => updateCartQty(c.item_id, c.quantity - 1)}>-</button>
                      <span className="w-6 text-center text-sm">{c.quantity}</span>
                      <button className="w-6 h-6 rounded border text-xs" onClick={() => updateCartQty(c.item_id, c.quantity + 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCents(cartTotal())}</span>
                  </div>
                  <Button className="w-full" onClick={handleCreateOrder} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Crear Orden
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {lastOrder && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-medium">Ultima Orden</h3>
                <div className="text-sm">ID: #{lastOrder.id?.slice(0, 8)}</div>
                <div className="text-sm">Total: {formatCents(lastOrder.total_cents)}</div>
                <Button size="sm" className="w-full" onClick={() => handleCharge(lastOrder.id)}>
                  <CreditCard className="w-4 h-4 mr-1" />Cobrar al Folio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showNewCat} onClose={() => setShowNewCat(false)}>
        <div className="space-y-3">
          <h3 className="font-medium">Nueva Categoria</h3>
          <Input placeholder="Nombre" value={catForm} onChange={e => setCatForm(e.target.value)} />
          <Button onClick={handleCreateCategory}>Crear</Button>
        </div>
      </Modal>

      <Modal open={showNewItem} onClose={() => setShowNewItem(false)}>
        <div className="space-y-3">
          <h3 className="font-medium">Nuevo Item</h3>
          <Input placeholder="Nombre" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
          <Select value={itemForm.category_id} onChange={e => setItemForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">Seleccionar categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input placeholder="Precio (RD$)" type="number" step="0.01" value={itemForm.price_cents} onChange={e => setItemForm(f => ({ ...f, price_cents: parseFloat(e.target.value) || 0 }))} />
          <Input placeholder="Tax %" type="number" step="0.01" value={itemForm.tax_rate} onChange={e => setItemForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))} />
          <Textarea placeholder="Descripcion" value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Button onClick={handleCreateItem}>Crear Item</Button>
        </div>
      </Modal>
    </div>
  );
}
