Read BRIEF.md completely. Do not write any code yet.

---

## Step 0: Validate BRIEF.md

Always check in this order: Style first, then Colors. Colors depend on Style.

### Check A: Visual Style

Check if exactly one Visual Style is marked with `[x]` in BRIEF.md.

**If NO style is selected:**
Use AskUserQuestion to ask the user to choose a Visual Style. Present all 8 options:
- Liquid Glass
- Oversized Typography
- Neobrutalism
- Editorial
- Y2K Futurism
- Bento Box
- Lightweight 3D
- Minimalism

After the user selects, update BRIEF.md to mark their choice with `[x]`, then proceed to Check B.

### Check B: Colors

A color is considered missing if its line is blank or contains no valid hex value (valid hex starts with `#` followed by 6 characters, e.g. `#1a2b3c`).

**If ANY color is missing**, use AskUserQuestion with style-specific palette options:

#### Liquid Glass palette options:
- Frosted Light — white surfaces, subtle blue tint, dark text
- Midnight Glass — deep navy bg, white/translucent surfaces, bright accent
- Warm Frost — warm cream base, sand tones, glass overlays
- Custom — I'll provide hex values

#### Oversized Typography palette options:
- High Contrast Dark — black bg, white type, single vivid accent
- High Contrast Light — white bg, black type, single vivid accent
- Monochrome — pure black & white, no accent
- Custom — I'll provide hex values

#### Neobrutalism palette options:
- Classic Brut — white bg, black borders, bold yellow accent
- Pastel Brut — soft pastel bg, black borders, contrasting accent
- Dark Brut — dark bg, white borders, neon accent
- Custom — I'll provide hex values

#### Editorial palette options:
- Cream & Ink — warm off-white bg, near-black text, single muted accent
- Cold Editorial — cool light gray bg, dark gray text, minimal accent
- Dark Editorial — dark charcoal bg, off-white text, gold or rust accent
- Custom — I'll provide hex values

#### Y2K Futurism palette options:
- Cyber Dark — black bg, electric blue + purple accents, chrome white
- Neon Surge — very dark bg, hot pink + cyan accents
- Chrome — silver/gray tones, black bg, white text
- Custom — I'll provide hex values

#### Bento Box palette options:
- Clean Light — white bg, light gray cards, single brand accent
- Soft Dark — dark bg, elevated dark cards, muted accent
- Colorful — light bg, cards with individual accent colors
- Custom — I'll provide hex values

#### Lightweight 3D palette options:
- Deep Space — near-black bg, white text, single glow accent
- Soft Canvas — warm off-white bg, neutral cards, subtle accent
- Cool Studio — dark blue-gray bg, light text, electric accent
- Custom — I'll provide hex values

#### Minimalism palette options:
- Pure — white bg, black text, no accent
- Warm Minimal — warm off-white bg, dark brown text, single warm accent
- Cool Minimal — cool light gray bg, near-black text, single cool accent
- Custom — I'll provide hex values

After the user picks a preset, derive and write all 5 hex values into BRIEF.md.
If they pick Custom, ask them to provide hex values via the Other text input.

**If both checks pass:** proceed directly to Step 1.

---

## Step 1: Identify the Visual Style

From BRIEF.md, find the selected Visual Style. Apply the following design rules for that style when filling the config files:

### Liquid Glass
- Fonts: System UI / SF Pro Display, medium weight, normal tracking
- Stack: Next.js 15, Tailwind CSS v4, Framer Motion, Lenis Smooth Scroll
- GSAP: NO — not needed
- Three.js: NO — CSS blur/backdrop-filter handles depth
- Easing: cubic-bezier(0.25, 0.46, 0.45, 0.94) reveals, cubic-bezier(0.76, 0, 0.24, 1) transitions
- Timing: reveals 0.6s, transitions 0.5s, page transitions 0.7s
- Hover: scale(1.02) + backdrop-filter increase, shadow expansion
- Layout: layered translucent cards, blur surfaces, floating panels
- Forbidden: opaque solid backgrounds on cards, hard borders without transparency

### Oversized Typography
- Fonts: editorial grotesque (Neue Montreal / Monument Extended), tight tracking (-0.04em to -0.06em)
- Stack: Next.js 15, Tailwind CSS v4, GSAP (ScrollTrigger + SplitText), Lenis Smooth Scroll
- GSAP: YES — SplitText for char-by-char reveals, ScrollTrigger for scroll-driven text
- Three.js: NO — type is the visual, no WebGL needed
- Easing: cubic-bezier(0.16, 1, 0.3, 1) reveals, cubic-bezier(0.76, 0, 0.24, 1) transitions
- Timing: char stagger 0.03s per char, word stagger 0.08s
- Hover: text clips, color swaps, no scale
- Layout: type IS the layout, minimal supporting elements
- Forbidden: small typography, decorative elements competing with text

