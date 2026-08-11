import type { Metadata } from "next";
import { Patrick_Hand, Nunito } from "next/font/google";
import "./globals.css";

const sketch = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sketch",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Doodle Dash — Draw & Guess",
  description:
    "Real-time multiplayer draw-and-guess game. Create a room, invite friends, and play!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sketch.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
