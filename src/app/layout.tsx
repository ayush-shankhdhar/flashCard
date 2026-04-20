import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "FlashForge — AI-Powered Flashcard Engine",
  description:
    "Turn any PDF into smart flashcards with spaced repetition. Powered by AI for deep, lasting learning.",
  keywords: ["flashcards", "spaced repetition", "PDF", "AI", "study", "learning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