### Neobrutalism
- Fonts: Space Grotesk / DM Mono Bold, uppercase where appropriate
- Stack: Next.js 15, Tailwind CSS v4, CSS transitions only
- GSAP: NO — CSS transitions at 150ms max
- Three.js: NO
- Lenis: NO — native scroll only, no smooth scroll
- Easing: linear OR cubic-bezier(0.5, 0, 0.5, 1)
- Timing: 150ms max — fast and snappy
- Hover: box-shadow shift (offset changes), border color change
- Layout: off-grid intentional, solid 2-4px borders, flat shadows (4px 4px 0px color)
- Forbidden: gradients, blur effects, rounded corners > 4px, smooth easing curves

### Editorial
- Fonts: DM Serif Display / Playfair Display (headings) + Inter (body), strict baseline grid
- Stack: Next.js 15, Tailwind CSS v4, Framer Motion
- GSAP: NO — Framer Motion handles all reveals
- Three.js: NO
- Lenis: OPTIONAL — only if long-scroll article layout
- Easing: cubic-bezier(0.25, 0.1, 0.25, 1.0) for everything
- Timing: reveals 0.8s-1.0s, slow and deliberate
- Hover: underline reveals, opacity shifts
- Layout: magazine columns, clear hierarchy, divider lines, pull quotes
- Forbidden: fast animations, decorative effects, multiple accent colors

### Y2K Futurism
- Fonts: Space Grotesk / Share Tech Mono, tracking 0.1-0.15em, uppercase
- Stack: Next.js 15, Tailwind CSS v4, GSAP (for glitch), Framer Motion (for UI transitions)
- GSAP: YES — glitch keyframes, scan line animations, timeline sequences
- Three.js: NO — CSS effects handle the aesthetic
- Lenis: OPTIONAL — only if immersive scroll is in the brief
- Easing: cubic-bezier(0.68, -0.6, 0.32, 1.6) with spring feel
- Timing: fast 200-300ms, occasional glitch 50ms
- Hover: glitch text effect, scan line overlay, color shift
- Layout: asymmetric, overlapping layers, tech-UI chrome, grid lines visible
- Forbidden: organic curves, natural photography, soft palettes

### Bento Box
- Fonts: Geist Sans / Inter, medium weight, clean
- Stack: Next.js 15, Tailwind CSS v4, Framer Motion
- GSAP: NO — Framer Motion handles card animations
- Three.js: NO
- Lenis: NO — native scroll sufficient
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) hover spring, cubic-bezier(0.16, 1, 0.3, 1) reveals
- Timing: hover 300ms, card reveals stagger 0.08s
- Hover: translateY(-4px) + shadow expansion on cards
- Layout: CSS Grid masonry, cards varying sizes (1x1, 2x1, 1x2, 2x2)
- Forbidden: list layouts, horizontal scroll, full-width single elements everywhere

### Lightweight 3D
- Fonts: Geist Sans / Neue Montreal, clean and neutral to let 3D lead
- Stack: Next.js 15, Tailwind CSS v4, React Three Fiber + @react-three/drei, Framer Motion (UI), Lenis Smooth Scroll
- GSAP: NO — R3F handles 3D, Framer Motion handles UI
- Three.js: YES — via React Three Fiber only (not raw Three.js)
- Mobile fallback: mandatory — detect WebGL support, show static image if unavailable
- Easing: cubic-bezier(0.16, 1, 0.3, 1) for UI, physics-based for 3D (useSpring from @react-spring/three)
- Timing: UI reveals 0.6s, 3D interactions real-time
- Hover: CSS perspective tilt (max 15deg) on cards, R3F rotation on hero element
- Layout: hero 3D element centered, rest clean and minimal
- Forbidden: heavy particle systems, full WebGL scenes, 3D on mobile without fallback, raw Three.js (use R3F)

### Minimalism
- Fonts: Inter or system font, Light/Regular weight (300-400), generous letter-spacing 0.01em
- Stack: Next.js 15, Tailwind CSS v4, Framer Motion
- GSAP: NO
- Three.js: NO
- Lenis: NO — native scroll only
- Easing: cubic-bezier(0.25, 0.1, 0.25, 1.0) — calm and slow
- Timing: 0.8s-1.2s, no fast movements
- Hover: opacity 0.6 → 1.0, underline only
- Layout: single column or centered, max content width 680px for text
- Forbidden: decorations, gradients, shadows > 1 level, multiple fonts

---

## Step 2: Fill CLAUDE.md

Replace the entire content of CLAUDE.md with:

