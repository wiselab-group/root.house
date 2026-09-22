# Product Refactor — Audit & Implementation Plan

> Phase 1 deliverable. Written before any implementation. Source of truth for
> what exists today, what changes, and in what order. Supersedes nothing in
> `docs/architecture.md` (domain/schema architecture) or `DESIGN.md`
> (tokens/motion) — this document is scoped to product/IA/UX only.

## A. Current Architecture (confirmed working, checks passing)

- Next.js 16 App Router, TypeScript strict, React 19, Drizzle + Neon,
  Auth.js v5 (database sessions), Tailwind + shadcn/ui, `@xyflow/react`,
  Vercel Blob, Vitest.
- `pnpm typecheck` — clean. `pnpm lint` — clean. `pnpm test` — 929/930 passing
  (1 pre-existing failure in `orthogonal-path.test.ts`, unrelated to this
  refactor — an edge-routing corner-rounding regression already present
  before this audit started; not touched here).
- `pnpm build` not run — no `DATABASE_URL` available in this environment,
  consistent with CLAUDE.md's documented constraint.
- Layered structure exactly as `docs/architecture.md` describes:
  `app/` (routes) → `actions/` (`auth()` → `requireFamilyAccess` →
  domain call → `revalidatePath`) → `domain/` (framework-free business
  logic) → `db/` (Drizzle schema). Spot-checked across 5 action files
  (person, event, place, and by extension the other 11) — **zero
  deviation** from the documented `auth → requireFamilyAccess → domain`
  shape.

The product has evolved substantially past what `PRODUCT.md` and
`docs/architecture.md` describe — both are stale in places (documented
`/search` route doesn't exist; roadmap says "Story + Place (минимально)"
but Place/Story/Media/Activity Log/Share Links/Albums are all
further along than "minimal"). This document reflects actual current state,
verified by reading the code, not the older docs.

## B. Current Routes

```
/                                          marketing landing page
/login, /register                          auth
/families                                  user's family list
/families/new                              create family
/families/[slug]                           Family Home (currently: link tiles)
/families/[slug]/tree                      family tree (@xyflow/react)
/families/[slug]/people                    people list (client-filter search)
/families/[slug]/people/new                create person
/families/[slug]/people/[personSlug]       person profile
/families/[slug]/people/[personSlug]/edit  edit person
/families/[slug]/events/[eventId]          event detail
/families/[slug]/events/[eventId]/edit     edit event
/families/[slug]/photos                    photo gallery + albums
/families/[slug]/photos/[albumId]          single album
/families/[slug]/places                    places list (flat, no map)
/families/[slug]/settings                  family settings, members, invites,
                                            share links, activity log
/invite/[token]                            invitation acceptance (outside app layout)
/share/[token]                             public read-only tree (via ShareLink)
/api/media/upload, /api/media/upload-document, /api/media/[mediaId]
/api/share/[token]/media/[mediaId]
```

No `/families/[slug]/search`, no `/families/[slug]/stories` — both
documented in `PRODUCT.md` but never built.

## C. Current Domain Model (unchanged by this refactor — see §I)

`Family → FamilyMember(role) → Person, Relationship(parent_child |
partnership), Event, EventParticipant, Place, Media(+join tables to
person/event/place/story), Album, Story(+join tables to person/event/place),
ShareLink, Invitation, ActivityLog`. Full ER detail in
`docs/architecture.md`. Notable facts directly relevant to this refactor:

- **`Place` is already geo-ready**: nullable `latitude`/`longitude`
  (numeric 9,6), `country`, `region`. Zero schema change needed to plot
  places on a map.
- **`Person.deathPlaceId` and `Person.deathCause` already exist** — the
  burial/cemetery use case (brief §10) is already representable as "a
  Place the person's `deathPlaceId` points to," no schema change needed.
  There is no dedicated "burial" event type or a `personId → cemetery
Place` relation distinct from `deathPlaceId`, which is sufficient for
  the stated use case (a cemetery is just a Place; death connects a
  Person to it).
- **`Event.placeId`, `Story.storyPlace`, `Media.mediaPlace`(via join
  table) already connect Place to the rest of the graph** — exactly the
  `Place → Event/Story/Media → Person` shape the brief asks for is
  already in the schema, just not surfaced in any UI.
