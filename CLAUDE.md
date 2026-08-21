# CLAUDE.md — System Core Guidance

## WHAT
Family Archive (root.house) — premium-уровня семейный архив: граф людей (Person) и
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
- Dev:          `pnpm dev`
- Build:        `pnpm build`
- Lint:         `pnpm lint`
- Type-check:   `pnpm typecheck`
- Tests:        `pnpm test` (watch: `pnpm test:watch`)
- DB schema:    `pnpm db:generate` (генерирует SQL-миграцию из src/db/schema)
- DB migrate:   `pnpm db:migrate` (применяет миграции к DATABASE_URL)
- DB studio:    `pnpm db:studio` (drizzle-kit studio — визуальный браузер БД)
- Rule: запускать `pnpm lint` и `pnpm typecheck` перед тем, как считать ЛЮБУЮ задачу завершённой. Zero warnings = done.
- Полный `pnpm build` требует настоящего `DATABASE_URL` (Next.js исполняет
  код страниц при сборе данных) — до появления реальной Neon-БД typecheck/
  lint/test остаются основной проверкой, build запускается когда БД доступна.

## DESIGN TOKENS
Текущая палитра — нейтральная заготовка от shadcn/ui (`src/app/globals.css`).
Для premium «семейного» ощущения на этапе визуальной полировки (см.
PRODUCT.md → Out of Scope / roadmap этап 12) заменить на тёплую спокойную
палитру:
- Тёплые нейтральные (тёплый белый/кремовый фон, тёплый графитовый/коричневый текст)
- Один тёплый акцент (терракота/охра/янтарь) — НЕ стартаперский сине-фиолетовый градиент
- Приглушённые вторичные тона для generation color-coding в дереве (единый hue,
  разная lightness по поколению — не «радуга»)
- Точные hex/oklch значения фиксируются отдельным визуальным проходом (см. DESIGN.md)

Все цвета — только через `var(--color-name)`, никаких raw hex в компонентах.

## ANIMATION RULES
- Hardware acceleration ONLY: transform и opacity. Никогда top/left/width/height.
- will-change: transform, opacity — только на активно анимирующихся узлах
- Переходы focus-person в дереве — только transform (translate/scale),
  никогда полный re-layout всех nodes одновременно (stagger по расстоянию от нового focus)
- Всегда реализовывать `prefers-reduced-motion` fallback

## CODE RULES
- TypeScript strict — zero `any` типов
- Компоненты: максимум 150 строк — разбивать на под-компоненты при превышении
- Никаких raw hex цветов — всегда `var(--color-name)`
- Никаких inline styles, кроме динамических вычисляемых значений
- Все изображения: next/image с blur placeholder и явными width/height
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
