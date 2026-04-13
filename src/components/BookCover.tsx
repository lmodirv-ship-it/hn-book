import { useMemo } from "react";
import hnLogo from "@/assets/hn-logo.jpeg";

interface BookCoverProps {
  title: string;
  category: string;
  index: number;
  className?: string;
}

const colorPalettes = [
  ["#1a1a2e", "#16213e", "#e94560", "#0f3460"],
  ["#2d132c", "#801336", "#c72c41", "#ee4540"],
  ["#0a3d62", "#3c6382", "#60a3bc", "#82ccdd"],
  ["#1B1464", "#2C3A47", "#3B3B98", "#6C5CE7"],
  ["#2C3333", "#395B64", "#A5C9CA", "#E7F6F2"],
  ["#1a1a2e", "#533483", "#e94560", "#0f3460"],
  ["#2b2d42", "#8d99ae", "#ef233c", "#d90429"],
  ["#003049", "#d62828", "#f77f00", "#fcbf49"],
  ["#264653", "#2a9d8f", "#e9c46a", "#f4a261"],
  ["#353535", "#3c6e71", "#ffffff", "#284b63"],
  ["#0b0c10", "#1f2833", "#66fcf1", "#45a29e"],
  ["#1b262c", "#0f4c75", "#3282b8", "#bbe1fa"],
  ["#2d2d2d", "#f0a500", "#cf7500", "#e8d5b7"],
  ["#1c1c1c", "#6b705c", "#a5a58d", "#b7b7a4"],
  ["#0d1b2a", "#1b263b", "#415a77", "#778da9"],
  ["#10002b", "#240046", "#7b2cbf", "#c77dff"],
  ["#03071e", "#370617", "#d00000", "#e85d04"],
  ["#1d3557", "#457b9d", "#a8dadc", "#e63946"],
  ["#2b2d42", "#333533", "#b7e4c7", "#52b788"],
  ["#212529", "#343a40", "#f8f9fa", "#dee2e6"],
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function splitTitle(title: string, maxCharsPerLine: number): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines.slice(0, 4);
}