- `search.service.ts` / `search.repository.ts` / `query-classifier.ts`
  exist (pg_trgm-backed fuzzy person search) but are **only wired to the
  tree's person-picker combobox**, not to any page-level search UI.
- `ActivityLog` (+ `activity-log-section.tsx`, already formats sentences
  like "Anna added 12 photos" in Russian past tense) exists and is
  **only rendered inside Settings** — a direct, low-risk reuse
  opportunity for Family Home.

## D. Current Access Control

`requireFamilyAccess(familyId, userId, minRole)` — single choke point,
called first in all 14 `actions/*.ts` files, confirmed via direct
inspection. Visibility (`privacyLevel: private|family|public`) is a
separate, orthogonal axis filtered in TS service functions
(`filterVisibleX`/`getVisibleX`), not in SQL. Known, documented gap:
`/tree` does not filter PRIVATE persons out of the graph (layout
invariants assume every node is present) — **out of scope for this
refactor**, pre-existing and separately tracked.

This refactor **adds no new routes that bypass this pattern** — Map and
Stories pages will follow the identical `auth() → requireFamilyAccess →
domain` shape as every existing route.

## E. Current Tree Implementation

Engine: `src/domain/tree/layout/` (custom recursive engine — see
CLAUDE.md's extensive documentation of its 9 invariants; **not touched by
this refactor**, per brief §21/§31/§8).

Visual treatment (confirmed via audit):

- Two selectable card styles (compact rounded-square photo frame /
  portrait full-bleed square photo) — already photo-forward, already
  serif heading for names, already no dot-grid canvas background (removed
  per prior work, see git log `165dc8a style(tree): remove dot-grid
background`).
- Sage identity ring / terracotta action ring already implemented per
  DESIGN.md's documented rules.
- Controls already consolidated into one `TreeToolsMenu` (git log
  `908e78f feat(tree): consolidate tools into one menu`), minimap already
  hidden on mobile/coarse pointers.
- Click → popover ("Посмотреть профиль" / "Сделать фокус-персоной"), not
  immediate navigation.

**Conclusion: the tree has already received most of the "make it feel
human, not a graph editor" visual pass this brief calls for in §8.** It is
materially ahead of Family Home, Places, and Stories. Remaining tree work
for this refactor is limited to: person-profile "tree context" mini-view
(currently absent — see §F) and linking Map ↔ Tree ↔ Person consistently.

## F. Current Person Profile

Already has: Hero (`PersonProfileHeader`), About (`Основная информация`

- description, conditionally rendered), Timeline (`PersonTimeline`,
  including auto-derived birth/marriage/death events per git log
  `cfbf962`), Family (`PersonFamilyPanel`), Media (`PersonMediaGallery`),
  Documents (`PersonDocuments`, a section beyond the brief's list), Stories
  (`PersonStories`, embedded-only).

**Missing** against the brief's ideal structure:

- **Places as its own section** — birth/death place currently appear only
  as two `InfoRow` values inside "Основная информация," not as a
  standalone section with a map preview or "places associated with this
  person" list.
- **Tree context** — no embedded mini-tree/ancestors-descendants visual
  on the profile; only way back to the tree is global nav.

This is a much smaller gap than the brief assumed — most of Phase 4 is
visual/hero polish plus these two additions, not a rebuild.

## G. Current Navigation — the actual biggest gap

**Desktop has no persistent section navigation at all.** `AppHeader` is
brand mark + breadcrumbs + account row only. Wayfinding between
Tree/People/Photos/Places/Settings on desktop depends entirely on
breadcrumbs (to go up) and the Family Home page's link tiles (to go
across) — there is no always-visible nav rail/bar. Mobile has an
expandable panel with the section list, which is closer to what desktop
needs but still not persistent (requires opening the hamburger every
time).

**Revised after a live attempt**: a persistent desktop nav row was built
and screenshotted, but the user rejected it on sight — it produced a
two-tier header (breadcrumbs in the top row, a second full-width nav row
underneath) that read as visually broken, and "Дом" duplicated what the
breadcrumb/brand-mark link already did. The user's explicit call: **no
persistent cross-section nav on desktop — Family Home stays the single
hub**, reached via the brand mark or breadcrumb, exactly as before this
phase. This reprioritizes §J below — treat it as reverted, not just
deferred, unless revisited with a concrete layout proposal the user signs
off on first (a mock/preview, not a live build-then-show).

## H. UX Problems (ranked, derived from A–G)

