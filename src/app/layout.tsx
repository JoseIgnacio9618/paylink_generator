import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Space_Grotesk, Syne } from "next/font/google";
import { ThemeBoot } from "@/components/theme-boot";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paylink Generator",
  description: "Genera links de pago con MONEI y controla su estado desde un panel propio.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get("theme")?.value;
  const initialTheme = storedTheme === "light" ? "light" : "dark";

  return (
    <html
      lang="es"
      data-theme={initialTheme}
      suppressHydrationWarning
      style={{ colorScheme: initialTheme }}
      className={`${spaceGrotesk.variable} ${syne.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeBoot />
        {children}
      </body>
    </html>
  );
}
