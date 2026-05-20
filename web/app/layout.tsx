import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AWS Learner — Book & Practice",
  description: "Học AWS từ cơ bản tới nâng cao: CLF-C02, SAA-C03 và nhiều khoá khác.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
