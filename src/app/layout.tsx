import type { Metadata } from "next";
import { Sarabun, Inter } from "next/font/google";
import { ResetKeyListener } from "@/components/shared/ResetKeyListener";
import { MockModeBanner } from "@/components/shared/MockModeBanner";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MorDee+ · Thai Telemedicine",
  description:
    "MorDee+ — AI triage + teleconsult สำหรับผู้ป่วยและแพทย์ในประเทศไทย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${sarabun.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-ink">
        {/* `app-shell` is display:contents on screen (transparent to the body
            flex layout) but display:none in print, so only the portaled
            printable document (`.mordee-print-doc`) reaches the printout. */}
        <div className="app-shell">
          <ResetKeyListener />
          <MockModeBanner />
          {children}
        </div>
      </body>
    </html>
  );
}
