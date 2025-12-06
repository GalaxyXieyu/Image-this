import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextAuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import FloatingTaskButton from "@/components/navigation/FloatingTaskButton";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Imagine This - AI 图像处理平台",
  description: "专业的 AI 图像处理平台，支持背景替换、图像扩展、高清化等功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <NextAuthProvider>
          {children}
          <FloatingTaskButton />
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  );
}