const BookCover = ({ title, category, index, className = "" }: BookCoverProps) => {
  const palette = useMemo(() => colorPalettes[index % colorPalettes.length], [index]);
  const lines = useMemo(() => splitTitle(title, 16), [title]);
  const decorPattern = useMemo(() => Math.floor(seededRandom(index + 77) * 5), [index]);

  const [bgStart, bgEnd, accent, spine] = palette;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${bgStart}99 0%, ${bgEnd}99 100%)` }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[60%] h-[60%] rounded-full blur-[60px] opacity-20"
        style={{ background: accent }}
      />

      {/* 3D Book container */}
      <div
        className="relative transition-transform duration-700 ease-out group-hover:[transform:perspective(800px)_rotateY(-25deg)_rotateX(5deg)_scale(1.05)] group-hover:[filter:drop-shadow(12px_12px_20px_rgba(0,0,0,0.5))]"
        style={{
          width: "48%",
          height: "75%",
          transformStyle: "preserve-3d",
          transform: "perspective(800px) rotateY(-15deg) rotateX(3deg)",
          filter: "drop-shadow(8px 8px 16px rgba(0,0,0,0.4))",
        }}
      >
        {/* === SPINE (left side - 3D) === */}
        <div
          className="absolute top-0 bottom-0 left-0 origin-left"
          style={{
            width: "20px",
            transform: "rotateY(90deg) translateZ(0px) translateX(-10px)",
            transformStyle: "preserve-3d",
            background: `linear-gradient(180deg, ${spine}, ${spine}cc, ${spine})`,
            borderRadius: "2px 0 0 2px",
          }}
        >
          {/* Spine highlight */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)",
            }}
          />
        </div>

        {/* === PAGE EDGES (right side) === */}
        <div
          className="absolute top-[2%] bottom-[2%] right-[-3px]"
          style={{
            width: "6px",
            background: "linear-gradient(90deg, #e8e0d4, #f5f0e8, #e8e0d4)",
            borderRadius: "0 1px 1px 0",
            boxShadow: "1px 0 3px rgba(0,0,0,0.15)",
          }}
        />

        {/* === PAGE EDGES (bottom) === */}
        <div
          className="absolute bottom-[-3px] left-[3%] right-[3%]"
          style={{
            height: "5px",
            background: "linear-gradient(180deg, #e8e0d4, #f5f0e8, #e8e0d4)",
            borderRadius: "0 0 1px 1px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />

        {/* === FRONT COVER === */}
        <div
          className="absolute inset-0 rounded-r-sm overflow-hidden"
          style={{
            background: `linear-gradient(160deg, ${bgEnd} 0%, ${bgStart} 100%)`,
            boxShadow: `inset 0 0 40px rgba(0,0,0,0.15), inset 0 0 80px rgba(255,255,255,0.02)`,
            border: `1px solid rgba(255,255,255,0.1)`,
            borderLeft: `3px solid ${spine}`,
          }}
        >
          {/* Inner border frame */}
          <div
            className="absolute top-[6%] bottom-[6%] left-[10%] right-[8%] rounded-sm pointer-events-none"
            style={{
              border: `1px solid ${accent}25`,
            }}
          />

          {/* Decorative top accent */}
          {decorPattern === 0 && (
            <>
              <div className="absolute top-[9%] left-[14%] right-[12%] h-[2px]" style={{ background: `${accent}90` }} />
              <div className="absolute top-[11%] left-[22%] right-[20%] h-[1px]" style={{ background: `${accent}40` }} />
              <div className="absolute bottom-[9%] left-[14%] right-[12%] h-[2px]" style={{ background: `${accent}90` }} />
              <div className="absolute bottom-[11%] left-[22%] right-[20%] h-[1px]" style={{ background: `${accent}40` }} />
            </>
          )}
          {decorPattern === 1 && (
            <>
              <div className="absolute top-[7%] right-[10%] w-[28%] aspect-square rounded-full" style={{ border: `2px solid ${accent}35` }} />
              <div className="absolute bottom-[7%] left-[10%] w-[20%] aspect-square rounded-full" style={{ border: `1px solid ${accent}25` }} />
            </>
          )}
          {decorPattern === 2 && (
            <>
              <div className="absolute top-[7%] left-[14%] w-[20%] h-[2px]" style={{ background: accent }} />
              <div className="absolute top-[7%] right-[10%] w-[20%] h-[2px]" style={{ background: accent }} />
              <div className="absolute bottom-[7%] left-[50%] -translate-x-1/2 w-[30%] h-[1px]" style={{ background: `${accent}60` }} />
            </>
          )}
          {decorPattern === 3 && (
            <div className="absolute bottom-[8%] left-[18%] right-[16%] h-[20%] rounded-t-md" style={{ border: `1px solid ${accent}20`, borderBottom: "none" }} />
          )}
          {decorPattern === 4 && (
            <>
              <div className="absolute top-[8%] left-[50%] -translate-x-1/2 w-2 h-2 rotate-45" style={{ background: accent, opacity: 0.6 }} />
              <div className="absolute bottom-[8%] left-[50%] -translate-x-1/2 w-2 h-2 rotate-45" style={{ background: accent, opacity: 0.6 }} />
            </>
          )}

          {/* Title area */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[16%]">
            <div className="text-center">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className="font-bold leading-[1.2]"
                  style={{
                    color: "#fff",
                    fontSize: lines.length > 3 ? "0.5em" : lines.length > 2 ? "0.6em" : "0.7em",
                    textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                    letterSpacing: "0.03em",
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Accent divider */}
            <div className="mt-[8%] h-[2px] w-[45%] rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}60` }} />

            {/* Category */}
            <p
              className="mt-[6%] uppercase tracking-[0.2em] font-medium"
              style={{
                color: `${accent}cc`,
                fontSize: "0.3em",
              }}
            >
              {category}
            </p>
          </div>

          {/* Glossy reflection overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(125deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 30%, transparent 50%, rgba(0,0,0,0.05) 100%)",
            }}
          />

          {/* Edge highlight (left - near spine) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[8px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)",
            }}
          />
        </div>
      </div>

      {/* Floor reflection */}
      <div
        className="absolute bottom-0 left-[20%] right-[20%] h-[15%]"
        style={{
          background: `linear-gradient(to top, ${bgStart}80, transparent)`,
          filter: "blur(8px)",
        }}
      />
    </div>
  );
};

export default BookCover;
