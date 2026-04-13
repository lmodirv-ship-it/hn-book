import { useMemo } from "react";

interface BookCoverProps {
  title: string;
  category: string;
  index: number;
  className?: string;
}

// Color palettes for book covers - each has [bg gradient start, bg gradient end, accent, spine]
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

// Split title into lines that fit nicely
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
  return lines.slice(0, 4); // Max 4 lines
}

const BookCover = ({ title, category, index, className = "" }: BookCoverProps) => {
  const palette = useMemo(() => colorPalettes[index % colorPalettes.length], [index]);
  const lines = useMemo(() => splitTitle(title, 18), [title]);
  const rotation = useMemo(() => (seededRandom(index + 50) * 6 - 3), [index]);
  const decorPattern = useMemo(() => Math.floor(seededRandom(index + 77) * 5), [index]);

  const [bgStart, bgEnd, accent, spine] = palette;

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${bgStart} 0%, ${bgEnd} 100%)` }}
    >
      {/* Subtle background pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`dots-${index}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${index})`} />
      </svg>

      {/* Book */}
      <div
        className="relative transition-transform duration-500 group-hover:scale-105"
        style={{
          width: "55%",
          height: "78%",
          transform: `rotate(${rotation}deg)`,
          perspective: "800px",
        }}
      >
        {/* Book shadow */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            background: "rgba(0,0,0,0.4)",
            filter: "blur(12px)",
            transform: "translateY(6px) translateX(4px)",
          }}
        />

        {/* Spine */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6%] rounded-l-sm z-10"
          style={{
            background: `linear-gradient(90deg, ${spine}, ${spine}dd)`,
            boxShadow: `inset -2px 0 4px rgba(0,0,0,0.3)`,
          }}
        />

        {/* Book body */}
        <div
          className="absolute inset-0 rounded-sm overflow-hidden"
          style={{
            background: `linear-gradient(160deg, ${bgEnd} 0%, ${bgStart} 100%)`,
            boxShadow: `4px 4px 15px rgba(0,0,0,0.4), inset 0 0 30px rgba(255,255,255,0.03)`,
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          {/* Page edges (right side) */}
          <div
            className="absolute right-0 top-[3%] bottom-[3%] w-[3px]"
            style={{
              background: "linear-gradient(180deg, #f5f0e8, #e8e0d4, #f5f0e8)",
              opacity: 0.6,
            }}
          />

          {/* Decorative elements based on pattern */}
          {decorPattern === 0 && (
            <>
              <div className="absolute top-[8%] left-[12%] right-[12%] h-[1px]" style={{ background: accent, opacity: 0.6 }} />
              <div className="absolute top-[10%] left-[20%] right-[20%] h-[1px]" style={{ background: accent, opacity: 0.3 }} />
              <div className="absolute bottom-[12%] left-[12%] right-[12%] h-[1px]" style={{ background: accent, opacity: 0.6 }} />
              <div className="absolute bottom-[14%] left-[20%] right-[20%] h-[1px]" style={{ background: accent, opacity: 0.3 }} />
            </>
          )}
          {decorPattern === 1 && (
            <div
              className="absolute top-[6%] right-[8%] w-[30%] h-[30%] rounded-full"
              style={{ border: `2px solid ${accent}40`, opacity: 0.5 }}
            />
          )}
          {decorPattern === 2 && (
            <>
              <div className="absolute top-[6%] left-[10%] w-[15%] h-[2px]" style={{ background: accent }} />
              <div className="absolute top-[6%] right-[10%] w-[15%] h-[2px]" style={{ background: accent }} />
            </>
          )}
          {decorPattern === 3 && (
            <div
              className="absolute bottom-[8%] left-[15%] right-[15%] h-[25%] rounded-t-lg"
              style={{ border: `1px solid ${accent}30`, borderBottom: "none" }}
            />
          )}
          {decorPattern === 4 && (
            <>
              <div className="absolute top-[8%] left-[50%] -translate-x-1/2 w-[4px] h-[4px] rounded-full" style={{ background: accent }} />
              <div className="absolute bottom-[10%] left-[50%] -translate-x-1/2 w-[4px] h-[4px] rounded-full" style={{ background: accent }} />
            </>
          )}

          {/* Title area */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[14%]">
            {/* Title */}
            <div className="text-center">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className="font-bold leading-tight"
                  style={{
                    color: "#fff",
                    fontSize: lines.length > 3 ? "0.55em" : lines.length > 2 ? "0.65em" : "0.75em",
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Accent line under title */}
            <div
              className="mt-[6%] h-[2px] w-[40%] rounded-full"
              style={{ background: accent }}
            />

            {/* Category */}
            <p
              className="mt-[5%] uppercase tracking-widest"
              style={{
                color: `${accent}cc`,
                fontSize: "0.35em",
                letterSpacing: "0.15em",
              }}
            >
              {category}
            </p>
          </div>

          {/* Subtle glossy reflection */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(130deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BookCover;