1. **No persistent desktop navigation** — biggest structural gap (§G).
2. **Family Home is a link launcher, not a home** — no recent
   memories/activity, no stats, no photo preview, no tree preview,
   despite the exact data (`ActivityLog`, `getPersonArchiveSummary`,
   gallery photos, `getFamilySummary`) already existing to power all of
   it server-side.
3. **Places has zero geographic experience** — flat text list, no map,
   despite the schema already being geo-ready. This is the single
   largest brief-to-reality gap (brief §9 asks for a major feature; today
   there is no map code and no map library in the repo at all).
4. **Stories has no home of its own** — domain-complete, UI-embedded-only
   inside person profiles, unreachable except through a person you
   already know has a story.
5. **Archive is photo-only** — `/photos` doesn't include video/audio/
   documents (documents exist only per-person via `PersonDocuments`), and
   has no cross-entity filters (by person/story/event/place/date) as
   brief §13 asks for.
6. **Person profile lacks Places section + Tree context** (§F) — smaller
   gap than assumed, but real.
7. **No map library** — must be introduced (brief §22 forbids
   Google Maps by default and asks for an abstraction layer).

## I. Proposed Information Architecture

Confirmed against brief §3: keep the same six-item shape, but reconcile
with what already exists so nothing existing gets silently orphaned.

```
Root House
├── Home              /families/[slug]                  (redesign)
├── Tree               /families/[slug]/tree             (unchanged engine, keep visual pass)
├── People              /families/[slug]/people           (light redesign — grid/list toggle)
│   └── [personSlug]                                     (add Places section + Tree context)
├── Stories             /families/[slug]/stories          (NEW top-level route)
│   └── [storySlug]                                       (NEW — story detail page)
├── Map                 /families/[slug]/map              (NEW — replaces "Места" as primary entry)
└── Archive              /families/[slug]/photos           (existing route KEPT — see below; conceptually promoted to "Archive")
```

**Deliberate deviations from the brief, justified by what already
exists:**

