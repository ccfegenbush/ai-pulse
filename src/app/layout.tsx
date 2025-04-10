import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Leap",
  description: "Accelerate your AI learning journey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
