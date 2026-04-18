/**
 * EditorSeo — auto-generates SEO meta tags (description, og:title, og:image, canonical)
 * from a template, and injects them into <head>. Cleans up on unmount/change.
 */
import { useEffect } from "react";

interface Props {
  title: string;
  description: string;
  image?: string | null;
  canonical: string;
  type?: string; // og:type — default "article"
}

const ensureTag = (selector: string, create: () => HTMLElement): HTMLElement => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
};

const setMeta = (name: string, content: string, isProperty = false) => {
  const attr = isProperty ? "property" : "name";
  const el = ensureTag(`meta[${attr}="${name}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(attr, name);
    return m;
  });
  el.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  const el = ensureTag('link[rel="canonical"]', () => {
    const l = document.createElement("link");
    l.setAttribute("rel", "canonical");
    return l;
  });
  el.setAttribute("href", href);
};

export const EditorSeo = ({ title, description, image, canonical, type = "article" }: Props) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", type, true);
    setMeta("og:url", canonical, true);
    if (image) setMeta("og:image", image, true);
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) setMeta("twitter:image", image);
    setCanonical(canonical);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, image, canonical, type]);

  return null;
};

export default EditorSeo;
