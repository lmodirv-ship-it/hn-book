import { useMemo } from "react";

interface FuturisticBackgroundProps {
  particles?: number;
  showGrid?: boolean;
  className?: string;
}

/**
 * Layered futuristic background:
 * - Aurora drifting clouds
 * - Animated grid floor
 * - Rising particles
 * Pure CSS — no JS animation cost.
 */
const FuturisticBackground = ({
  particles = 24,
  showGrid = true,
  className = "",
}: FuturisticBackgroundProps) => {
  const dots = useMemo(
    () =>
      Array.from({ length: particles }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 12}s`,
        duration: `${10 + Math.random() * 14}s`,
        size: 1 + Math.random() * 3,
      })),
    [particles]
  );

  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div className="aurora-bg" />
      {showGrid && <div className="grid-floor" />}
      <div className="particles-bg">
        {dots.map((d, i) => (
          <span
            key={i}
            style={{
              left: d.left,
              animationDelay: d.delay,
              animationDuration: d.duration,
              width: d.size,
              height: d.size,
            }}
          />
        ))}
      </div>
      {/* Bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default FuturisticBackground;
