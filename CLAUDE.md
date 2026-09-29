# CLAUDE.md — System Core Guidance

## WHAT

Root house — premium-уровня семейный архив: граф людей (Person) и
связей (Relationship) в основе, поверх которого строятся интерактивное семейное
дерево, профили людей, события, медиа (фото/видео/аудио/документы) и семейные
истории. Архитектурно готов к multi-tenant SaaS (несколько пользователей на
семью, роли, будущая подписка), но без преждевременной реализации billing/AI.

Stack: Next.js 16 (App Router), TypeScript strict, React 19, Drizzle ORM +
Neon Postgres, Auth.js v5 (database sessions), Tailwind CSS + shadcn/ui,
@xyflow/react (family tree visualization), Vercel Blob (media storage), Vitest.

Visual Target: Awwwards/FWA-уровень качества, но тёплый и спокойный «семейный»
тон — не enterprise CRM feel.

## WHY

- Awwwards/FWA visual quality — originality и motion над benchmark-показателями
- Core Web Vitals targets: Performance 85+ desktop / 75+ mobile, Accessibility 100, SEO 100, CLS 0.00
- Каждый интерактивный элемент имеет explicit hover/active/focus/loading states
- Zero generic или Bootstrap-style компонентов
- Тёплый, спокойный, «семейный» тон интерфейса — пользователь должен видеть
  «вот моя семья», а не «вот база данных Person entities»
- Доменная логика (Person/Relationship/Event/...) валидируется и авторизуется
  ИСКЛЮЧИТЕЛЬНО на сервере — клиентские проверки только для UX, никогда для security
- Родословная — это граф в БД (Person + Relationship), а не дерево; family tree,
  генограмма, timeline — разные UI-представления одних и тех же данных

## COMMANDS

- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Type-check: `pnpm typecheck`
- Tests: `pnpm test` (watch: `pnpm test:watch`)
- DB schema: `pnpm db:generate` (генерирует SQL-миграцию из src/db/schema)
- DB migrate: `pnpm db:migrate` (применяет миграции к DATABASE_URL)
- DB studio: `pnpm db:studio` (drizzle-kit studio — визуальный браузер БД)
- Rule: запускать `pnpm lint` и `pnpm typecheck` перед тем, как считать ЛЮБУЮ задачу завершённой. Zero warnings = done.
- Полный `pnpm build` требует настоящего `DATABASE_URL` (Next.js исполняет
  код страниц при сборе данных) — до появления реальной Neon-БД typecheck/
  lint/test остаются основной проверкой, build запускается когда БД доступна.

## DESIGN TOKENS

Палитра — `src/app/globals.css`. Три hue с разделёнными ролями, никогда не
смешиваются в одном элементе (история калибровки — DESIGN.md § Color Tokens):

- **Терракота** (hue 45, `--primary`/`--ring`) — единственный цвет ДЕЙСТВИЯ:
  кнопки, badges, brand mark, в дереве — trace и выбранная карточка. Никогда
  не состояние покоя.
- **Приглушённый sage** (hue 126, `--tree-accent`) — цвет ИДЕНТИЧНОСТИ
  («это человек»): постоянная обводка карточек. Выцветший, НЕ насыщенный
  «лесной» зелёный.
- **Тёплый коричневый** (hue 55, `--branch`) — линии/«ствол» дерева, только
  структурный фон.
- `--confirm` (sage) — единственное исключение из «терракота = действие»:
  только «Готово», завершающее режим редактирования (`PhotoArrangeBar`,
  отметка людей в `photo-lightbox.tsx`), с галочкой. Не распространять на
  обычные кнопки.
- `--chart-1..5` — неиспользуемый shadcn-скаффолдинг, к бренду не привязан.
- Шрифты: заголовки — Lora (`.font-heading`), UI — Geist Sans, оба с
  кириллическим subset. Не сине-фиолетовый стартап-градиент.
- Все цвета — только `var(--color-name)`.

Детали применения в дереве — `src/components/tree/CLAUDE.md`.

## ANIMATION RULES

- Hardware acceleration ONLY: transform и opacity. Никогда top/left/width/height.
- will-change: transform, opacity — только на активно анимирующихся узлах
- Переходы focus-person в дереве — только transform (translate/scale),
  никогда полный re-layout всех nodes одновременно (stagger по расстоянию от нового focus)
- Всегда реализовывать `prefers-reduced-motion` fallback

## ГДЕ ОСТАЛЬНЫЕ ПРАВИЛА

Подгружаются автоматически при работе в соответствующей папке:

