import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {children}
      </body>
    </html>
  );
}
