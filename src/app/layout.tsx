import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legend Rentals — AR Command Center",
  description:
    "Accounts Receivable Automation Dashboard for Legend Rentals Dubai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fafafa] text-[#111]">
        {children}
      </body>
    </html>
  );
}
