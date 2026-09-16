---
name: run-photos
description: Launch root.house's dev server and drive it with Playwright to visually verify photo/gallery/lightbox features — registers a throwaway test account, creates a family + person, uploads a test photo, and screenshots the result. Use when asked to run, test, or screenshot photo/gallery/tagging UI in the browser.
---

Drives the actual app in a headless browser — not a unit test, not an
`import` of an internal function. Built while verifying the tap-to-tag
(point tagging people on a photo) feature; the same account/family/photo
setup is reusable for any other photo-gallery UI change.

## Setup (one-time per environment)

Playwright is a project devDependency (`playwright`, `@playwright/test`).
If the browser binary isn't installed yet:

```bash
npx playwright install chromium
```

## Dev server

Start it and wait for it to actually serve, don't just launch-and-hope:

```bash
pnpm dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

Stop by killing the port's listener before relaunching (`pnpm dev &`'s `$!`
is only the pnpm wrapper, it won't forward SIGTERM to the actual `next`
process):

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

## Auth — throwaway account, not real user data

This app (Auth.js v5, Credentials + Google providers) has **no dev-only
login bypass and no seed script**. Real accounts exist in the dev Neon DB
(e.g. the project owner's own family data) but their passwords aren't
known/recoverable — **never try to log in as an existing user**. Instead,
every run registers a **fresh disposable account** via the real `/register`
form (email/password, min 8 chars, no complexity rules) and builds its own
family from scratch. This is fully scriptable and touches no real data.

The full path from zero to "a photo in a lightbox, ready to interact with":

1. `POST /register` via the UI form: fill `#name`, `#email`, `#password`
   (any 8+ char string), submit — this immediately signs in and redirects
   to `/families` (empty; registering does **not** auto-create a family).
2. `/families/new`: fill `#name` (only required field), submit → redirects
   to `/families/[slug]`.
3. `/families/[slug]/people/new`: fill `#firstName`/`#lastName` (both
   optional per validation, but fill them for a meaningful screenshot),
   click "Добавить" → redirects to the new person's profile.
4. `/families/[slug]/photos`: click "Добавить фото" to open the upload
   dialog, `setInputFiles` on `#family-photo-upload-input` (it's
   `sr-only`/hidden — `setInputFiles` targets it fine without `force:true`,
   only `.click()` would need that), click "Загрузить", wait for the
   "Готово" button (upload finished), click it.
5. Click the uploaded tile's `<img>` to open `PhotoLightbox`.

## Drive it

```bash
node .claude/skills/run-photos/scripts/verify-photo-tagging.mjs
```

This script does all five setup steps above, then: opens the lightbox,
clicks "Отметить людей" (tagging-mode toggle, only visible for a
contributor+ role — the throwaway account is always the family's owner, so
it's always visible), clicks the center of the photo to place a tag,
searches for and selects the just-created person in the popover, and
screenshots each stage into `screenshots/`:

- `01-lightbox-open.png`
- `02-tagging-mode-on.png`
- `03-tag-person-popover.png` — popover just opened, empty search
- `03b-tag-person-search-results.png` — after typing, showing the match
- `04-tag-placed.png` — marker placed, popover closed, person in the
  bottom "tagged" chip row

On failure it saves `error-state.png` and prints the Playwright error
that stopped it, plus any browser console/page errors captured along the
way — check both before assuming the app itself is broken.

`BASE_URL` env var overrides the target if the dev server runs on a
different port.

## Gotchas that actually bit us building this

- **Regex slug matching**: `waitForURL(/\/families\/[^/]+$/)` also matches
  `/families/new` itself (`new` satisfies `[^/]+`) — the redirect hasn't
  necessarily happened just because the URL pattern matched. Use
  `/\/families\/(?!new$)[^/]+$/` (same trap for `/people/new`).
- **React portal event bubbling**: a `Popover`/`DropdownMenu`'s content
  renders via a DOM portal, but a click inside it still bubbles through
  the **React tree** (not just the DOM tree) to an ancestor's `onClick` —
  this genuinely broke the tap-to-tag feature itself (selecting a person
  in the newly-opened popover re-triggered the underlying photo's
  click-to-place-a-new-tag handler at the same screen position, the
  instant the first popover closed). Fixed in
  `photo-tag-layer.tsx::handleTapToPlace` by checking
  `event.target === event.currentTarget`. If you see a popover close and
  immediately reopen empty at the same spot, suspect this.
- **Search-as-you-type is a real server round-trip** — `pressSequentially`
  then `waitFor` the `role="option"` result, don't just `waitForTimeout` a
  fixed guess; the debounce + server action latency varies.
- **`getByText` on a combobox option can multi-match** (the same text may
  appear elsewhere on the page, e.g. the bottom chip row after a previous
  run's tag) — prefer `getByRole("option", { name })`.
- **`page.click()` on a `Combobox.Item`** worked fine in the end (it wasn't
  a pointerdown-vs-click issue as first suspected while debugging) — the
  actual bug was the portal-bubbling one above, not the click method.
- **No sample image in the repo** — the script builds a tiny valid PNG
  by hand (raw IHDR/IDAT/IEND chunks, no image library) rather than relying
  on a fixture file that might not exist.
- **Test data accumulates** — each run creates a new throwaway user +
  family + person + photo in the dev DB (never cleaned up automatically).
  Harmless for a dev database, but don't run this against anything that
  isn't a throwaway/dev environment.
