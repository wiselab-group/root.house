---
target: семейное дерево (src/components/tree/ + families/[slug]/tree route)
total_score: 27
p0_count: 1
p1_count: 2
timestamp: 2026-09-14T15-17-02Z
slug: src-app-families-slug-tree
---

Method: dual-agent (A: design review sub-agent · B: detector/evidence sub-agent)

⚠️ **Scope note**: browser visualization was unavailable (auth-gated route, no test credentials — user confirmed code-only review). Both assessments are code-only; no live screenshots exist. Findings that would normally be visually confirmed are marked as inferred from code.

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                          |
| --------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3/4       | No visible loading state for initial layout compute or a failed trace search                       |
| 2         | Match System / Real World       | 3/4       | "Relationship Trace" uses a road/route icon — GPS metaphor, not genealogy                          |
| 3         | User Control and Freedom        | 3/4       | "Сделать фокус-персоной" silently writes a persistent DB default, no confirm/undo                  |
| 4         | Consistency and Standards       | 3/4       | Compact card style has no hover state; portrait does — spec (DESIGN.md) matches neither            |
| 5         | Error Prevention                | 2/4       | Same silent-default-write issue; no confirmation before a persistent mutation                      |
| 6         | Recognition Rather Than Recall  | 3/4       | Collapse badge states ("+N" vs "−") only labeled on hover/screen reader, not visually              |
| 7         | Flexibility and Efficiency      | 3/4       | No keyboard shortcuts documented; no quick "find person" outside the Trace panel                   |
| 8         | Aesthetic and Minimalist Design | 3/4       | Disciplined 3-hue system, but cards carry thin info (no relationship label, child count)           |
| 9         | Error Recovery                  | 2/4       | Good route-level error.tsx; but broken photo load and failed trace search have no visible handling |
| 10        | Help and Documentation          | 2/4       | Icon titles exist, but no onboarding/coachmark for a first-time non-technical user                 |
| **Total** |                                 | **27/40** | **Acceptable — solid foundation, real gaps in error-recovery and casual-click safety**             |

## Anti-Patterns Verdict

**LLM assessment**: Not AI slop in the generic sense — the codebase is unusually deliberate (documented divorce-mark genogram notation, a real sage/terracotta/brown semantic split with explicit "never mix" rules, hard-won trace-line occlusion logic backed by real user-testing comments). The one place it slips toward "engineering tool wearing a skin" is the XYFlow canvas chrome itself: a dotted background grid (`gap={24}`), a MiniMap, and a Controls cluster — all stock React Flow furniture, minimally reskinned. That's the single biggest risk to CLAUDE.md's own stated goal ("пользователь должен видеть «вот моя семья», а не «вот база данных Person entities»").

**Deterministic scan**: `detect.mjs` returned a clean `[]` (exit 0) — expected, since it targets marketing/landing-page anti-patterns (gradient text, side-stripes, hero-metric templates) that don't apply to a canvas tool. Not meaningful signal either way here.

**Independent quantitative evidence (Assessment B)**, scanning 28 files / 4,552 lines in `src/components/tree/` + the tree route:

- **Zero** raw hex colors, **zero** `console.log`, **zero** `any` types, **zero** `@xyflow/react` imports outside `src/components/tree/` — all explicit CLAUDE.md FORBIDDEN rules hold with no exceptions.
- All 7 inline `style={{...}}` occurrences are genuinely dynamic (SVG edge geometry XYFlow requires as props/inline styles, all using `var(--...)` tokens) — correctly falls under CLAUDE.md's own "dynamic computed values" exception, not a violation.
- **9 of 15 `.tsx` components exceed the 150-line cap** — `relationship-edge.tsx` (753 lines, 5× the limit) and `tree-canvas.tsx` (544 lines, 3.6×) are the standouts. CLAUDE.md's own domain notes justify `relationship-edge.tsx`'s complexity at length (divorce marks, trace occlusion, straddle logic from real bug fixes) — the reasoning may be sound, but the literal rule is still violated by exact count.
- **Zero** `focus-visible`, **zero** `tabIndex`, **zero** `onKeyDown` anywhere in the 28 files, despite CLAUDE.md itself describing a "keyboard-selected карточка" (`isSelected`) as a real feature. Could be fully covered by XYFlow's native node keyboard-nav — Assessment B could not confirm either way from static grep alone.
- `prefers-reduced-motion`: full compliance — the one JS-driven animation call site (`tree-canvas.tsx:100`, focus-switch `setCenter`) correctly branches on the hook, and the CSS blanket rule in `globals.css` covers everything else.
- The collapse/expand toggle announces state only via a changing `aria-label` string, never `aria-expanded` — a partial (not absent) accessibility mitigation for a real disclosure-widget pattern.

