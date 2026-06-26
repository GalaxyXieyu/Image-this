import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { DesktopUpdateProvider } from "@/components/providers/DesktopUpdateProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppShell } from "@/components/navigation/AppShell";
import FloatingTaskButton from "@/components/navigation/FloatingTaskButton";
import { Toaster } from "@/components/ui/toaster";
import { NextAuthProvider } from "@/providers/auth-provider";
import "./globals.css";

// 正文 / UI：Plus Jakarta Sans（设计规范第 1.3 节）
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

// 标题（h1/h2）：Newsreader 衬线，用于 Hero 大标题与大数字
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  weight: ["400", "500", "600", "700"],
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI 商品视觉工作台",
  description: "专业的 AI 商品图像处理平台，支持场景图生成、背景替换、智能扩图、高清放大等功能。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ImageThis",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${newsreader.variable} ${notoSansSC.variable} ${notoSerifSC.variable} font-sans`}
      >
        <ThemeProvider>
          <NextAuthProvider>
            <DesktopUpdateProvider>
              <AppShell>{children}</AppShell>
              <FloatingTaskButton />
              <Toaster />
            </DesktopUpdateProvider>
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
