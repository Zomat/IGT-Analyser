import type { Metadata } from "next";
import { DM_Serif_Display, Lato } from "next/font/google";
import "./globals.css";

const fontBody = Lato({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

const fontHeading = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "IGT Analyzer",
  description: "Projekt badawczy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontBody.className} ${fontHeading.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