Where the two assessments converge, it's a strong signal: **both independently flagged the accessible-name gap on interactive cards** — Assessment A found the card frame itself carries no `aria-label` (screen-reader users get an unnamed interactive element), Assessment B independently found zero `focus-visible`/`tabIndex` coverage app-level. Together these paint a consistent picture: individual pieces (icon titles, some aria-labels) are attentively done, but the canvas-as-a-whole's accessibility story has real, unverified gaps.

## Overall Impression

This is a genuinely well-crafted feature at the component level — the color system, the divorce-mark notation, the client-side refocus mechanics all show real design iteration against real user feedback (the CLAUDE.md history itself proves this). The gap isn't craft, it's two specific things: (1) a silent, unconfirmed database write sitting one tap away from a harmless action in the exact same menu, and (2) the canvas chrome (dotted grid, minimap, XYFlow default controls) undercutting the "family archive, not a database" tone the cards themselves work hard to establish. Both are fixable without a redesign.

## What's Working

1. **The divorce-mark/trace-occlusion engineering** (`relationship-edge.tsx`) — genogram-accurate `//` notation, straddle logic to avoid the collapse badge eating the mark, and an explicit "we tried cutting the path, user said it looked broken, don't redo that" comment. Real iterative craft, not guesswork.
2. **The sage/terracotta/brown semantic color split** — disciplined, documented, cross-referenced, with a deliberate exception (focus person stays sage even mid-trace) that shows the team understands what each color _means_, not just where it looks good.
3. **Client-side refocus via `buildClientTreeLayout`** — instant focus-switching with URL/back-button support, a meaningfully better UX than the full-reload approach most teams ship first.

## Priority Issues

