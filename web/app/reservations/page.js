"use client";

import { useState } from "react";
import { createReservation, cancelReservation } from "@/lib/api";

export default function ReservationsPage() {
  const [form, setForm] = useState({
    reservationId: "",
    guestId: "",
    roomId: "",
    rateId: "",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    totalCents: 0,
    currency: "USD",
  });
  const [message, setMessage] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      const result = await createReservation(
        {
          reservation_id: form.reservationId,
          guest_id: form.guestId,
          room_id: form.roomId,
          rate_id: form.rateId,
          check_in: new Date(form.checkIn).toISOString(),
          check_out: new Date(form.checkOut).toISOString(),
          adults: Number(form.adults),
          children: Number(form.children),
          total_cents: Number(form.totalCents),
          currency: form.currency,
        },
        "default"
      );
      setMessage({ type: "success", text: `Reserva creada: ${result.id}` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleCancel() {
    setMessage(null);
    try {
      const result = await cancelReservation(form.reservationId, "default");
      setMessage({ type: "success", text: `Reserva cancelada` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <h1>Reservas</h1>

      {message && (
        <div
          style={{
            padding: "0.75rem",
            background: message.type === "error" ? "#fee" : "#efe",
            border: `1px solid ${message.type === "error" ? "#fcc" : "#cfc"}`,
            borderRadius: 6,
            marginBottom: "1rem",
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: "grid", gap: "0.75rem" }}>
        <input name="reservationId" placeholder="ID Reserva" value={form.reservationId} onChange={handleChange} required />
        <input name="guestId" placeholder="ID Huésped" value={form.guestId} onChange={handleChange} required />
        <input name="roomId" placeholder="ID Habitación" value={form.roomId} onChange={handleChange} required />
        <input name="rateId" placeholder="ID Tarifa" value={form.rateId} onChange={handleChange} required />
        <label>
          Check-in:
          <input type="date" name="checkIn" value={form.checkIn} onChange={handleChange} required />
        </label>
        <label>
          Check-out:
          <input type="date" name="checkOut" value={form.checkOut} onChange={handleChange} required />
        </label>
        <label>
          Adultos:
          <input type="number" name="adults" value={form.adults} onChange={handleChange} min="1" />
        </label>
        <label>
          Total (cents):
          <input type="number" name="totalCents" value={form.totalCents} onChange={handleChange} min="0" />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" style={{ padding: "0.5rem 1rem", background: "#0066cc", color: "white", border: "none", borderRadius: 4 }}>
            Crear Reserva
          </button>
          <button type="button" onClick={handleCancel} style={{ padding: "0.5rem 1rem", background: "#cc3300", color: "white", border: "none", borderRadius: 4 }}>
            Cancelar Reserva
          </button>
        </div>
      </form>
    </main>
  );
}
