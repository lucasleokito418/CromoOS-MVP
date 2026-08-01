import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-oswald",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kaboré OS",
  description: "Sistema de gestão para salões e estúdios de beleza",
  icons: {
    icon: "/icon-owl.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${oswald.variable} ${inter.variable}`}>
      <body className="font-inter antialiased bg-canvas text-text-primary">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
