import type { Metadata } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "RhymeForge — Kids Nursery Rhyme Video Creator",
  description: "AI-powered pipeline to create monetizable kids nursery rhyme YouTube videos",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} ${fredoka.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  );
}
