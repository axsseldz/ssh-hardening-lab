import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auditoría de acceso remoto SSH",
  description:
    "Auditoría SSH en laboratorio local: ciclo atacar → defender → verificar. Red team vs Blue team.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