- **`/photos` stays at its current URL**, not renamed to `/archive`. The
  brief's IA section (§3) lists `/archive` conceptually, but brief §45
  ("if something conflicts with the actual repository architecture,
  choose the smallest safe migration") applies directly here: `/photos`
  is a live, working, deep-linked route (albums, lightbox, upload flow,
  drag-reorder) with real user data behind it. Renaming the URL buys
  nothing product-wise and risks breaking bookmarks/share links for zero
  functional gain. Instead: **extend `/photos` in place** to cover
  video/audio/document kinds and add filters, and relabel it "Архив" in
  navigation only (the nav label is decoupled from the URL segment
  already — see `family-nav-context.tsx`). This is the single largest
  intentional deviation from the literal brief and is called out here
  per brief §45's own instruction.
- **`/places` is kept as a route** (not deleted), but is no longer a
  primary nav item — it becomes an implementation detail reachable from
  Map (e.g., "manage places" from within Map, or folded into Map's own
  UI). Per brief §2 ("Do NOT unnecessarily delete or replace the Place
  database entity" — this applies to the route too, since editors still
  need a way to create/rename a Place directly, e.g. before geocoding
  data exists). Decision: **fold place management into the Map page**
  itself (a "list view" toggle within `/map`, backed by the same
  `listPlaces`/`CreatePlaceForm` already built) rather than keeping two
  separate routes with overlapping purpose. This avoids a redundant
  parallel surface.
- **Settings is already correctly secondary** (lives at
  `/families/[slug]/settings`, already not a top-level nav concept
  competing with Tree/People/etc. in the brief's intended sense — it's
  simply one of today's 5 flat nav items). No change needed structurally,
  only its position in the new persistent nav (moves from a peer nav
  item into the account/family menu, per brief §5).

## J. Proposed Navigation (REVISED — see §H item 1's update)

**Desktop — REJECTED, reverted.** A persistent nav row was built and
shown live; the user rejected the two-tier header layout and the
"Дом"/breadcrumb duplication. Current, final-for-now state: desktop has
**no persistent cross-section nav** — `AppHeader` stays brand mark +
breadcrumbs + account row only, matching pre-refactor behavior. Moving
between Tree/People/Archive/Places/Settings on desktop goes through
Family Home's link tiles, by design, not as an interim gap.

**Mobile** — unchanged from pre-refactor: the existing expand-in-place
panel (`MobileHeaderPanel`) keeps its five items (Дерево/Люди/Архив
[relabeled from Фото]/Места/Настройки), no "Дом" item added — same
reasoning as desktop, the brand mark already returns home.

If a persistent desktop nav is revisited later, the lesson from this
attempt: propose a concrete layout (mock/preview) for sign-off _before_
building it live, not after — see [[feedback memory to be written]].

## K. Proposed Domain Changes

**None required for Tree, People, Person Profile places section, or
Archive filters** — all backed by existing tables/services.

**For Stories as a first-class section:**

- No schema change. `story.service.ts`/`story.repository.ts` already
  support what's needed (title, body, privacyLevel, person/event/place
  joins). Add: `listStories(familyId)` + `filterVisibleStories` at
  family scope (today's service only fetches per-person) — this is a
  new **service function**, not a schema change, mirroring the existing
  `listPlaces`/`filterVisiblePersons` pattern exactly.
- Add `stories.slug` column (same pattern as `persons.slug` /
  `families.slug`, family-scoped unique) if `/stories/[storySlug]` is
  wanted for shareable URLs — **small, additive migration**, following
  the exact precedent already in the codebase (nullable → backfill →
  NOT NULL + unique index, per `docs/architecture.md`'s documented
  two-step pattern). Decide at Phase 6 kickoff whether slug or
  `[storyId]` is acceptable for v1; defer the migration until then.

**For Map:**

- No schema change — `Place.latitude/longitude` already nullable-ready,
  `Event.placeId`/`Story.storyPlace`/media-place joins already exist.
- New **domain module** `src/domain/place/map-projection.service.ts` (or
  similar) that assembles "meaningful markers" (brief §9) by querying
  existing services (`listPlaces`, events by place, persons by
  birth/death place, stories by place) and shaping them into a
  library-agnostic `MapMarker[]` — mirrors the existing
  `tree-adapter.ts` pattern (domain builds structure, a thin adapter
  under `components/map/` is the only place allowed to import the map
  library). This keeps the domain layer's "no next/react" and
  "library-agnostic" rules intact per CLAUDE.md.
- Privacy: marker assembly must run visibility filtering
  (`filterVisibleX`) exactly like every other view — a family-private
  person's birthplace pin must not appear if that person isn't visible to
  the current viewer. This is a **correctness requirement for Phase 7**,
  not optional polish (brief §40 flags this explicitly).

**For Archive (extending `/photos`):**

- No schema change — `Media.kind` already covers photo/video/audio/
  document; `PersonDocuments`/`getPersonDocuments` already exists at
  person scope. Add a family-scope equivalent
  (`getFamilyDocuments`/`getFamilyMediaByKind`) mirroring
  `getFamilyGallery`'s existing shape.

## L. Proposed Visual Direction

Tree and Person Profile are already close to brief §16's "premium
private family archive" direction (Lora serif headings, warm terracotta/
sage/brown token system, no dot-grid, no generic cards-everywhere on the
tree). Family Home, Places/Map, Archive, and (new) Stories are furthest
from it today (plain lists/grids, no editorial composition). Apply the
existing token system (`--primary`, `--tree-accent` stays tree-scoped
per CLAUDE.md, `--background`/`--foreground`/warm neutrals already in
`globals.css`) — **no new palette needed**, the brief's suggested hex
values in §16 are already superseded by the real, calibrated tokens in
DESIGN.md. Do not introduce the brief's literal hex codes; they predate
this codebase's actual (more carefully contrast-checked) token values.

## M. Map Technology Decision

No existing map code (`grep` across the repo for maplibre/leaflet/
mapbox/google-maps — zero matches). Recommendation: **MapLibre GL JS**
(not Leaflet, not Google Maps):

- No API key required for the OSS raster/vector tile path (unlike
  Mapbox GL or Google Maps), fits a self-hosted-feeling private family
  app.
- Actively maintained, good mobile perf, WebGL — smoother pan/zoom than
  Leaflet's DOM/Canvas rendering at the marker-clustering scale a family
  archive will plausibly reach (hundreds of places).
- Tile provider: use a no-signup raster source (e.g. OSM raster tiles)
  for v1 to avoid adding a new paid vendor dependency during this phase;
  document the swap point for a paid vector style later if the visual
  bar demands it.
- Wrapped behind `components/map/map-view.tsx` (`MapView`, `MapMarker`,
  `MapPopup` — brief §22's own suggested shape) — the only file allowed
  to import `maplibre-gl`, exactly mirroring `xyflow-adapter.ts`'s
  existing precedent for the tree. Dynamically imported
  (`next/dynamic`, `ssr: false`) since MapLibre needs `window`/canvas —
  keeps it off every route that isn't `/map`.

## N. Migration Strategy

No destructive migrations. All schema additions are additive
(new nullable columns / new tables), following the exact two-step
backfill pattern already established for `families.slug`/`persons.slug`.
No existing route is deleted. No existing component is deleted unless
directly superseded within the same phase (e.g., `PlacesList` is reused,
not replaced, when folded into Map's list view).

## O. Implementation Phases (adopting brief §26, reconciled with actual state)

1. ~~Audit~~ — this document.
2. Design system — mostly already done (DESIGN.md); this phase is
   "verify no new primitives needed," not "build from scratch." Likely
   needs only: a `MapMarker`/`MapPopup` primitive, a `StoryCard`
   primitive, and a persistent-nav component.
3. **Family Home** — redesign using already-existing data
   (`ActivityLog`, `getPersonArchiveSummary`, gallery, tree preview via
   existing `tree-adapter.ts`). No new domain work.
4. **Person Profile** — add Places section + Tree-context mini-view;
   otherwise visual/hero polish on already-complete sections.
5. **Tree visual pass** — smallest phase; already mostly done. Verify
   against brief checklist, close any remaining gaps only.
6. **Stories** — new `/stories` + `/stories/[slug]` routes, new
   `listStories` family-scope service function, optional slug migration.
7. **Map** — biggest net-new phase. MapLibre integration, marker
   projection service, privacy-filtered marker assembly, fold Places
   management into this page.
8. **Archive** — extend `/photos` to cover video/audio/document kinds +
   add person/story/event/place/date filters.
9. **Navigation/mobile polish** — persistent desktop nav, six-item
   mobile panel.
10. Tests + cleanup + regression — typecheck/lint/test/build gate before
    calling any phase done, per CLAUDE.md's existing rule.

## P. Risks

- **Map privacy leakage** (brief §40) — highest-severity risk in this
  plan. Marker assembly must reuse `filterVisibleX`, not bypass it for
  query convenience. Mitigated by treating this as a correctness
  requirement in Phase 7, not a follow-up.
- **`/photos` → "Archive" relabeling confusion** — nav label changes
  without a URL change; mitigate with a brief in-app cue (e.g. page
  `<h1>` says "Архив" even though the route is `/photos`) so it doesn't
  read as a bug.
- **New nav changes muscle memory** for any existing users — low risk
  pre-launch (brief states "Content Ready: no," implying no real family
  has onboarded yet per PRODUCT.md), but worth confirming with the user
  before removing the dashboard-tile-only navigation pattern.
- **MapLibre bundle weight** on a performance-budgeted app (brief §38,
  PRODUCT.md's 150KB JS budget) — mitigated by dynamic import, loaded
  only on `/map`.
- **Tree engine is explicitly off-limits** (brief §8/§21/§31) — any
  temptation to "improve" it further during Phase 5 beyond visual
  tweaks must be resisted; CLAUDE.md's extensive invariant documentation
  makes clear how much care went into the current engine.

## Q. What Should NOT Be Changed

- `src/domain/tree/layout/` — the layout engine itself (per CLAUDE.md,
  extremely deliberate, extensively battle-tested against real data).
- The `auth() → requireFamilyAccess → domain → revalidatePath` action
  pattern — universally consistent today, must stay that way for any
  new Stories/Map actions.
- `db.transaction()` avoidance (`neon-http` limitation) — any new
  atomic multi-table write (e.g., creating a Story + its join rows) must
  use the existing single-CTE-statement pattern, not introduce
  transactions.
- Existing `Place`/`Event`/`Media`/`Story` schema — additive only, per
  §K above.
- `@xyflow/react` usage boundary (`components/tree/` only) — the new
  `components/map/` boundary for MapLibre must follow the identical
  isolation rule.
- Existing tests — the 929 passing tests stay green; the 1 pre-existing
  failure (`orthogonal-path.test.ts`) is unrelated and untouched by this
  plan (flagged to the user separately, not silently left broken by this
  work).