```
# CLAUDE.md — System Core Guidance

## WHAT
[Project name from BRIEF.md] — [Project goal from BRIEF.md]
Stack: [copy the exact Stack line from the selected style above — only those libs]
Visual Target: [Selected Visual Style] / Awwwards-level quality

## WHY
- Awwwards/FWA visual quality — [Visual Style] aesthetic, originality over benchmark scores
- Core Web Vitals targets: Performance 85+ desktop / 75+ mobile, Accessibility 100, SEO 100, CLS 0.00
- Every interactive element has explicit hover, active, focus, and loading states
- Zero generic or Bootstrap-style components

## COMMANDS
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Run lint before marking ANY task as complete. Zero warnings = done.

## DESIGN TOKENS
[Convert BRIEF.md hex colors to CSS variables — these are the ONLY allowed color values]

--color-primary: [hex];
--color-secondary: [hex];
--color-accent: [hex];
--color-bg: [hex];
--color-text: [hex];
--spacing-section-y: clamp(64px, 10vw, 120px);
--transition-reveal: [easing from style] [timing]s;
--transition-hover: [easing from style] [timing]ms;

## ANIMATION RULES
- Hardware acceleration ONLY: transform and opacity. Never top/left/width/height.
- will-change: transform, opacity — only on nodes that animate
- [Style-specific hover behavior]
- [Style-specific reveal behavior]
- Always wrap in: @media (prefers-reduced-motion: reduce) { ... }

## CODE RULES
- TypeScript strict — zero `any` types
- Components max 150 lines — split larger ones
- No raw hex colors — always var(--color-name)
- No inline styles except dynamic computed values
- All images: next/image with blur placeholder
- Semantic HTML: <main>, <section>, <article>, <nav>
- No console.log in any committed file

## FORBIDDEN
[Replace this list entirely with the Forbidden items from the selected style in Step 1.
Always include these 3 universal items + the style-specific ones:]
- Layout-shifting properties in animations (top, left, height, width)
- setTimeout for animation delays — use animation library delays
- Raw hardcoded hex colors or spacing values — always use CSS variables
```

---

## Step 3: Fill DESIGN.md

Replace the entire content of DESIGN.md with:

```
# Design & Motion System

## Typography
[Based on style — provide specific font names, weights, and clamp() values]

Display: [font], [weight], clamp([min], [fluid], [max]), tracking [value]
Heading: [font], [weight], clamp([min], [fluid], [max]), tracking [value]
Body: [font], [weight], [size], line-height [value]
Mono: [font if needed]

Font import: [Google Fonts URL or local instruction]

## Color Tokens
[Map BRIEF.md hex values to CSS custom properties]

:root {
  --color-primary: [hex];
  --color-secondary: [hex];
  --color-accent: [hex];
  --color-bg: [hex];
  --color-text: [hex];
  --color-text-muted: [derived value, e.g. 60% opacity];
  --color-surface: [derived card/panel color];
  --color-border: [derived border color];
}

## Spacing System (8px base grid)
--space-1: 8px
--space-2: 16px
--space-3: 24px
--space-4: 32px
--space-6: 48px
--space-8: 64px
--space-12: 96px
--space-16: 128px
--space-20: 160px
--spacing-section-y: clamp(64px, 10vw, 120px)

## Motion Principles
[Based on selected style]

Easing Reveal: cubic-bezier([values]) — [description]
Easing Transition: cubic-bezier([values]) — [description]

Timing:
- Micro (hover): [value]ms
- Reveal (scroll entry): [value]ms
- Page transition: [value]ms
- Stagger delay between children: [value]s

[Style-specific animation variants in pseudocode]

## Component States
Buttons:
- Default: [description]
- Hover: [exact CSS behavior]
- Active: [exact CSS behavior]
- Disabled: opacity 0.4, cursor not-allowed

Cards / Interactive surfaces:
- Default: [description]
- Hover: [exact CSS behavior — translateY, shadow, etc.]
- Focus: outline 2px solid var(--color-accent), outline-offset 2px

## Responsive Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

Container: max-width 1440px, padding clamp(16px, 5vw, 80px)

## Accessibility (mandatory, non-negotiable)
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

Focus rings: visible on all interactive elements
Color contrast: minimum 4.5:1 for body text, 3:1 for large text
```

---

## Step 4: Fill PRODUCT.md

Replace the entire content of PRODUCT.md with:

```
# Product Requirements

## Core Scope
Type: [from BRIEF.md Goal]
Target: [what success looks like]
Pages: [list from BRIEF.md Sections]
Animation Level: [from BRIEF.md]
Content: [ready / placeholder / to generate]

## Sections Map
[For each section in BRIEF.md, generate:]

### [Section Name]
- Component: src/components/sections/[SectionName].tsx
- Layout: [layout description]
- Animation: [specific animation for this section + timing]
- Data: [what content it needs]

## User Flow
[Primary path: which section → what action → what next]

## Technical Constraints
- Images: next/image, sizes attribute, blur placeholder — always
- SEO: Semantic HTML. JSON-LD structured data (WebSite + Organization schema)
- Forms: [from brief or N/A]
- Analytics: [from brief or N/A]
- CMS: [from brief or N/A]
- i18n: [from brief or N/A]

## Out of Scope (v1)
[List everything NOT mentioned in BRIEF.md that someone might assume is included]

## Performance Budget
- LCP: < 2.5s
- CLS: 0.00
- INP: < 200ms
- JS bundle (first load): < 150KB gzipped
- No render-blocking resources
```

---

## Step 5: Enter Plan Mode

After filling all three files, enter PLAN MODE.

Propose the exact Next.js 15 component tree:
- Every file path under src/
- Which animation library handles each component
- Order of implementation (which component first)
- Estimated complexity per section (simple / medium / complex)
