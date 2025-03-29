import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { NetworkProvider } from "@/components/NetworkStatus/NetworkProvider";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/ui/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Healthcare Communication Recorder",
  description: "Enterprise-grade dual audio capture system designed for healthcare professionals. Securely records and archives communication sessions with integrated system and microphone audio.",
  keywords: "healthcare, audio recorder, communication, medical records, dual audio, patient calls",
  authors: [{ name: "WatchRX" }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="system" storageKey="watchrx-theme">
          <NetworkProvider>
            <AuthProvider>
              <div className="relative min-h-screen flex flex-col bg-background text-foreground">
                {children}
                <Toaster richColors position="top-center" />
              </div>
            </AuthProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}