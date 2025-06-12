// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import OffcanvasSidebar from "@/components/Sidebar";
import MUIProvider from '@/components/MUIProvider';
import ClientSplash from '@/components/ClientSplash'
 import LayoutSelector from '@/components/LayoutSelector';
import AppHeader from '@/components/AppHeader';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GFC Tracker",
  description: "نظام متابعة الطلبات التقنية",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* حمّل خط المرعي من Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        
<ClientSplash>
        <MUIProvider>
   <LayoutSelector>
          <main className="min-h-screen pt-4 px-4 md:px-8 lg:px-12">
            {children}
          </main>
          </LayoutSelector>
        <Toaster position="top-center" richColors />
                </MUIProvider>
        </ClientSplash>

      </body>
    </html>
  );
}
