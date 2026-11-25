import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ControlTrabajo",
    template: "%s · ControlTrabajo",
  },
  description:
    "Gestión ágil de proyectos para el desarrollo de videojuegos: tableros, hitos y documento de diseño.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#08090a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Modo oscuro por defecto: la clase `dark` es fija en <html>.
    <html
      lang="es"
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </AuthProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
