import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brands/SpriteImage";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-white">
      <section className="grid min-h-screen w-full bg-white md:grid-cols-[42%_58%]">
        <aside className="relative overflow-hidden bg-[#2f67ff] px-10 py-12 text-white lg:px-20">
          <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/10" />
          <div className="absolute bottom-[18%] right-[14%] h-28 w-28 rounded-full bg-white/12" />
          <div className="relative z-10 flex min-h-[calc(100vh-6rem)] flex-col justify-between gap-16">
            <Link href="/" className="inline-flex w-fit hover:opacity-90">
              <BrandLogo
                className="gap-3 text-white"
                iconClassName="h-8 w-8 rounded-lg bg-white/95 p-0.5"
                textClassName="text-base font-semibold text-white"
              />
            </Link>

            <div className="max-w-sm space-y-5 pb-10">
              <p className="text-sm font-medium text-white/78">{eyebrow}</p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight">{title}</h1>
              <p className="max-w-xs text-base leading-7 text-white/82">{description}</p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen items-center justify-center px-8 py-12 sm:px-16 lg:px-24">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
