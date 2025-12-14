import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Source Library",
  description: "Digitizing and translating rare Hermetic, esoteric, and humanist texts for scholars, seekers, and AI systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
