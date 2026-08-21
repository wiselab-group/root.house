# Architecture

Полный контекст для восстановления в будущей сессии без повторного
прохождения первоначального планирования. Соответствует implementation plan,
принятому при старте проекта (сохранён также в истории git commit messages).

## Ключевой принцип

**Родословная — граф, а не дерево.** В базе данных хранятся `Person` (люди) и
`Relationship` (parent_child / partnership связи между ними). Family Tree,
будущая генограмма, timeline — это разные UI-представления одного и того же
графа, построенные через `domain/tree/tree-layout.builder.ts`, который не
знает о конкретной графической библиотеке. `@xyflow/react` подключается
только в `components/tree/adapters/xyflow-adapter.ts` — если библиотека
визуализации сменится, domain model и БД не меняются.

## Слои приложения

```
app/            Next.js маршруты — Server Components по умолчанию,
                "use client" только на интерактивных листьях (tree canvas, формы, модалки)
actions/        Server Actions — тонкая обёртка:
                auth() → requireFamilyAccess(familyId, userId, minRole) → domain-вызов → revalidatePath
domain/         Бизнес-логика. НЕ импортирует next/react — юнит-тестируется
                в изоляции (Vitest, без поднятия Next.js)
db/             Drizzle-схема (source of truth структуры БД), клиент, миграции
components/     UI. ui/ — shadcn/ui примитивы (presentational only)
```

Правило, которое нельзя нарушать: ни одна авторизационная или бизнес-проверка
не должна жить внутри React-компонента или напрямую в `route.ts` — только в
`domain/`, вызываемая из `actions/`.

## Multi-tenancy

```
User → FamilyMember(role: owner|editor|viewer) → Family → Person, Relationship,
                                                            Event, Media, Story, Place
```

`Person` (и всё остальное доменное) принадлежит `Family`, **никогда** напрямую
`User` — это то, что делает приглашение родственника-редактора возможным без
миграции данных: он сразу видит и редактирует весь граф семьи.

`Family.planTier` (enum, сейчас только `'free'`) — заготовка под будущий billing
без его реализации; Family — будущая billing-единица (одна подписка на всю
семью), не User.

## Доменная модель — обоснования ключевых решений

- **Occupation/education НЕ поля Person** — моделируются как `Event`
  (`type: 'occupation' | 'education'`) с датами/местом/описанием, чтобы не
  терять историю смены профессии/учёбы и не дублировать логику вокруг
  "текущее значение vs история".
- **"Неизвестный родитель" / "был сын, но имя неизвестно"** — не спецслучай в
  Relationship, а обычный `Person` с `isPlaceholder: true` и null-полями.
  Граф остаётся консистентным: ancestors/descendants queries не требуют
  null-checks на "существует ли этот узел по-настоящему".
- **Sibling-связи не хранятся** — вычисляются JOIN'ом `relationships_parent_child`
  самой на себя по общему `parentId`. Единственный derived тип связи;
  `parent_child` и `partnership` — всегда source of truth.
- **`partnership` без unique(person1Id, person2Id)** — разведённая и вновь
  поженившаяся пара — это просто два ряда с разными `startDate`/`endDate`, без
  специальных полей для "повторный брак".
- **Document — не отдельная таблица** — `Media.kind = 'document'` +
  `Media.documentMetadata: jsonb`. Выделять в отдельную таблицу только если
  появится сложная document-specific логика (версии, OCR-текст).
- **PartialDate — не таблица** — composed columns (`*_year`/`*_month`/`*_day`/
  `*_precision`/`*_approximate`) на Person/Event/Relationship, инкапсулированные
  в `src/domain/shared/partial-date.ts`. Репозитории не должны трогать сырые
  колонки напрямую вне этого модуля.

## ER-диаграмма (текстовая)

