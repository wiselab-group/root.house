# Design & Motion System

> Статус: тёплая «семейная» палитра и типографика реализованы (этап 12,
> `src/app/globals.css` / `src/app/layout.tsx`). Значения ниже — то, что
> сейчас в коде, не план на будущее. Структура токенов (`--color-*`, именованные
> easing-переменные) не менялась при полировке — менялись только их значения в
> `:root`/`.dark`, как и предполагалось изначально.

## Typography

- **Body/UI**: Geist Sans (`--font-geist-sans`, subsets `latin`+`cyrillic` —
  весь интерфейс на русском, это обязательно), через Tailwind `font-sans`.
- **Заголовки** (Person Profile, Story, карточные `CardTitle`, страничные
  `<h1>`): Lora (`--font-lora`) через утилиту `.font-heading` — тёплый,
  «архивный» serif. DESIGN.md изначально называл Fraunces/DM Serif Display —
  оба **не поддерживают кириллицу** (проверено через `next/font/google`'s
  font-data), поэтому заменены на Lora, которая поддерживает и держит тот же
  тёплый некорпоративный характер.
- **Mono**: Geist Mono (`--font-geist-mono`) — для технических значений.

`.font-heading` — сознательно utility-класс, а не дефолтный шрифт всех
заголовков (через `@layer base h1,h2 {...}`): формы/дашборды остаются на
гуманистическом sans, serif — акцент на «архивных» экранах (профиль, история,
карточные заголовки), не на каждом UI-элементе.

## Color Tokens

Три hue, каждый со своей ролью, никогда не смешиваемые в одном элементе:

- Терракота (`hue 45`, `--primary`) — цвет ДЕЙСТВИЯ: кнопки, badges, фокус-
  кольца форм, brand mark ВЕЗДЕ, и внутри дерева — ИСКЛЮЧИТЕЛЬНО
  focus-person/Relationship Trace/keyboard-selected карточка. Никогда не
  используется как состояние покоя внутри дерева.
- Приглушённый оливково-шалфейный (`hue 126`, `--tree-accent`) — цвет
  ИДЕНТИЧНОСТИ внутри дерева: постоянная обводка/ring каждой карточки, видна
  всегда (не только в фокусе), ОДНИМ плоским оттенком — без градации по
  поколению (см. ниже). Оттенок откалиброван под референсный логотип
  «Rooted» (пользователь выбрал `#849073` из отрендеренных свотчей) —
  выцветший, приглушённый, не насыщенный «лесной» зелёный.
- Тёплый коричневый (`hue 55`, `--branch`) — линии-коннекторы/«ствол» дерева,
  всегда структурный фон.

Ни одного стартаперского сине-фиолетового градиента. Все пары фон/цвет ниже
проверены через OKLCH→sRGB→relative luminance перед фиксацией значений (не
подобраны на глаз): ≥4.5:1 для обычного текста, ≥3:1 для UI-границ/иконок
(обводка карточки, линия коннектора — это тот порог, не текстовый):

```
:root {
  --background: oklch(0.985 0.008 60);   /* тёплый кремовый */
  --foreground: oklch(0.28 0.02 50);     /* тёплый графитово-коричневый */
  --primary: oklch(0.55 0.14 45);        /* терракота — вне дерева, и внутри дерева на action-состояниях */
  --tree-accent: oklch(0.58 0.05 126);   /* приглушённый sage — обводка карточек дерева (identity) */
  --branch: oklch(0.42 0.045 55);        /* коричневый — линии/ствол дерева */
  --muted-foreground: oklch(0.48 0.015 55);
  --border: oklch(0.89 0.012 55);
}
.dark {
  --background: oklch(0.2 0.014 50);     /* тёплый графит, не чистый чёрный */
  --foreground: oklch(0.94 0.01 60);
  --primary: oklch(0.72 0.15 45);        /* терракота ярче для тёмного фона */
  --tree-accent: oklch(0.72 0.04 126);
  --branch: oklch(0.62 0.06 55);
}
```

Contrast ratios (bg vs each): `--tree-accent` ≈ 4.03:1 (light) / 7.40:1
(dark) — оба выше порога 3:1 для границ. `--branch` ≈ 8.21:1 (light) /
4.90:1 (dark) — далеко выше того же порога, линии всегда чётко читаются на
кремовом/графитовом фоне.

