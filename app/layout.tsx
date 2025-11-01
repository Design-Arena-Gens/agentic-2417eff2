import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TriConnectAI",
  description: "Real-Time Multi-Modal Translation Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