**[P0] Silent, permanent side effect on a casual click**
Why it matters: "Сделать фокус-персоной" in the card popover fires a persistent DB write (`updateDefaultFocusPersonAction`) with zero confirmation or toast, sitting next to the completely harmless "Посмотреть профиль" in the same two-item menu. A non-technical user (this product's explicit target: a family member across age ranges, "grandma looking at photos") can trivially mis-tap this and silently repoint their saved tree entry point — discoverable later only as "why does my tree open somewhere different now."
Fix: Add a toast with undo ("Дерево теперь открывается с фокусом на Иван Иванов" + отменить), or split ephemeral "recenter this session" (current click behavior minus the DB write) from an explicit "Сделать эту персону фокусом по умолчанию" surfaced separately (e.g. Family Settings, where this setting conceptually belongs).
Suggested command: `/impeccable harden` (error/edge-case + confirmation-flow hardening)

**[P1] Interactive card has no accessible name**
Why it matters: Both assessments independently converged on this. The card frame (`person-node.tsx`, a `div` wrapped as `PopoverTrigger`) carries no `aria-label`; avatars are correctly `alt=""` (decorative, name renders as visible text) but nothing labels the card itself. Combined with zero `focus-visible`/`tabIndex` app-level code across all 28 files, a screen-reader or keyboard-only user's path through this canvas is unverified and likely broken, in a product whose target audience spans accessibility needs.
Fix: Add `aria-label={personLabel(data)}` (already computed) to the card frame; confirm whether XYFlow's native keyboard nav actually covers arrow-key/tab traversal, and if not, add it explicitly.
Suggested command: `/impeccable audit` (accessibility-focused technical pass)

**[P1] Documentation drift — DESIGN.md contradicts the shipped code and CLAUDE.md on two tree-specific points**
Why it matters: DESIGN.md still documents generation color-coding (a colored top stripe per generation) that CLAUDE.md explicitly says was tried and removed. DESIGN.md also documents a 768px "mobile focus-view" breakpoint switch that doesn't exist anywhere in the code — mobile gets the same pan/zoom canvas with only control-sizing variants. This is exactly the kind of invariant rot CLAUDE.md itself warns against, and it means someone reading DESIGN.md today gets actively wrong information about the mobile experience.
Fix: Reconcile DESIGN.md with reality, or if the mobile focus-view was a real intended feature that got dropped, treat it as a genuine product gap (see Casey persona below) rather than documentation noise.
Suggested command: `/impeccable document` (regenerate DESIGN.md from actual code)

**[P2] Compact card style (the default) has zero hover state**
Why it matters: `buildCardFrameClassName` only applies `hover:shadow-md` in the non-compact branch — compact cards (the default per `use-tree-card-style.ts`) give no visual feedback on hover at all, contradicting DESIGN.md's own documented lift+shadow spec. For a canvas whose core interaction is "click a card to see what happens," the default style gives no affordance that cards are clickable until after the first accidental click.
Fix: Add a hover treatment to compact's avatar/frame — at minimum a ring-color shift, ideally matching DESIGN.md's documented `-translate-y-0.5` lift.
Suggested command: `/impeccable layout` (or a scoped `/impeccable polish` pass on `compact-card-body.tsx`)

**[P2] Nine of fifteen tree components exceed CLAUDE.md's own 150-line cap**
Why it matters: `relationship-edge.tsx` (753 lines) and `tree-canvas.tsx` (544 lines) are 5× and 3.6× the stated limit. The complexity in `relationship-edge.tsx` is well-justified by documented real-bug-fix history, but the rule as written is a hard rule with no stated exception for "justified" complexity — worth an explicit decision (split into sub-components, or amend the rule for this file) rather than silent drift.
Fix: Extract sub-components where a clean seam exists (e.g. `DivorceBreakMark`, trace-line-rendering logic out of `relationship-edge.tsx`; toolbar sub-panels out of `tree-canvas.tsx`), or explicitly document an exception in CLAUDE.md for domain-dense edge-rendering files.
Suggested command: `/impeccable distill` (targeted at the two worst offenders)

## Persona Red Flags

**Jordan (first-timer, non-technical)** — highest exposure. Two concrete failure points: the P0 silent-default-write is exactly what a first-timer triggers accidentally with no way to self-diagnose later, and nothing in the toolbar/canvas explains what the tree lets you do on first load — no coachmark, no visible hint that cards react to hover/click in the default (compact) style. First 30 seconds: an unfamiliar pan/zoom canvas, a dotted grid, a minimap, four floating buttons, and cards that don't visibly respond to hover.

**Sam (accessibility-dependent)** — the missing `aria-label` on the card frame plus zero verified `focus-visible`/`tabIndex`/keyboard-event coverage across the entire canvas is a real, converged (both assessments), unresolved risk. `prefers-reduced-motion` support is genuinely solid (full compliance, both CSS and the one JS animation site) — that part is done right.

**Casey (mobile)** — DESIGN.md promises a mobile-specific focus-view that was never built; mobile gets the same pan/zoom/minimap-adjacent canvas metaphor, just touch-sized. A code comment references a real prior incident (a 30-100 person tree pinch-zoom crashing a phone Safari tab) that was fixed at the rendering-performance layer (virtualization) but not at the interaction-design layer — the harder problem (navigating a 2D graph via touch) is still open.

## Minor Observations

- `tree-toolbar.tsx` uses `router.push` for filter/trace URL changes while `tree-canvas.tsx` uses `router.replace` for focus changes — plausibly intentional, undocumented either way.
- The isolated-persons status pill is purely informational — no action, no way to jump to/filter to just those people, despite the obvious next step being "go fix this."
- `CollapseToggleButton`'s `title` duplicates `aria-label` exactly — harmless, but `title` tooltips don't show on touch devices, so touch users lose that affordance with no alternative.
- `person-combobox.tsx`'s search has no visible error handling for a rejected search promise — a network failure would leave the UI silently stuck on an empty result list.
- "Relationship Trace" uses a road/route icon (`RouteIcon`) — a GPS/navigation metaphor slightly mismatched with a genealogy relationship-path concept.

## Questions to Consider

- Does a dotted-grid canvas with a corner minimap and stock zoom/lock controls actually pass CLAUDE.md's own bar ("вот моя семья», а не «вот база данных Person entities»"), or have the _cards_ been optimized for warmth while the _canvas chrome_ stayed an unexamined XYFlow default?
- Is the missing mobile focus-view a deliberately deprioritized feature, or has "it doesn't crash anymore" (the virtualization fix) been quietly treated as "mobile is solved"?
- Given this app's target user is explicitly someone's grandmother, is an unconfirmed persistent settings mutation ever the right default for a casual "just looking" click — and if not here, why is it the current behavior?
