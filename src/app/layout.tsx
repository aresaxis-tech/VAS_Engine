import type { Metadata } from "next";
import { Mulish, Geist_Mono } from "next/font/google";
import "./globals.css";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICICI Lombard Intelligent VAS Engine",
  description: "Cyber Risk & IoT Risk Advisor - Futuristic Risk Assessment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${mulish.variable} ${geistMono.variable} antialiased min-h-screen relative`}
      >
        {/* Global Futuristic Background Effects */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-icici-blue)]/20 via-slate-950 to-slate-950 -z-10" />
        <div className="fixed top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 -z-10 pointer-events-none mix-blend-overlay"></div>
        <div className="fixed -top-40 -right-40 w-96 h-96 bg-[var(--color-icici-orange)]/20 rounded-full blur-3xl opacity-30 animate-pulse -z-10" />
        <div className="fixed -bottom-40 -left-40 w-96 h-96 bg-[var(--color-icici-blue)]/10 rounded-full blur-3xl opacity-30 animate-pulse -z-10" />

        <main className="relative z-10 flex flex-col min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
