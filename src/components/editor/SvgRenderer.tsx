import { useMemo, forwardRef } from "react";
import { renderSvg } from "@/services/svgTemplateService";

interface SvgRendererProps {
  svg: string;
  values: Record<string, string>;
  className?: string;
}

/** Renders an SVG string with {{placeholders}} replaced. Wrapped in a div so html-to-image can capture. */
const SvgRenderer = forwardRef<HTMLDivElement, SvgRendererProps>(({ svg, values, className }, ref) => {
  const rendered = useMemo(() => renderSvg(svg || "", values), [svg, values]);
  return (
    <div
      ref={ref}
      className={className}
      // SVG is trusted (uploaded by admin only); placeholders are escaped in renderSvg
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
});
SvgRenderer.displayName = "SvgRenderer";

export default SvgRenderer;
