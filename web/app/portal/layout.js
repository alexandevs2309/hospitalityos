export const metadata = {
  title: "Portal del Huesped",
};

export default function PortalLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
