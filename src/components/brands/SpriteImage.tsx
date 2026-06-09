"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SpriteSheet = "ip1" | "ip2";
export type Ip1Pose = "angry" | "cheer" | "cry" | "love" | "salute" | "sleep" | "star" | "think";
export type Ip2Pose =
  | "front"
  | "side"
  | "three-quarter"
  | "wave"
  | "welcome"
  | "celebrate"
  | "point"
  | "surprise";

function getIpPoseSrc(sheet: SpriteSheet, pose: string) {
  if (sheet === "ip1") {
    return `/brands/ip/lumo-core-${pose}.png`;
  }

  return `/brands/ip/lumo-helper-${pose}.png`;
}

interface SpriteImageProps {
  sheet: SpriteSheet;
  pose: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function SpriteImage({
  sheet,
  pose,
  size = 96,
  className,
  alt = "LUMO",
}: SpriteImageProps) {
  const src = getIpPoseSrc(sheet, pose);

  return (
    <img
      src={src}
      alt={alt}
      data-pose={pose}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function BrandLogo({ className, iconClassName, textClassName }: { className?: string; iconClassName?: string; textClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <img
        src="/brands/logo/imagethis-icon.png"
        alt="ImageThis"
        className={cn("h-8 w-8 shrink-0 rounded-lg object-contain", iconClassName)}
        draggable={false}
      />
      <span className={cn("text-body font-semibold text-foreground", textClassName)}>
        ImageThis
      </span>
    </span>
  );
}

export function BrandMascotImage({
  family = "ip1",
  pose = "think",
  size = 112,
  className,
  alt = "LUMO",
}: {
  family?: "ip1" | "ip2";
  pose?: Ip1Pose | Ip2Pose;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const src = getIpPoseSrc(family, pose);

  return (
    <img
      src={src}
      alt={alt}
      data-pose={pose}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function BrandImageFallback({
  title = "ImageThis",
  description,
  pose = "star",
  mascot = true,
  className,
}: {
  title?: string;
  description?: string;
  pose?: Ip1Pose;
  mascot?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-gradient-light", className)}>
      <div className="absolute left-6 top-6 h-20 w-20 rounded-full bg-white/80 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-[#BFDBFE]/35 blur-3xl" />
      <div className="absolute inset-x-8 bottom-5 h-px bg-gradient-to-r from-transparent via-[#BFDBFE] to-transparent" />
      <div className="relative z-10 flex flex-col items-center gap-2 px-4 text-center">
        {mascot ? (
          <BrandMascotImage family="ip1" pose={pose} size={68} className="opacity-70" />
        ) : (
          <div className="relative mb-1 h-16 w-24">
            <div className="absolute left-1 top-3 h-11 w-16 rounded-xl border border-[#D8E6EA] bg-white/85 shadow-sm" />
            <div className="absolute right-1 top-0 h-14 w-14 rounded-2xl border border-[#CFE3E7] bg-[#F7FBFC] shadow-sm" />
            <div className="absolute bottom-0 left-9 h-7 w-12 rounded-full bg-[#DDD6FE]/80" />
          </div>
        )}
        {title && <p className="text-data font-semibold text-foreground">{title}</p>}
        {description && <p className="max-w-48 text-caption text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function BrandEmptyState({
  pose = "think",
  title,
  description,
  action,
  className,
}: {
  pose?: Ip1Pose;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-brand-gradient-light px-8 py-10 text-center", className)}>
      <BrandMascotImage family="ip1" pose={pose} size={112} className="opacity-80" />
      <p className="text-body font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-data text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LumoEmptyState({
  pose,
  title,
  description,
  action,
  size = 120,
}: {
  pose: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <SpriteImage
        sheet="ip1"
        pose={pose}
        size={size}
        className="opacity-60"
      />
      <p className="text-body font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-data text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
