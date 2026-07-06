import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <h1>Hospitality OS</h1>
      <p>Sistema de gestión hotelera</p>

      <nav>
        <Link
          href="/reservations"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#0066cc",
            color: "white",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Gestionar Reservas
        </Link>
      </nav>
    </main>
  );
}
