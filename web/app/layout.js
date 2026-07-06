export const metadata = {
  title: "Hospitality OS",
  description: "Plataforma de gestión hotelera",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
