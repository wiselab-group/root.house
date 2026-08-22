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
Один тёплый акцент — терракота (`hue 45` в OKLCH) — используется всюду:
`--primary`, generation color-coding в дереве, фокус-кольца. Никакого
стартаперского сине-фиолетового градиента. Все пары фон/текст ниже проверены
на WCAG AA (≥4.5:1 для обычного текста, посчитано напрямую через OKLCH→sRGB→
relative luminance перед фиксацией значений — не подобраны на глаз):

```
:root {
  --background: oklch(0.985 0.008 60);   /* тёплый кремовый */
  --foreground: oklch(0.28 0.02 50);     /* тёплый графитово-коричневый */
  --primary: oklch(0.55 0.14 45);        /* терракота */
  --muted-foreground: oklch(0.48 0.015 55);
  --border: oklch(0.89 0.012 55);
}
.dark {
  --background: oklch(0.2 0.014 50);     /* тёплый графит, не чистый чёрный */
  --foreground: oklch(0.94 0.01 60);
  --primary: oklch(0.72 0.15 45);        /* терракота ярче для тёмного фона */
}
```

**Generation color-coding в family tree** (`components/tree/person-node.tsx`):
один и тот же hue 45°, lightness растёт и chroma падает с ростом `|generation|`
(удалённости от focus-person) — `--chart-1`…`--chart-5`, не радуга по
поколениям:
```
|gen|=0: oklch(0.55 0.14 45)   |gen|=2: oklch(0.75 0.08 45)
|gen|=1: oklch(0.65 0.11 45)   |gen|=3+: oklch(0.85 0.05 45) / oklch(0.9 0.03 45)
```

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