**Никакого generation color-coding в family tree** — попробовали и явно
убрали: обводка/ring не должна становиться светлее с каждым поколением, все
карточки красятся ровно одним и тем же `--tree-accent`
(`components/tree/person-node-parts.tsx::buildCardFrameClassName`,
`compact-card-body.tsx`). `--chart-1..5` больше не несут смысла «расстояние
от фокуса» — это просто неиспользуемые shadcn-дефолты для будущих
графиков/статистики, разноцветная категориальная палитра без связи с
брендовым hue (см. globals.css — они намеренно НЕ на hue 126, чтобы никто
не принял их за живую generation-шкалу снова). `generation` как поле
(`FamilyGraph`/`TreeLayoutGraph`) остаётся — используется для
entrance-stagger анимации (`person-node.tsx`'s `animationDelay`), просто
больше не выбирает цвет.

Relationship Trace (подсветка пути между двумя людьми) — терракота
(`--primary`, см. `relationship-edge.tsx::TRACE_COLOR`), не sage: трасса —
это состояние «на что сейчас смотрит пользователь» (то же действие, что
focus-person), поэтому линии трассировки красятся тем же цветом, что и
рамка traced-карточки, и остаются отчётливо отличимыми от постоянного sage
identity-цвета и от коричневого `--branch`.

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

### Универсальные правила

- Page/section transitions: укладываться в 600-800ms максимум
- Именованные easing-алиасы — реализованы как CSS custom properties в
  `:root` (`src/app/globals.css`), использовать по имени, не как magic-числа:
  - `--ease-reveal`: cubic-bezier(0.16, 1, 0.3, 1) — спокойное появление
    (используется в `.animate-tree-node-enter`)
  - `--ease-transition`: cubic-bezier(0.76, 0, 0.24, 1) — переходы между экранами
  - `--ease-tree-focus`: cubic-bezier(0.25, 0.1, 0.25, 1) — hover/переходы
    внутри дерева (используется в `person-node.tsx` через Tailwind
    `ease-(--ease-tree-focus)`)
- Hardware acceleration: `will-change: transform, opacity` — только на активно
  анимирующихся узлах
- НИКОГДА default CSS `ease`/`linear`
- НИКОГДА не анимировать: top, left, width, height — layout shift и jank

### Family Tree specific

- **Смена focus-person — entrance stagger, не FLIP-переход между позициями.**
  Фокус-переход — это полная навигация страницы (`?focus=` в URL, сервер
  пересчитывает layout) — старый и новый набор nodes не имеют общего React
  identity между рендерами, поэтому "проехать" узел от старой позиции к новой
  физически нечем. Честная реализация spec'а: каждый `PersonNode` появляется
  через `.animate-tree-node-enter` (`opacity`+`scale`, `--ease-reveal`) с
  `animation-delay`, пропорциональным `|generation|` (расстоянию от нового
  focus) — узлы дальних поколений появляются позже, создавая ощущение волны
  от центра, а не мгновенный релейаут всех nodes одновременно.
- Generation color-coding: тонкая цветная полоса сверху карточки
  (`h-1`, `background: var(--chart-N)`), не заливка всей карточки —
  раскраска не должна мешать читаемости имени/дат.
- Person Node states: `default` / `hover` (подъём `-translate-y-0.5` + тень,
  `--ease-tree-focus`) / `selected` (кольцо `ring-ring`) / `focus` (акцентная
  рамка + `ring-primary/30`) / placeholder (пунктирная рамка, `opacity-70`,
  курсив на имени).

## Component States

Buttons:

- Default / Hover / Active / Focus / Disabled (opacity 0.4, cursor not-allowed, pointer-events none) —
  уже реализовано в `src/components/ui/button.tsx` через `focus-visible:ring`,
  `active:translate-y-px`, `disabled:opacity-50`

Cards / интерактивные поверхности:

- Hover: едва заметный подъём (translateY(-2px)) + мягкая тень
- Focus: `outline: 2px solid var(--ring)`, `outline-offset: 2px`

## Responsive Breakpoints

- sm: 640px
- md: 768px ← порог переключения family tree canvas → mobile focus-view
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

Container: max-width 1440px, padding clamp(16px, 5vw, 80px)

## Accessibility (обязательно, не подлежит удалению)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Focus rings: видимы на всех интерактивных элементах
- Цветовой контраст: минимум 4.5:1 для body text, 3:1 для крупного текста (WCAG 2.1 AA)
