---
name: working-defaults
description: Auto-decision rules and senior-architect defaults for the HN SaaS platform
type: preference
---

**Why:** User wants HN built as a long-term, scalable, production-grade SaaS — not an MVP. Act as senior system architect, make best technical decisions automatically, never ask multiple-choice questions.

**How to apply:** When facing an implementation choice, pick silently using these defaults:

## Architecture
- **Independence**: Never rely on external builders (Canva, etc.). Build native equivalents.
- **Multi-tenant ready**: Design schemas/services so a `tenant_id` can be added later without rewrites.
- **Modular & extensible**: Templates, assets, orders, pricing, APIs must all be pluggable/extensible.
- **Extend, never rebuild** working systems. Refactor in place.

## Data & Permissions
- **Content loading** → Global ContentProvider with cache (never per-page fetches).
- **Permissions** → Role-based (`user_roles` table) + granular per-user overrides via `has_permission()`. Never store roles on profiles.
- **CMS** → All public content editable from admin (`cms_content`, `page_customizations`).
- **Database** → Migrations only. RLS on every table. Security-definer functions for role checks.

## Processing
- **Heavy work** → Async jobs / edge workers / `upload_jobs` queue. Never block UI.
- **File conversions** (EPS→SVG, PDF gen, image optimization) → Server-side edge functions, self-hosted preferred.
- **AI** → Lovable AI Gateway first (no key needed). Third-party only if Lovable AI can't deliver.

## Admin Control
- Everything configurable from admin dashboard: API keys (`api_integrations`), pricing rules, feature flags (`feature_flags`), integrations, CMS, permissions.
- New features must ship with their admin management UI.

## Performance & UX
- Lazy-load, paginate, cache aggressively.
- Code-split heavy routes.
- Smooth animations, 44x44px touch targets, mobile-first.
- Installable PWA by default; service worker only when offline is explicitly requested.

## Decision Rules
- Do NOT call `questions--ask_questions` for implementation decisions.
- Only ask when a request is genuinely ambiguous about *what* to build, or when critical info (API key, business logic) is missing.
- Default to the most scalable, production-ready, server-based option.