- `src/domain/tree/layout/CLAUDE.md` — TREE LAYOUT RULES: движок раскладки, 9 инвариантов
- `src/components/tree/CLAUDE.md` — рендер дерева: карточки, развод, collapse, смена фокуса
- `src/components/story/CLAUDE.md` — STORIES: прослушивание (без ИИ), плеер, слайд-шоу
- `docs/tree-layout-history.md` — почему так: история багов и отклонённых решений по дереву

## I18N

- Два языка: `ru` (default) и `en` — next-intl **без URL-префиксов**. Локаль:
  cookie `NEXT_LOCALE` → `Accept-Language` → `ru` (`src/i18n/request.ts`).
  Явный выбор (переключатель `components/locale-switcher.tsx`) сохраняется в
  `users.locale` и возвращается в cookie при входе (`src/i18n/sync-locale.ts`).
- Весь UI-текст — только в `messages/ru.json` + `messages/en.json` (одинаковый
  набор ключей, `ru.json` — источник типов в `src/global.d.ts`). Сервер:
  `getTranslations`, клиент/серверные sync-компоненты: `useTranslations`.
  Счётчики — только ICU plural (`counts.*`), даты — `useFormatter`/
  `getFormatter` с именованными форматами (`src/i18n/formats.ts`, UTC).
- `src/domain/**` не импортирует next-intl: форматтеры, которым нужен язык
  (`formatPartialDate`, `personDisplayName`, `relationLabel`, `kinship-terms`),
  принимают `locale: Locale` параметром. Словарь языка внутри domain — только
  там, где это грамматика, а не подпись (падежи месяцев, термины родства).
- Domain/сервисы возвращают или бросают **коды** ошибок (`errors.*`), zod-схемы
  — ключи `validation.*`; action переводит их через `getErrorMessage()`/
  `getValidationMessage()` (`src/i18n/`). Никакого русского текста в throw.
- Domain отдаёт структуру, а не фразы: синтетические события таймлайна имеют
  пустой `title`, возраст — число; формулирует UI (`getEventWording`).
- Защита: `src/i18n/no-hardcoded-cyrillic.test.ts` (кириллица в коде вне
  комментариев и allowlist-словарей — падение) и `messages.test.ts` (паритет
  ключей ru/en).

## CODE RULES

- TypeScript strict — zero `any` типов
- Компоненты: максимум 150 строк — разбивать на под-компоненты при превышении
- Никаких raw hex цветов — всегда `var(--color-name)`
- Никаких inline styles, кроме динамических вычисляемых значений
- Все изображения: next/image с явными width/height (или `fill`). Семейные
  фото — только через `ArchiveImage` (`components/media/archive-image.tsx`) и
  `mediaUrl(id, familyId, size)` (`lib/media-url.ts`): `thumb` для дерева,
  аватаров, сеток; `display` для просмотра, hero, слайдов; оригинал — только
  для скачивания. Вместо blur placeholder — фон контейнера (`bg-muted`) и
  проявление по opacity (решение пользователя 2026-09-25: не хранить заглушку
  на каждое фото)
- Медиа — не только фото (`kind`: photo/audio/document): любой запрос,
  выводящий медиа как фото, обязан фильтровать `kind = 'photo'` (проверка:
  `verify-story-recording.mjs`)
- Новая нижняя панель по центру экрана — пометить `data-bottom-bar`, чтобы
  капсула плеера истории встала над ней (`globals.css`, `.story-player-bar`)
- Только семантический HTML: `<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`
- Никаких `console.log` в закоммиченном коде
- `src/domain/**` НЕ импортирует `next`/`react` — юнит-тестируется изолированно от фреймворка
- Каждый server action в `src/actions/**` начинается с `auth()` →
  `requireFamilyAccess(familyId, userId, minRole)` до любого чтения/записи
- Каждый repository-метод `getById`-типа фильтрует `WHERE id = ... AND family_id = ...`
  в одном запросе — подмена id из чужой Family должна возвращать `null`, а не
  «нашли, но потом отказали»

## FORBIDDEN

- Generic Bootstrap-style компоненты
- Default CSS ease или linear easing curves
- Layout-shifting свойства в анимациях (top, left, height, width)
- setTimeout для анимационных задержек — использовать delays анимационной библиотеки
- Raw hardcoded цвета или spacing-значения — всегда CSS-переменные
- Резолвить Person/Media/Event/Story по id без `family_id` в WHERE-условии того же запроса
- Импорт `@xyflow/react` где-либо вне `src/components/tree/`
- Доверять client-переданной роли/правам доступа без сверки в `requireFamilyAccess`
- `db.transaction(...)` — `neon-http` драйвер не поддерживает транзакции; для
  атомарных multi-table операций использовать один SQL-стейтмент с CTE
  (см. `family.service.ts::createFamily`, `docs/architecture.md`)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