```
users (Auth.js managed: id, email, password_hash, ...)
accounts / sessions / verification_tokens   -- стандартные таблицы Auth.js Drizzle adapter

families
  id PK, name, description, plan_tier default 'free', created_by FK->users, timestamps

family_members
  id PK, family_id FK->families CASCADE, user_id FK->users CASCADE,
  role CHECK(owner|editor|viewer), invited_by FK->users SET NULL, joined_at
  UNIQUE(family_id, user_id); INDEX(user_id); INDEX(family_id)

places
  id PK, family_id FK->families CASCADE, name, description,
  latitude/longitude numeric NULL, country, region
  INDEX(family_id)

persons
  id PK, family_id FK->families CASCADE,
  first_name/last_name/middle_name/maiden_name/nickname,
  gender CHECK(male|female|unknown|other), is_placeholder bool, is_living bool,
  birth_date_{year,month,day,precision,approximate}, death_date_{...} (PartialDate columns),
  birth_place_id/death_place_id FK->places SET NULL,
  description, religion, nationality,
  photo_media_id uuid (NO FK constraint — see note below),
  privacy_level CHECK(private|family|public) default 'family',
  created_by FK->users, timestamps
  INDEX(family_id); INDEX(family_id, last_name, first_name);
  [raw SQL migration] GIN trigram index for fuzzy name search (see § Search)

relationships_parent_child
  id PK, family_id FK->families CASCADE,
  parent_id FK->persons CASCADE, child_id FK->persons CASCADE,
  parent_role CHECK(biological|adoptive|step|unknown)
  UNIQUE(parent_id, child_id); INDEX(child_id) [ancestors]; INDEX(parent_id) [descendants]
  CHECK(parent_id <> child_id)

relationships_partnership
  id PK, family_id FK->families CASCADE,
  person1_id/person2_id FK->persons CASCADE,
  status CHECK(married|divorced|widowed|partnered|separated),
  start_date_{...}/end_date_{...} (PartialDate), is_current bool
  INDEX(person1_id); INDEX(person2_id); CHECK(person1_id <> person2_id)
  -- НЕТ unique(person1_id, person2_id): допускает развод + повторный брак

events
  id PK, family_id FK->families CASCADE,
  type CHECK(birth|death|marriage|divorce|baptism|migration|emigration|
             education|military_service|war|occupation|imprisonment|other),
  title, description, date_{...}/end_date_{...} (PartialDate),
  place_id FK->places SET NULL, privacy_level default 'family', created_by, created_at
  INDEX(family_id, type); INDEX(family_id, date_year)

event_participants
  id PK, event_id FK->events CASCADE, person_id FK->persons CASCADE, role text
  UNIQUE(event_id, person_id, role); INDEX(person_id)

media
  id PK, family_id FK->families CASCADE,
  kind CHECK(photo|video|audio|document), storage_key, storage_provider,
  mime_type, size_bytes, width/height/duration_seconds,
  title, description, document_metadata jsonb NULL,
  privacy_level default 'family', uploaded_by FK->users, created_at
  INDEX(family_id)

media_person/media_event/media_place/media_story  -- join-таблицы, UNIQUE(media_id, X_id), CASCADE

stories
  id PK, family_id FK->families CASCADE, title, body, privacy_level default 'family',
  author_id FK->users, timestamps
  INDEX(family_id)

story_person/story_event/story_place  -- join-таблицы, UNIQUE(story_id, X_id), CASCADE
```

**Cascade-политика**: всё, что "принадлежит" Family — `ON DELETE CASCADE` от
`family_id` (удаление Family полностью очищает данные). Опциональные
"обогащающие" ссылки (`birth_place_id`, `event.place_id`) — `ON DELETE SET NULL`.
Связи между основными сущностями графа (`parent_child`, `partnership`,
`event_participants`, join-таблицы media/story) — `ON DELETE CASCADE` от
Person/Event/Media/Story.

**`persons.photo_media_id` без FK constraint**: `person.ts` и `media.ts` иначе
образовали бы циклический module-import (Media ссылается на Person через
`media_person`, Person ссылается на Media для фото профиля). Связь проверяется
на уровне приложения (`person.service.ts` валидирует, что указанная Media
существует и принадлежит той же семье, прежде чем присвоить `photoMediaId`).

**Source of truth vs derived**: source of truth — `relationships_parent_child`,
`relationships_partnership`, все поля Person/Event/Media/Story. Derived (никогда
не хранится): sibling-связи, ancestors/descendants, relationship path,
"текущий супруг".

## ORM: Drizzle, не Prisma

- Тонкий query builder без отдельного query-engine бинарника — важно для
  serverless cold start (Vercel Functions + Neon).
- Нативная поддержка `db.execute(sql\`WITH RECURSIVE ...\`)` — критично для
  ancestors/descendants/relationship-path (см. ниже), у Prisma нет
  first-class recursive CTE API.
- SQL-миграции читаемы и ревьюабельны в PR.
- Официальный `@auth/drizzle-adapter` для Auth.js v5.

## Ancestors / Descendants / Relationship Path

**PostgreSQL recursive CTE, без отдельной graph DB (Neo4j не нужен)** —
индексированные FK на `parent_id`/`child_id` делают recursive CTE быстрым на
реалистичных объёмах (сотни-тысячи Person на семью). `maxDepth`-параметр
ограничивает глубину рекурсии как защиту от pathological data.

Живёт в `domain/relationship/graph.service.ts`:

