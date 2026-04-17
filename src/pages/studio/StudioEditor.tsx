/**
 * /studio/editor/:id — Studio editor entry.
 * Delegates to the existing TemplateEditor so the Studio uses the same editing
 * pipeline (and admin-managed templates) as the main app.
 */
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const TemplateEditor = lazy(() => import("@/pages/TemplateEditor"));

const StudioEditor = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }
  >
    <TemplateEditor />
  </Suspense>
);

export default StudioEditor;
