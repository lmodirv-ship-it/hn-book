import { useRef, useEffect, useMemo } from "react";

export interface LayoutField {
  key: string;
  label: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  maxWidth: number;
}

export interface LayoutConfig {
  width: number;
  height: number;
  fields: LayoutField[];
}

interface CardPreviewProps {
  backgroundUrl: string;
  layoutConfig: LayoutConfig;
  userData: Record<string, string>;
  className?: string;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  width: 900,
  height: 500,
  fields: [
    { key: "name", label: "الاسم", x: 50, y: 180, fontSize: 28, fontWeight: "bold", color: "#ffffff", maxWidth: 400 },
    { key: "job_title", label: "الوظيفة", x: 50, y: 220, fontSize: 16, fontWeight: "normal", color: "#cccccc", maxWidth: 400 },
    { key: "company", label: "الشركة", x: 50, y: 260, fontSize: 14, fontWeight: "normal", color: "#cccccc", maxWidth: 400 },
    { key: "phone", label: "الهاتف", x: 50, y: 320, fontSize: 14, fontWeight: "normal", color: "#ffffff", maxWidth: 300 },
    { key: "email", label: "البريد", x: 50, y: 350, fontSize: 14, fontWeight: "normal", color: "#ffffff", maxWidth: 300 },
    { key: "address", label: "العنوان", x: 50, y: 380, fontSize: 12, fontWeight: "normal", color: "#aaaaaa", maxWidth: 400 },
  ],
};

/** Smart font-size: shrink if text overflows maxWidth */
function computeFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  baseFontSize: number,
  fontWeight: string,
  maxWidth: number,
  minFontSize = 8,
): number {
  let size = baseFontSize;
  while (size > minFontSize) {
    ctx.font = `${fontWeight} ${size}px "DM Sans", Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

const CardPreview = ({ backgroundUrl, layoutConfig, userData, className }: CardPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const layout = useMemo(() => {
    if (!layoutConfig?.fields?.length) return DEFAULT_LAYOUT;
    return layoutConfig;
  }, [layoutConfig]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = layout.width;
    canvas.height = layout.height;

    // Draw background
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      ctx.drawImage(imgRef.current, 0, 0, layout.width, layout.height);
    } else {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, layout.width, layout.height);
    }

    // Draw fields
    layout.fields.forEach((field) => {
      const value = userData[field.key] || "";
      if (!value) return;

      const fontSize = computeFontSize(ctx, value, field.fontSize, field.fontWeight, field.maxWidth);
      ctx.font = `${field.fontWeight} ${fontSize}px "DM Sans", Arial, sans-serif`;
      ctx.fillStyle = field.color;
      ctx.textBaseline = "top";

      // Word wrap
      const words = value.split(" ");
      let line = "";
      let y = field.y;
      const lineHeight = fontSize * 1.4;

      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > field.maxWidth && line) {
          ctx.fillText(line, field.x, y);
          line = word;
          y += lineHeight;
        } else {
          line = test;
        }
      });
      if (line) ctx.fillText(line, field.x, y);
    });
  };

  // Load background image
  useEffect(() => {
    if (!backgroundUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  // Re-draw when data changes
  useEffect(() => {
    draw();
  }, [userData, layout]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "auto", aspectRatio: `${layout.width}/${layout.height}` }}
    />
  );
};

export { CardPreview, DEFAULT_LAYOUT };
