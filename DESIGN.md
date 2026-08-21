# Design & Motion System

> Текущее состояние: рабочая нейтральная заготовка от shadcn/ui
> (`src/app/globals.css`, style `base-nova`, baseColor `neutral`). Разделы ниже
> описывают ЦЕЛЕВУЮ premium/«семейную» дизайн-систему — она применяется отдельным
> визуальным проходом (roadmap этап 12 в PRODUCT.md), не блокируя функциональные
> этапы 0-11. Структура токенов (`--color-*`, `--space-*`, easing-переменные)
> уже используется в компонентах через Tailwind `@theme inline` — при
> визуальной полировке меняются ЗНАЧЕНИЯ токенов в `:root`/`.dark`, а не их имена
> и не сами компоненты.

## Typography
Целевое направление: тёплый, читаемый гуманистический sans (Inter или Geist Sans
уже используется как системный шрифт проекта) для body/UI, с более выразительным
serif или высококонтрастным sans для заголовков Person Profile/Story
(кандидат: DM Serif Display или Fraunces — придаёт «архивный», не корпоративный
характер). Точный выбор — предмет этапа 12.

Display: [font TBD], clamp(1.75rem, 3vw, 2.5rem), tracking -0.01em
Heading: [font TBD], clamp(1.25rem, 2vw, 1.75rem)
Body: Inter/Geist Sans, 400, 1rem, line-height 1.6
Mono: Geist Mono (уже подключён) — для технических значений (даты-диапазоны, id в dev-режиме)

## Color Tokens
Текущие переменные (см. `src/app/globals.css`) — нейтральная grayscale-палитра
shadcn/ui по умолчанию (`--background`, `--foreground`, `--primary`, `--card`,
`--muted`, `--accent`, `--destructive`, `--border`, `--ring`, ...), уже прокинутая
через `@theme inline` в Tailwind-утилиты (`bg-background`, `text-foreground` и т.д.).

Целевая premium-палитра (этап 12, значения индикативны и уточняются визуальным проходом):
```
:root {
  --background: [тёплый белый/кремовый, напр. oklch(0.98 0.01 80)];
  --foreground: [тёплый графитовый, напр. oklch(0.22 0.02 60)];
  --primary: [тёплый акцент — терракота/охра/янтарь];
  --muted: [приглушённый тёплый нейтральный];
  --border: [мягкий тёплый серый];
}
```
Generation color-coding в family tree: один hue (напр. акцентный), разная
lightness/opacity по удалённости поколения от focus-person — не разноцветная
радуга по поколениям.

## Spacing System (8px base grid)
--space-1:   8px
--space-2:   16px
--space-3:   24px
--space-4:   32px
--space-6:   48px
--space-8:   64px
--space-12:  96px
--space-16:  128px
--space-20:  160px
--spacing-section-y: clamp(64px, 10vw, 120px)

## Motion Principles

### Универсальные правила (применимы уже сейчас, не ждут этапа 12)
- Page/section transitions: укладываться в 600-800ms максимум
- Именованные easing-алиасы (использовать эти имена в комментариях к коду):
  - `--ease-reveal`: cubic-bezier(0.16, 1, 0.3, 1) — спокойное, «уверенное» появление
  - `--ease-transition`: cubic-bezier(0.76, 0, 0.24, 1) — переходы между экранами
  - `--ease-tree-focus`: cubic-bezier(0.25, 0.1, 0.25, 1.0) — смена focus-person в дереве
- Hardware acceleration: `will-change: transform, opacity` — только на активно
  анимирующихся узлах
- НИКОГДА default CSS `ease`/`linear`
- НИКОГДА не анимировать: top, left, width, height — layout shift и jank

### Family Tree specific
- Смена focus-person: остальные узлы переходят через transform (translate/scale)
  с stagger, пропорциональным расстоянию от нового focus-узла — не мгновенный
  re-layout всех nodes одновременно
- Person Node states: `default` / `hover` (лёгкий scale + тень) / `selected`
  (акцентная обводка) / `focus-center` (увеличенный, в центре) / `dimmed`
  (пониженная opacity для узлов, не относящихся к текущему фокусу)

## Component States
Buttons:
- Default / Hover / Active / Focus / Disabled (opacity 0.4, cursor not-allowed, pointer-events none) —
  уже реализовано в `src/components/ui/button.tsx` через `focus-visible:ring`,
  `active:translate-y-px`, `disabled:opacity-50`

Cards / интерактивные поверхности:
- Hover: едва заметный подъём (translateY(-2px)) + мягкая тень
- Focus: `outline: 2px solid var(--ring)`, `outline-offset: 2px`

## Responsive Breakpoints
- sm:  640px
- md:  768px  ← порог переключения family tree canvas → mobile focus-view
- lg:  1024px
- xl:  1280px
- 2xl: 1536px

Container: max-width 1440px, padding clamp(16px, 5vw, 80px)

## Accessibility (обязательно, не подлежит удалению)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- Focus rings: видимы на всех интерактивных элементах
- Цветовой контраст: минимум 4.5:1 для body text, 3:1 для крупного текста (WCAG 2.1 AA)
