import type { Metadata, Viewport } from "next";
import { Calistoga, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const calistoga = Calistoga({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-calistoga",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "레디스타트업 · 모의 클라우드펀딩 플랫폼",
  description: "레디스타트업 모의 클라우드펀딩 플랫폼 V2",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${calistoga.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#FAFAFA] text-[#0F172A] selection:bg-[#0052FF] selection:text-white antialiased relative">
        {children}
      </body>
    </html>
  );
}
