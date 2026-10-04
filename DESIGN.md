# Design & Motion System

> Статус: тёплая «семейная» палитра и типографика реализованы (этап 12,
> `src/app/globals.css` / `src/app/layout.tsx`). Значения ниже — то, что
> сейчас в коде, не план на будущее. Структура токенов (`--color-*`, именованные
> easing-переменные) не менялась при полировке — менялись только их значения в
> `:root`/`.dark`, как и предполагалось изначально.

## Typography

- **Body/UI**: Geist Sans (`--font-geist-sans`, subsets `latin`+`cyrillic` —
  интерфейс двуязычный RU/EN, а семейные имена — кириллица в любом языке, это обязательно), через Tailwind `font-sans`.
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

### Fluid-шкала заголовков

Заголовки не прыгают на брейкпоинтах (`text-3xl sm:text-4xl`), а плавно
растут с шириной экрана — токены в `@theme` (`src/app/globals.css`),
Tailwind-утилиты `text-<name>`. Минимум = прежний мобильный размер, максимум =
самый крупный десктопный шаг этой роли:

| Утилита           | clamp()                                    | line-height | Где                                                         |
| ----------------- | ------------------------------------------ | ----------- | ----------------------------------------------------------- |
| `text-hero`       | `clamp(1.875rem, 1rem + 4.2vw, 4.25rem)`   | 1.08        | только hero лендинга (сменяющееся слово ≤343px на телефоне) |
| `text-display-lg` | `clamp(3rem, 2.55rem + 1.9vw, 3.75rem)`    | 1.05        | Family Home, список семей                                   |
| `text-display`    | `clamp(2.25rem, 1.5rem + 3vw, 3.75rem)`    | 1.05        | hero профиля/истории/альбома, лендинг                       |
| `text-title`      | `clamp(1.875rem, 1.6rem + 1vw, 2.25rem)`   | 1.15        | `<h1>` обычных страниц, `<h2>` секций лендинга              |
| `text-heading`    | `clamp(1.5rem, 1.3rem + 0.75vw, 1.875rem)` | 1.25        | подзаголовки внутри истории                                 |

Body/UI-текст остаётся на фиксированной шкале Tailwind (`text-xs`…`text-xl`).
Новый заголовок — всегда одна из этих утилит, не пара `text-Nxl sm:text-Mxl`.

## Color Tokens

Три hue, каждый со своей ролью, никогда не смешиваемые в одном элементе:

- Терракота (`hue 45`, `--primary`) — цвет ДЕЙСТВИЯ: кнопки, badges, фокус-
  кольца форм, brand mark ВЕЗДЕ, и внутри дерева — ИСКЛЮЧИТЕЛЬНО
  Relationship Trace/keyboard-selected карточка (focus-person остаётся sage,
  см. CLAUDE.md § DESIGN TOKENS). Никогда не
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
(обводка карточки, линия коннектора — это тот порог, не текстовый) —
**кроме `--branch` внутри дерева, см. отступление ниже**:

```
:root {
  --background: oklch(0.985 0.008 60);   /* тёплый кремовый — фон всего приложения */
  --foreground: oklch(0.28 0.02 50);     /* тёплый графитово-коричневый */
  --primary: oklch(0.55 0.14 45);        /* терракота — вне дерева, и внутри дерева на action-состояниях */
  --tree-accent: oklch(0.58 0.05 126);   /* приглушённый sage — обводка карточек дерева (identity) */
  --tree-canvas: oklch(0.966 0.015 81);  /* фон САМОГО дерева (tree-canvas.tsx) — точный hex #F9F3E9 */
  --branch: oklch(0.82 0.026 64);        /* линии/ствол дерева + рамка карточки в покое — точный hex #D1C1B3 */
  --tree-card-ring: oklch(0.579 0.136 47); /* карточный terracotta-ring — точный hex #B95C28 */
  --muted-foreground: oklch(0.48 0.015 55);
  --border: oklch(0.89 0.012 55);
}
.dark {
  --background: oklch(0.2 0.014 50);     /* тёплый графит, не чистый чёрный */
  --foreground: oklch(0.94 0.01 60);
  --primary: oklch(0.72 0.15 45);        /* терракота ярче для тёмного фона */
  --tree-accent: oklch(0.72 0.04 126);
  --tree-canvas: oklch(0.225 0.016 60);
  --branch: oklch(0.35 0.03 55);          /* relit — тот же ~1.59:1 контраст к --tree-canvas, что и light */
  --tree-card-ring: oklch(0.72 0.15 45);
}
```

