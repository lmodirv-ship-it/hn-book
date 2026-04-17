---
name: working-defaults
description: Auto-decision rules — never ask the user, always pick the production-ready option
type: preference
---

**Why:** User said "Stop asking decision questions. Always choose the most scalable, production-ready option."

**How to apply:** When facing an implementation choice, pick silently using these defaults:

- **Content loading** → Global ContentProvider with cache (never per-page fetches).
- **Permissions** → Role-based + granular permissions table (never store roles on profiles).
- **Existing features** → Extend, never rebuild. Refactor in place.
- **Heavy processing** → Async jobs/edge workers, never block UI threads.
- **Integrations** → Prefer server-side (edge functions, Lovable AI, Lovable Cloud) over third-party SaaS when feasible.
- **Performance** → Lazy-load, paginate, cache. Optimize UX by default.
- **PWA / mobile** → Installable manifest by default, no service worker unless offline is explicitly requested.
- **Database** → Use migrations, RLS on every table, security-definer functions for role checks.

Do NOT call `questions--ask_questions` for implementation decisions. Only ask when the user's request is genuinely ambiguous about *what* to build (not *how*).
