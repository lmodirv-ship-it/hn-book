import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { renderSvg, type SvgField } from "@/services/svgTemplateService";

export interface FieldStyle {
  fontFamily?: string;
  fontSize?: number;        // px (in SVG units)
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAnchor?: "start" | "middle" | "end";
  fill?: string;
  dx?: number;              // translate x
  dy?: number;              // translate y
}

interface Props {
  svg: string;
  fields: SvgField[];
  values: Record<string, string>;
  styles: Record<string, FieldStyle>;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  onDragEnd?: (key: string, dx: number, dy: number) => void;
  onEdit?: (key: string, value: string) => void;
  className?: string;
}

/**
 * Renders SVG with placeholders replaced AND per-field style overrides applied
 * post-render by matching each <text> element whose final textContent equals
 * the resolved field value. Adds drag, hover and selection.
 */
const StyledSvgRenderer = forwardRef<HTMLDivElement, Props>(function StyledSvgRenderer(
  { svg, fields, values, styles, selectedKey, onSelect, onDragEnd, onEdit, className },
  ref
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => wrapperRef.current as HTMLDivElement);

  const rendered = useMemo(() => renderSvg(svg || "", values), [svg, values]);

  // After render, walk the SVG to: tag fields, apply styles, attach drag handlers.
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const svgEl = root.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) return;

    // Make sure the SVG scales nicely.
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.display = "block";

    const texts = Array.from(svgEl.querySelectorAll("text")) as SVGTextElement[];

    // Match each text node to a field by comparing trimmed text content.
    const matched = new Map<SVGTextElement, string>();
    for (const f of fields) {
      if (f.type !== "text" && f.type !== "color") continue;
      const v = (values[f.key] ?? f.defaultValue ?? "").trim();
      if (!v) continue;
      const target = texts.find(
        (t) => !matched.has(t) && t.textContent?.trim() === v
      );
      if (target) matched.set(target, f.key);
    }

    // Apply styles + interaction to matched texts.
    matched.forEach((key, el) => {
      const s = styles[key] || {};
      el.style.cursor = "move";
      el.dataset.fieldKey = key;
      if (s.fontFamily) el.setAttribute("font-family", s.fontFamily);
      if (s.fontSize) el.setAttribute("font-size", String(s.fontSize));
      if (s.fontWeight) el.setAttribute("font-weight", s.fontWeight);
      if (s.fontStyle) el.setAttribute("font-style", s.fontStyle);
      if (s.textAnchor) el.setAttribute("text-anchor", s.textAnchor);
      if (s.fill) el.setAttribute("fill", s.fill);
      if (s.dx || s.dy) {
        el.setAttribute("transform", `translate(${s.dx || 0}, ${s.dy || 0})`);
      } else {
        el.removeAttribute("transform");
      }

      // Selection ring via CSS outline-equivalent (use stroke on a clone? simpler: filter)
      if (selectedKey === key) {
        el.style.filter = "drop-shadow(0 0 0 hsl(var(--primary))) drop-shadow(0 0 2px hsl(var(--primary)))";
      } else {
        el.style.filter = "";
      }
    });

    // Hover affordance for ALL matched fields.
    const onOver = (e: Event) => {
      const t = e.currentTarget as SVGTextElement;
      if (selectedKey !== t.dataset.fieldKey) {
        t.style.outline = "1px dashed hsl(var(--primary) / 0.6)";
      }
    };
    const onOut = (e: Event) => {
      const t = e.currentTarget as SVGTextElement;
      t.style.outline = "";
    };

    const cleanups: Array<() => void> = [];

    matched.forEach((key, el) => {
      const click = (e: MouseEvent) => {
        e.stopPropagation();
        onSelect?.(key);
      };
      el.addEventListener("click", click);
      el.addEventListener("mouseenter", onOver);
      el.addEventListener("mouseleave", onOut);

      // Drag with SVG coordinate conversion.
      let startX = 0;
      let startY = 0;
      let baseDx = 0;
      let baseDy = 0;
      let dragging = false;
      let scale = 1;

      const computeScale = () => {
        const vb = svgEl.viewBox.baseVal;
        const rect = svgEl.getBoundingClientRect();
        if (vb && vb.width && rect.width) scale = vb.width / rect.width;
        else scale = 1;
      };

      const onDown = (ev: PointerEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        dragging = true;
        computeScale();
        startX = ev.clientX;
        startY = ev.clientY;
        baseDx = styles[key]?.dx || 0;
        baseDy = styles[key]?.dy || 0;
        el.setPointerCapture(ev.pointerId);
        onSelect?.(key);
      };
      const onMove = (ev: PointerEvent) => {
        if (!dragging) return;
        const dx = baseDx + (ev.clientX - startX) * scale;
        const dy = baseDy + (ev.clientY - startY) * scale;
        el.setAttribute("transform", `translate(${dx}, ${dy})`);
      };
      const onUp = (ev: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        const dx = baseDx + (ev.clientX - startX) * scale;
        const dy = baseDy + (ev.clientY - startY) * scale;
        try { el.releasePointerCapture(ev.pointerId); } catch {}
        // Snap to 5-unit grid.
        const sdx = Math.round(dx / 5) * 5;
        const sdy = Math.round(dy / 5) * 5;
        onDragEnd?.(key, sdx, sdy);
      };

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);

      cleanups.push(() => {
        el.removeEventListener("click", click);
        el.removeEventListener("mouseenter", onOver);
        el.removeEventListener("mouseleave", onOut);
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
      });
    });

    // Click on empty area deselects.
    const bgClick = () => onSelect?.(null);
    svgEl.addEventListener("click", bgClick);
    cleanups.push(() => svgEl.removeEventListener("click", bgClick));

    return () => cleanups.forEach((c) => c());
  }, [rendered, fields, values, styles, selectedKey, onSelect, onDragEnd]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      // SVG is trusted (admin-uploaded); placeholders escaped in renderSvg.
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
});

export default StyledSvgRenderer;
