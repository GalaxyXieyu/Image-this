import { cn } from "@/lib/utils";

interface ConicSpinnerProps {
  size?: number;
  className?: string;
  showPulse?: boolean;
}

export function ConicSpinner({ size = 52, className, showPulse = true }: ConicSpinnerProps) {
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {showPulse && (
        <div
          className="absolute rounded-full bg-brand-soft"
          style={{
            inset: -Math.round(size * 0.15),
            animation: "pulseRing 1.8s ease-out infinite",
          }}
        />
      )}
      <div
        className="absolute inset-0 rounded-full animate-spin"
        style={{
          background:
            "conic-gradient(from 0deg, var(--brand), var(--brand-2), transparent 78%)",
          WebkitMask: "radial-gradient(closest-side, transparent 64%, #000 66%)",
          mask: "radial-gradient(closest-side, transparent 64%, #000 66%)",
          animationDuration: "1.1s",
        }}
      />
    </div>
  );
}
