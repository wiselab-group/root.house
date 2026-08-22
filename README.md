# Root house

Семейный архив: родословная как граф людей и связей, интерактивное семейное
дерево, профили людей, события, медиа (фото/видео/аудио/документы) и семейные
истории. Спроектировано как основа для будущего SaaS (семейные аккаунты,
роли, подписка) — см. [docs/architecture.md](docs/architecture.md) для
полной архитектуры и обоснований, и [PRODUCT.md](PRODUCT.md) для scope/roadmap.

## Стек

- Next.js 16 (App Router), TypeScript strict, React 19
- Drizzle ORM + Neon Postgres (serverless)
- Auth.js v5 (`next-auth@5.0.0-beta.32`, database sessions)
- Tailwind CSS + shadcn/ui
- @xyflow/react — визуализация семейного дерева
- Vercel Blob — media storage
- Vitest — тесты

## Локальная разработка

### Требования
- Node.js 20+
- pnpm 10+
- Neon Postgres проект (или любой совместимый Postgres) — https://neon.tech

### Установка

```bash
pnpm install
cp .env.example .env.local
# заполните .env.local: DATABASE_URL (обязательно), AUTH_SECRET, BLOB_READ_WRITE_TOKEN
```

`AUTH_SECRET` сгенерировать командой:
```bash
pnpm dlx auth secret
```

### Миграции БД

```bash
pnpm db:generate   # генерирует SQL-миграцию из src/db/schema/*.ts
pnpm db:migrate    # применяет миграции к DATABASE_URL
pnpm db:studio     # drizzle-kit studio — визуальный браузер БД
```

После первого `pnpm db:migrate` также нужно вручную включить `pg_trgm`
extension и создать fuzzy-search индекс на persons — см.
[docs/architecture.md § Search](docs/architecture.md#search) (добавляется как
raw SQL миграция, т.к. Drizzle не имеет декларативного API для trigram-индексов).

### Запуск

```bash
pnpm dev
```

### Домен

Первые версии деплоятся на дефолтном Vercel-домене (`*.vercel.app`).
Кастомный домен root.house подключается позже как DNS-шаг — конфигурация
(env-переменные, Auth.js `AUTH_URL`) не хардкодит домен, см. `.env.example`.

## Проверки перед коммитом

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build   # требует настоящий DATABASE_URL — Next.js исполняет код страниц
             # при сборе данных даже для динамических маршрутов
```

Все четыре команды должны проходить чисто (zero warnings) — см. правило в
[CLAUDE.md](CLAUDE.md).

## Тесты

`pnpm test` (Vitest, 71 тестов). Приоритет — доменная логика и безопасность,
не coverage:
- `src/domain/family/access.test.ts` — авторизация (`requireFamilyAccess`, роли owner/editor/viewer)
- `src/domain/shared/partial-date.test.ts` — форматирование/сравнение неполных дат, парсинг form-данных
- `src/domain/relationship/relationship.service.test.ts` — валидация связей (self-reference, циклы)
- `src/domain/relationship/sibling-derivation.test.ts` — вычисление sibling-связей (полнородные/неполнородные)
- `src/domain/relationship/relationship-path.test.ts` — вычисление родства между двумя людьми
- `src/domain/tree/tree-layout.builder.ts` — построение layout семейного дерева
- `src/domain/media/storage.service.test.ts` — контракт `StorageService` (upload/delete/getSignedUrl)
- `src/domain/search/query-classifier.test.ts` — классификация поискового запроса (имя vs год)

Каждый функциональный этап дополнительно проверялся вживую на реальной БД
(Neon) и реальном Vercel Blob через сценарии end-to-end (регистрация →
семья → люди → связи → дерево → медиа → поиск), не только unit-тестами —
см. историю коммитов для деталей каждой проверки.

## Структура проекта

```
src/
  app/            Next.js App Router — маршруты, layouts
  actions/        Server Actions — тонкая обёртка: auth() → requireFamilyAccess() → domain
  domain/         Бизнес-логика, БЕЗ импортов next/react — юнит-тестируется изолированно
  db/             Drizzle-схема, клиент, миграции
  components/     UI-компоненты (ui/ — shadcn/ui примитивы, остальное — доменные)
  lib/            auth.ts, validation/ (zod-схемы)
  types/          доменные типы, декларации модулей
```

Ключевой архитектурный принцип: родословная — граф Person+Relationship в БД,
а не дерево. Family tree/генограмма/timeline — разные UI-представления одних
и тех же данных; доменная модель не зависит от графической библиотеки
(@xyflow/react подключается только через `components/tree/adapters/`).

Подробности — [docs/architecture.md](docs/architecture.md).
