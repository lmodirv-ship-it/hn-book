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
  return lines.slice(0, 3);
}

const BookCover = ({ title, category, index, className = "" }: BookCoverProps) => {
  const palette = useMemo(() => colorPalettes[index % colorPalettes.length], [index]);
  const lines = useMemo(() => splitTitle(title, 16), [title]);
  const decorPattern = useMemo(() => Math.floor(seededRandom(index + 77) * 5), [index]);

  const [bgStart, bgEnd, accent, spine] = palette;

  // Background surfaces - realistic textures via Unsplash
  const backgrounds = useMemo(() => [
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop", // dark wood
    "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=600&h=400&fit=crop", // rusty metal
    "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=400&fit=crop", // green leaves
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&h=400&fit=crop", // purple gradient
    "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=400&fit=crop", // marble
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=400&fit=crop", // concrete
    "https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=600&h=400&fit=crop", // sand texture
    "https://images.unsplash.com/photo-1533035353720-f1c6a75cd8ab?w=600&h=400&fit=crop", // fabric
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&h=400&fit=crop", // gradient mesh
    "https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=600&h=400&fit=crop", // brick wall
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=400&fit=crop", // starry mountain
    "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600&h=400&fit=crop", // forest
    "https://images.unsplash.com/photo-1504610926078-a1611562d5fb?w=600&h=400&fit=crop", // ocean waves
    "https://images.unsplash.com/photo-1534312527009-56c7016453e6?w=600&h=400&fit=crop", // dark leather
    "https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=600&h=400&fit=crop", // steel
    "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=600&h=400&fit=crop", // neon lights
    "https://images.unsplash.com/photo-1557683311-eac922347aa1?w=600&h=400&fit=crop", // warm gradient
    "https://images.unsplash.com/photo-1476842634003-7dcca8f832de?w=600&h=400&fit=crop", // water drops
    "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=600&h=400&fit=crop", // autumn leaves
    "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=600&h=400&fit=crop", // dark clouds
  ], []);

  const bgImage = backgrounds[index % backgrounds.length];
  const textureSeed = useMemo(() => Math.floor(seededRandom(index + 33) * 360), [index]);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Real texture background */}
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Soft ambient light */}
      <div
        className="absolute w-[50%] h-[50%] rounded-full blur-[80px] opacity-15 top-[10%] left-[25%]"
        style={{ background: accent }}
      />

      {/* 3D Book wrapper */}
      <div
        className="relative transition-all duration-700 ease-out group-hover:[transform:perspective(900px)_rotateY(-30deg)_rotateX(5deg)_translateY(-4px)_scale(1.04)]"
        style={{
          width: "46%",
          height: "72%",
          transformStyle: "preserve-3d",
          transform: "perspective(900px) rotateY(-18deg) rotateX(4deg)",
          filter: "drop-shadow(10px 15px 25px rgba(0,0,0,0.6))",
        }}
      >
        {/* === SPINE === */}
        <div
          className="absolute top-0 bottom-0 left-0 origin-left"
          style={{
            width: "22px",
            transform: "rotateY(90deg) translateZ(0px) translateX(-11px)",
            transformStyle: "preserve-3d",
            background: `linear-gradient(180deg, ${spine}ee 0%, ${spine} 30%, ${spine}cc 70%, ${spine}ee 100%)`,
            borderRadius: "3px 0 0 3px",
          }}
        >
          {/* Spine ridges */}
          <div className="absolute inset-0" style={{
            background: `
              linear-gradient(90deg, rgba(255,255,255,0.12) 0%, transparent 30%, rgba(0,0,0,0.15) 100%),
              repeating-linear-gradient(180deg, transparent, transparent 20%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 21%)
            `,
          }} />
          {/* Spine text (vertical) */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <p className="text-white/40 font-semibold whitespace-nowrap" style={{
              fontSize: "5px",
              letterSpacing: "0.15em",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}>
              HN GROUPE
            </p>
          </div>
        </div>

        {/* === MULTIPLE PAGE EDGES (right) === */}
        {[0, 1, 2].map((i) => (
          <div
            key={`page-r-${i}`}
            className="absolute top-[2%] bottom-[2%]"
            style={{
              right: `${-4 - i * 2}px`,
              width: "2px",
              background: `linear-gradient(180deg, #f0ead6, #e6ddc8, #f0ead6)`,
              opacity: 1 - i * 0.2,
              borderRadius: "0 1px 1px 0",
            }}
          />
        ))}

        {/* === MULTIPLE PAGE EDGES (bottom) === */}
        {[0, 1, 2].map((i) => (
          <div
            key={`page-b-${i}`}
            className="absolute left-[4%] right-[4%]"
            style={{
              bottom: `${-4 - i * 2}px`,
              height: "2px",
              background: `linear-gradient(90deg, #f0ead6, #e6ddc8, #f0ead6)`,
              opacity: 1 - i * 0.2,
              borderRadius: "0 0 1px 1px",
            }}
          />
        ))}

        {/* === FRONT COVER === */}
        <div
          className="absolute inset-0 rounded-r-sm overflow-hidden"
          style={{
            background: `linear-gradient(155deg, ${bgEnd} 0%, ${bgStart} 60%, ${bgEnd}80 100%)`,
            boxShadow: `
              inset 0 0 60px rgba(0,0,0,0.2),
              inset 0 0 120px rgba(255,255,255,0.015),
              inset 2px 0 8px rgba(255,255,255,0.05)
            `,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderLeft: `4px solid ${spine}`,
          }}
        >
          {/* Faux leather/fabric texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' seed='${textureSeed}'/%3E%3C/filter%3E%3Crect width='6' height='6' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "100px 100px",
          }} />

          {/* Gold/accent inner frame - double border like real books */}
          <div
            className="absolute top-[5%] bottom-[5%] left-[8%] right-[6%] rounded-[2px] pointer-events-none"
            style={{ border: `1.5px solid ${accent}30` }}
          />
          <div
            className="absolute top-[7%] bottom-[7%] left-[10%] right-[8%] rounded-[1px] pointer-events-none"
            style={{ border: `0.5px solid ${accent}18` }}
          />

          {/* Corner ornaments */}
          {[[7, 10], [7, null], [null, 10], [null, null]].map(([top, left], ci) => (
            <div
              key={ci}
              className="absolute w-[12px] h-[12px] pointer-events-none"
              style={{
                top: top !== null ? `${top}%` : "auto",
                bottom: top === null ? "7%" : "auto",
                left: left !== null ? `${left}%` : "auto",
                right: left === null ? "8%" : "auto",
                borderTop: top !== null ? `1.5px solid ${accent}40` : "none",
                borderBottom: top === null ? `1.5px solid ${accent}40` : "none",
                borderLeft: left !== null ? `1.5px solid ${accent}40` : "none",
                borderRight: left === null ? `1.5px solid ${accent}40` : "none",
              }}
            />
          ))}

          {/* Decorative patterns */}
          {decorPattern === 0 && (
            <>
              <div className="absolute top-[12%] left-[14%] right-[12%] h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />
              <div className="absolute top-[13.5%] left-[20%] right-[18%] h-[0.5px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />
            </>
          )}
          {decorPattern === 1 && (
            <div className="absolute top-[10%] right-[10%] w-[22%] aspect-square rounded-full" style={{ border: `1px solid ${accent}25` }} />
          )}
          {decorPattern === 2 && (
            <>
              <div className="absolute top-[10%] left-[14%] w-[16%] h-[1.5px]" style={{ background: `${accent}70` }} />
              <div className="absolute top-[10%] right-[10%] w-[16%] h-[1.5px]" style={{ background: `${accent}70` }} />
            </>
          )}

          {/* === CONTENT AREA === */}
          <div className="absolute inset-0 flex flex-col items-center justify-between py-[10%] px-[12%]">

            {/* Logo at top */}
            <div className="flex-shrink-0">
              <img
                src={hnLogo}
                alt="HN Groupe"
                className="w-[32px] h-[32px] rounded-full object-cover"
                style={{
                  boxShadow: `0 2px 10px rgba(0,0,0,0.5), 0 0 12px ${accent}30`,
                  border: `1.5px solid ${accent}45`,
                }}
              />
            </div>

            {/* Title centered */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="text-center">
                {lines.map((line, i) => (
                  <p
                    key={i}
                    className="font-bold leading-[1.25]"
                    style={{
                      color: "#ffffffee",
                      fontSize: lines.length > 2 ? "0.55em" : "0.65em",
                      textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                      letterSpacing: "0.04em",
                      fontFamily: "'Georgia', 'Times New Roman', serif",
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>

              {/* Accent divider */}
              <div className="mt-[8%] w-[50%] flex items-center gap-[4px]">
                <div className="flex-1 h-[0.5px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}80)` }} />
                <div className="w-[4px] h-[4px] rotate-45" style={{ background: `${accent}90` }} />
                <div className="flex-1 h-[0.5px]" style={{ background: `linear-gradient(270deg, transparent, ${accent}80)` }} />
              </div>

              {/* Category */}
              <p
                className="mt-[5%] uppercase tracking-[0.18em] font-medium"
                style={{
                  color: `${accent}aa`,
                  fontSize: "0.28em",
                  fontFamily: "'Georgia', serif",
                }}
              >
                {category}
              </p>
            </div>

            {/* Bottom: "من إنتاج HN Groupe" */}
            <div className="flex-shrink-0 text-center">
              <p
                className="uppercase tracking-[0.12em]"
                style={{
                  color: `${accent}70`,
                  fontSize: "0.22em",
                  fontFamily: "'Georgia', serif",
                  letterSpacing: "0.1em",
                }}
              >
                من إنتاج HN Groupe
              </p>
            </div>
          </div>

          {/* Glossy reflection */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 25%, transparent 45%, rgba(0,0,0,0.04) 100%)`,
            }}
          />

          {/* Edge highlight near spine */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[10px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)",
            }}
          />

          {/* Bottom edge shadow */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.15), transparent)",
            }}
          />
        </div>
      </div>

      {/* Shadow on surface */}
      <div
        className="absolute bottom-[8%] left-[22%] right-[18%] h-[6px] rounded-full"
        style={{
          background: "rgba(0,0,0,0.35)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
};

export default BookCover;
