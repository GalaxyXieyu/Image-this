import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Noto_Sans_SC } from "next/font/google";
import { DesktopUpdateProvider } from "@/components/providers/DesktopUpdateProvider";
import FloatingTaskButton from "@/components/navigation/FloatingTaskButton";
import { Toaster } from "@/components/ui/toaster";
import { NextAuthProvider } from "@/providers/auth-provider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "700"],
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "AI 商品视觉工作台",
  description: "专业的 AI 商品图像处理平台，支持场景图生成、背景替换、智能扩图、高清放大等功能。",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${montserrat.variable} ${notoSansSC.variable} font-sans`}>
        <NextAuthProvider>
          <DesktopUpdateProvider>
            {children}
            <FloatingTaskButton />
            <Toaster />
          </DesktopUpdateProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