```sql
WITH RECURSIVE ancestors AS (
  SELECT parent_id, child_id, 1 AS depth
  FROM relationships_parent_child WHERE child_id = :personId
  UNION ALL
  SELECT pc.parent_id, pc.child_id, a.depth + 1
  FROM relationships_parent_child pc
  JOIN ancestors a ON pc.child_id = a.parent_id
  WHERE a.depth < :maxDepth
)
SELECT DISTINCT parent_id FROM ancestors;
```

Descendants — то же самое зеркально (обход `parent_id → child_id`).

`computeRelationshipPath(personAId, personBId)` (domain-only, без UI в MVP):
1. Построить ancestors(A) и ancestors(B) с глубиной каждого предка.
2. Найти lowest common ancestor(s) (пересечение множеств в JS/TS — множества
   обычно маленькие, не требует SQL-level intersection).
3. По глубинам (depthA, depthB) определить relationship label через таблицу
   правил (sibling / uncle-aunt / cousin / N-й кузен K-го колена).
4. Partnership обрабатывается как "in-law"-модификатор поверх кровного пути.

## Search

MVP: Postgres `pg_trgm` extension + GIN-индекс на конкатенированное имя —
fuzzy/typo-tolerant поиск без внешнего search engine. Добавляется как raw SQL
миграция (Drizzle не имеет декларативного builder для trigram-индексов):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX persons_name_trgm_idx ON persons
  USING gin ((coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(maiden_name,'')) gin_trgm_ops);
```

Путь расширения позже (не сейчас): `tsvector` для description/story body,
затем внешний движок (Meilisearch/Typesense) как альтернативная реализация
того же `search.service.ts` interface — вызывающий код не меняется.

## Media storage

`StorageService` interface (`domain/media/storage.service.ts`):
```ts
interface StorageService {
  upload(input: { key: string; file: Buffer | ReadableStream; contentType: string }): Promise<{ storageKey: string }>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, opts?: { expiresInSeconds?: number }): Promise<string>;
}
```
Провайдер MVP — **Vercel Blob** (нулевая инфраструктурная конфигурация,
встроенный direct-upload flow с server-issued token). `Media.storage_provider`
колонка допускает будущую миграцию на Cloudflare R2 (дешевле для видео/большого
объёма) без переписывания domain-кода — постепенно, старые записи держат
`'vercel_blob'`, новые — `'r2'`.

## Auth/authorization

- Auth.js v5 (`next-auth@5.0.0-beta.32`, версия зафиксирована точно, не `^`,
  т.к. v5 всё ещё в статусе beta), `@auth/drizzle-adapter`, **database sessions**
  (не JWT) — нужна server-side инвалидация при смене роли/удалении участника;
  family-scoped действия и так всегда бьют в БД через `requireFamilyAccess`,
  так что JWT не даёт реальной экономии здесь.
- **`requireFamilyAccess(familyId, userId, minRole)`** (`domain/family/access.ts`) —
  единственная точка проверки доступа. Каждый server action начинается с этого
  вызова до любого чтения/записи. Покрыт unit-тестами
  (`src/domain/family/access.test.ts`) для всех комбинаций роль×minRole.
- Все repository `getById`-методы фильтруют `WHERE id = :id AND family_id = :familyId`
  **в одном запросе** — подмена id из чужой Family возвращает `null`, не утечку.

## Риски и принятые митигации

| Риск | Митигация |
|---|---|
| Циклы/противоречивые relationships | Валидация в `relationship.service.ts`: self-reference CHECK в БД, ancestors-check перед вставкой parent_child против циклов |
| Производительность recursive CTE при росте данных | Индексы уже в схеме, `maxDepth` limit, `EXPLAIN ANALYZE` на реалистичных тестовых данных перед продакшеном |
| GEDCOM incompatibility в будущем | Поля структурированы для прямого маппинга (`INDI`→Person, `FAM`→partnership+дети, `BIRT/DEAT`→Event) — mapping-документ пишется, когда фича берётся в работу |
| IDOR / privacy leak через join-таблицы | Обязательный `familyId` как первый аргумент в каждой repository-функции, единый паттерн `WHERE id=... AND family_id=...` |
| Auth.js v5 в статусе beta | Версия зафиксирована точно в package.json |

## Тестовая стратегия

Vitest, приоритет — доменная логика и безопасность, не coverage.

- **Unit**: `relationship.service.ts` (валидные/невалидные связи, циклы,
  множественные партнёрства), `graph.service.ts` (ancestors/descendants на
  сконструированной фикстуре), `computeRelationshipPath` (известные кейсы),
  `partial-date.ts`, `access.ts` (все комбинации роль×minRole) — уже покрыто.
- **Интеграционные** (тестовая Neon-ветка/контейнер): family isolation/IDOR,
  cascade-поведение при удалении Family, privacy-фильтрация.
