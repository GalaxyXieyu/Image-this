import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import type { CSSProperties } from "react";
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

// 中文直接使用系统字体，避免为每个字重生成数百条 unicode-range 和字体分片。
// 保留原 CSS 变量名，现有 Tailwind/品牌字体声明无需同步迁移。
const systemCjkFontVariables = {
  "--font-noto-sans-sc": '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"',
  "--font-noto-serif-sc": '"Songti SC", STSong, SimSun',
} as CSSProperties;

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
        className={`${jakarta.variable} ${newsreader.variable} font-sans`}
        style={systemCjkFontVariables}
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
