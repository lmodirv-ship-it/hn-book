

## Problem
The `BooksPage` fetches 1000 books in a single request from a database of 4069 books. This causes a long "جاري التحميل..." wait with no visual feedback.

## Plan

### 1. Reduce initial fetch to 24 books
- Change `ITEMS_PER_PAGE` from 60 to 24
- Fetch only 24 books initially via `bookService.getAll({ limit: 24 })`
- On "Load More" click, fetch the next batch (offset-based) and append to existing list

### 2. Replace spinner with Skeleton grid
- While loading, show a grid of 12 skeleton cards matching the `ProductCard` layout (aspect-[4/5] image placeholder + text lines)
- Uses the existing `Skeleton` component from `src/components/ui/skeleton.tsx`
- Show skeletons both on initial load AND when loading more (append skeleton cards at bottom)

### 3. Add `loading="lazy"` to images
- Already present on `ProductCard` line 49 — confirmed, no change needed

### 4. Adjust data fetching strategy
- Instead of loading all books into `allProducts` and filtering client-side, keep the current approach but with smaller batches
- Since language/category filtering happens client-side using `CATEGORY_LANG_MAP`, we still need all data for accurate counts — **compromise**: fetch first 24 for instant display, then background-fetch the rest for counts
- Alternative (simpler): keep client-side filtering but paginate the visible list, fetching in chunks of 24 as user scrolls/clicks "Load More"

**Chosen approach**: Two-phase loading:
- Phase 1: Fetch 24 books immediately → display them → `setLoading(false)`
- Phase 2: Background-fetch remaining books in batches of 200 for category counts and filtering (non-blocking, user already sees content)

### 5. Files to modify

| File | Change |
|------|--------|
| `src/pages/BooksPage.tsx` | Two-phase fetch, skeleton grid, reduce ITEMS_PER_PAGE to 24 |
| `src/services/bookService.ts` | Already supports `limit`/`offset` — no change needed |

### Technical details

**Skeleton card component** (inline in BooksPage):
```text
┌──────────────┐
│  ████████████ │  ← aspect-[4/5] skeleton
│  ████████████ │
│  ████████████ │
│              │
│  ███████     │  ← category line
│  █████████████│  ← title line
│  ████████     │  ← description line
│  ███   ██████ │  ← price + code
└──────────────┘
```

**Two-phase fetch logic**:
```
Phase 1: bookService.getAll({ limit: 24 }) → show immediately
Phase 2: bookService.getAll({ limit: 1000, offset: 24 }) → append silently
```

No design changes. No new features. Performance only.

