/**
 * SpriteImage — CSS sprite component for LUMO IP assets
 *
 * Uses background-image + background-size + background-position
 * to display a single frame from a sprite sheet.
 *
 * ip1-sprite: 1200×464, roughly 4 cols × 2 rows
 *   row 0: sleep(0,0) | love(1,0) | star(2,0) | think-hands(3,0)
 *   row 1: think(0,1) | angry(1,1) | cry(2,1) | happy(3,1)
 */

import React from "react";
import { cn } from "@/lib/utils";

export type SpriteSheet = "ip1" | "ip2";

const SPRITE_CONFIG: Record<
  SpriteSheet,
  { src: string; cols: number; rows: number; ratio: number }
> = {
  ip1: {
    src: "/brands/lumo-ip1-sprite.png",
    cols: 4,
    rows: 2,
    ratio: 300 / 232, // approximate cell aspect ratio (w/h)
  },
  ip2: {
    src: "/brands/lumo-ip2-sprite.png",
    cols: 4,
    rows: 2,
    ratio: 300 / 276,
  },
};

/** Map pose name to grid position (col, row) */
const IP1_POSES: Record<string, [number, number]> = {
  sleep: [0, 0],
  love: [1, 0],
  star: [2, 0],
  "think-hands": [3, 0],
  think: [0, 1],
  angry: [1, 1],
  cry: [2, 1],
  happy: [3, 1],
};

const IP2_POSES: Record<string, [number, number]> = {
  front: [0, 0],
  side: [1, 0],
  "three-quarter": [2, 0],
  wave: [3, 0],
  welcome: [0, 1],
  celebrate: [1, 1],
  point: [2, 1],
  surprise: [3, 1],
};

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
  const config = SPRITE_CONFIG[sheet];
  const poses = sheet === "ip1" ? IP1_POSES : IP2_POSES;
  const pos = poses[pose] || [0, 0];
  const [col, row] = pos;

  // Calculate background size and position
  // background-size: (cols * 100%) (rows * 100%) — zooms sprite so one cell fills container
  // background-position: (col / (cols-1) * 100%) (row / (rows-1) * 100%)
  const bgSizeW = config.cols * 100;
  const bgSizeH = config.rows * 100;
  const bgPosX = config.cols > 1 ? (col / (config.cols - 1)) * 100 : 0;
  const bgPosY = config.rows > 1 ? (row / (config.rows - 1)) * 100 : 0;

  return (
    <div
      className={cn("shrink-0 bg-no-repeat", className)}
      style={{
        width: size,
        height: size / config.ratio,
        backgroundImage: `url(${config.src})`,
        backgroundSize: `${bgSizeW}% ${bgSizeH}%`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
      }}
      role="img"
      aria-label={alt}
    />
  );
}

/** Empty state helper with subdued LUMO + text */
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
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
