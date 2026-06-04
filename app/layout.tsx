import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScopeDrop | Turn Client Chaos into Signed Contracts",
  description: "Paste any client message. Get a professional brief, scope of work, and payment terms in 60 seconds.",
  openGraph: {
    title: "ScopeDrop | Turn Client Chaos into Signed Contracts",
    description: "Paste any client message. Get a professional brief, scope of work, and payment terms in 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} dark`} style={{ scrollBehavior: "smooth" }}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <div className="ambient-bg" />
          {children}
          <div className="grain-overlay" aria-hidden="true" />
        </AuthProvider>
      </body>
    </html>
  );
}