2026-09-18: пользователь передал точную reference-палитру для дерева
(hex-коды со скриншота-референса), в ТРИ отдельных раунда, каждый точнее
предыдущего:

1. Изначально `--branch`/`--tree-card-ring` подобраны визуально по
   скриншоту (не hex) — контраст оказался ниже 3:1, принят как временный
   компромисс.
2. Пользователь передал первый набор точных hex (Canvas #F8F3EE,
   Relationship line #6B574C, Terracotta accent #B95C28...) — конвертация
   дала контраст ВЫШЕ 3:1 (6.16:1/4.12:1), временный компромисс оказался не
   нужен: визуальная догадка была смещена в неверную сторону относительно
   самого референса.
3. Пользователь уточнил ещё точнее: canvas `#F9F3E9` (не `#F8F3EE`) и,
   главное, линии/рамка `#D1C1B3` — заметно СВЕТЛЕЕ шага 2, возвращая
   контраст обратно ниже порога (~1.59:1). Это подтверждает, что низкий
   контраст — не ошибка, а осознанное намерение референса (линии почти
   сливаются с фоном), и раунд 2 перестарался с "починкой" в сторону
   доступности там, где пользователь этого не просил. `--tree-canvas`
   заведён как отдельный от `--background` токен (не переопределяет весь
   app) — фон именно дерева чуть теплее/насыщеннее общего фона приложения.

**Временное отступление от порога ≥3:1 (`--branch` внутри дерева)**:
принято окончательно по прямому запросу с точными hex-значениями — линии-
коннекторы и рамка карточки в покое (`compact-card-body.tsx`) читаются почти
слитыми с `--tree-canvas`, ниже обычного UI-border порога. Не «чинить»
обратно к более контрастному значению без явного нового запроса — см. память
`tree-visual-reference-v1` за полной историей всех трёх раундов.

Contrast ratios (bg vs each): `--tree-accent` ≈ 4.03:1 (light) / 7.40:1
(dark) — выше порога 3:1. `--tree-card-ring` ≈ 4.12:1 (light) / 6.94:1
(dark) — тоже выше порога. `--branch` vs `--tree-canvas` ≈ 1.59:1 в обеих
темах — намеренно ниже порога, см. отступление выше.

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

Заведены как CSS-переменные в `:root` (`src/app/globals.css`);
`--spacing-section-y` доступен утилитой `py-section` — вертикальный ритм
крупных секций (лендинг, Family Home). Внутри компонентов шаг Tailwind
(`p-2` = 8px, `p-4` = 16px…) уже лежит на той же 8px-сетке.

Контейнер: max-width 1440px, padding clamp(16px, 5vw, 80px).

## Motion Principles

### Универсальные правила

- Page/section transitions: укладываться в 600-800ms максимум
- Именованные easing-алиасы — реализованы как CSS custom properties в
  `:root` (`src/app/globals.css`), использовать по имени, не как magic-числа:
  - `--ease-reveal` (алиас `--ease-premium-out`): cubic-bezier(0.16, 1, 0.3, 1)
    — спокойное появление (используется в `.animate-tree-node-enter`)
  - `--ease-transition` (алиас `--ease-expressive`): cubic-bezier(0.76, 0, 0.24, 1)
    — переходы между экранами
  - `--ease-tree-focus`: = `--ease-reveal` (до 2026-09-27 был
    cubic-bezier(0.25, 0.1, 0.25, 1) — это ровно дефолтный CSS `ease`,
    запрещённый правилами выше; не возвращать) — hover/переходы
    внутри дерева (используется в `person-node.tsx` через Tailwind
    `ease-(--ease-tree-focus)`)
- Именованные длительности — `--duration-*` в `:root` + одноимённые утилиты
  (`duration-fast` и т.д.), числовые `duration-200` не использовать:

  | Токен       | Значение | Для чего                                         |
  | ----------- | -------- | ------------------------------------------------ |
  | `instant`   | 100ms    | открытие поповеров/меню, scroll-driven transform |
  | `fast`      | 150ms    | мелкий feedback (иконка, цвет кнопки)            |
  | `base`      | 200ms    | hover карточек и строк — основной ритм           |
  | `slow`      | 300ms    | панели, раскрытие секций                         |
  | `reveal`    | 500ms    | проявление фото (`ArchiveImage`), spotlight      |
  | `cinematic` | 1000ms   | медленные кросс-фейды слайдов                    |

- Hardware acceleration: `will-change: transform, opacity` — только на активно
  анимирующихся узлах
- НИКОГДА default CSS `ease`/`linear`
- НИКОГДА не анимировать: top, left, width, height — layout shift и jank

### Family Tree specific

- **Смена focus-person — клиентская** (`tree-canvas.tsx::setFocus` →
  `buildClientTreeLayout`, `router.replace`): позиции карточек меняются
  мгновенно, анимируется только viewport (плавный pan/zoom через XYFlow's
  `setCenter` с `duration`, с `prefers-reduced-motion` fallback). При первом
  появлении дерева каждый `PersonNode` входит через `.animate-tree-node-enter`
  (`opacity`+`scale`, `--ease-reveal`) с `animation-delay`, пропорциональным
  `|generation|` — волна от центра, а не мгновенное появление всех nodes.
- Никакого generation color-coding — все карточки одного `--tree-accent`
  (см. § Color Tokens).
- Person Node states: `default` / `hover` (подъём `-translate-y-0.5` + тень,
  `--ease-tree-focus`) / `selected` и traced (терракотовое двойное кольцо:
  3px solid + 6px translucent, `compact-card-body.tsx`) / `focus` (sage-рамка,
  акцентированная вторым ring) / placeholder (пунктирная рамка, `opacity-70`,
  курсив на имени).

## Component States

Каждый интерактивный элемент: default / hover / active / focus / disabled, и
loading — если действие асинхронное.

Buttons (`src/components/ui/button.tsx`):

- Hover — смена фона; Active — `translate-y-px`; Focus — `focus-visible:ring`
- Disabled: `opacity: 0.4`, `cursor: not-allowed`, `pointer-events: none` —
  то же 0.4 во всех `ui/`-контролах (input, select, checkbox, switch, tabs,
  menu items, label)
- Loading: кнопка получает `disabled` + `aria-busy`, подпись меняется на
  глагол в процессе с многоточием («Удаляем…», «Сохраняем…»). Занятая кнопка
  НЕ гаснет до 0.4 (`disabled:not-aria-busy:opacity-40`) — она работает, а не
  недоступна.

Cards / интерактивные поверхности:

- Hover: едва заметный подъём (translateY(-2px)) + мягкая тень
- Focus: `outline: 2px solid var(--ring)`, `outline-offset: 2px`

Loading страниц и блоков: route-level `loading.tsx` со `Skeleton`
(`bg-muted` + `animate-pulse`), повторяющим форму будущего контента — не
спиннер по центру пустой страницы. Фото проявляются по opacity на фоне
`bg-muted` (`ArchiveImage`), без blur-заглушек.

Изображения внутри анимированных/parallax-контейнеров — всегда в обёртке с
классом `overflow-hidden` (не inline style), чтобы transform/scale не
вылезал за скругления карточки.

Прокручиваемые области: список внутри панели, листа, поповера или диалога
никогда не обрезается резко краем — содержимое растворяется в фон. Класс
`scroll-fade` (`globals.css`) на самом scroll-контейнере: верхний край —
когда список прокручен, нижний — пока ниже есть ещё; scroll-driven, без JS.
В маленьких поповерах (`max-h-60`/`max-h-72`) — короче:
`[--scroll-fade-size:1rem]`. Не вешать на элемент со своей рамкой или фоном
(маска погасит и их) — прокрутку выносить во внутренний контейнер, как в
`kinship-panel.tsx` (шапка закреплена, остальное прокручивается).

## Responsive Breakpoints

- sm: 640px
- md: 768px ← порог переключения family tree canvas → mobile focus-view
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

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
