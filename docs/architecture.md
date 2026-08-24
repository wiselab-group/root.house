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

## Family slug (короткий URL)

`families.slug` — человекочитаемый, глобально уникальный handle
(`text not null`, unique index), позволяющий открыть семью по короткой ссылке
`/families/kupczyk` вместо `/families/<uuid>`.

Решения и обоснования:

- **`slug` заменяет `familyId` прямо в сегменте `/families/[slug]`**, а не
  живёт под отдельным префиксом (`/family/...`) или отдельным тонким
  redirect-роутом — обе эти промежуточные схемы обсуждались и были
  сознательно отклонены: они оставляли в адресной строке два разных URL для
  одной семьи (UUID после навигации, slug только на карточке), что хуже,
  чем просто один канонический вид. Итоговая реализация — полная миграция:
  каждый файл под `app/(app)/families/[familyId]/**` физически переехал на
  `[slug]`, layout резолвит `slug → familyId` один раз
  (`lib/resolve-family-slug.ts::resolveFamilyIdBySlug`, обёрнуто в
  `React.cache` — каждая вложенная `page.tsx` получает `params` независимо
  от родителя и должна резолвить сама, кэш избавляет от повторных запросов
  в рамках одного рендера), дальше всё как раньше — `requireFamilyAccess`
  на резолвленном `familyId`. Резолв slug сам по себе не привилегированная
  операция: угаданный чужой slug приводит к тому же 404, что и угаданный
  UUID.
- **`familyId` не исчез из кода** — domain-слой, repositories, server
  actions продолжают работать с `familyId` (первичный ключ, нужен в каждом
  SQL-запросе и в `requireFamilyAccess`). `slug` нужен только там, где
  строится URL: `href`/`Link` в компонентах и `redirect()`/`revalidatePath()`
  в actions после мутации. Для последнего — `getFamilySlugById(familyId)`
  (обратный к `getFamilyIdBySlug`), вызывается в actions в конце, перед
  построением пути.
- **`/families/new` — зарезервированный статический сегмент**, соседствующий
  с динамическим `[slug]` на том же уровне; Next.js резолвит статический
  путь в приоритете, но `"new"` всё равно входит в `RESERVED_SLUGS`
  (`domain/family/slug.ts`), чтобы ни одна семья не могла получить slug,
  теневой к этому маршруту.
- **Генерация: транслитерация + ручное редактирование.** При создании семьи
  slug выводится из `name` (`domain/family/slug.ts::slugify` —
  побуквенная кириллица→латиница таблица, т.к. имена семей на русском) с
  добавлением `-2`/`-3` при коллизии (`ensureUniqueSlug`). Владелец
  (`role: owner`) может переименовать slug из дашборда семьи в любой момент
  — смена URL это осознанно более чувствительное действие, чем
  редактирование Person/Event, поэтому `requireFamilyAccess(..., "owner")`,
  а не обычный `"editor"`.
- **Формат** — `^[a-z0-9]+(-[a-z0-9]+)*$`, 2-64 символа, без слов из
  `RESERVED_SLUGS` (синхронизируется вручную с сегментами `src/app`).
- **Бэкфилл существующих строк** — `slug` добавлен как nullable, заполнен
  детерминированным `family-<8 hex chars of id>` для строк, созданных до
  этой фичи, и только потом переведён в `NOT NULL` + unique index
  (`0002_rare_black_bird.sql`, ручная миграция по той же причине, что и
  `0001_search_trgm_index.sql` — многошаговый DDL, который drizzle-kit
  generate не выразит декларативно).

## Person slug (короткий URL внутри семьи)

`persons.slug` — тот же принцип, что и `families.slug`, но с ключевым
отличием: **уникален только в рамках одной семьи** (`unique(family_id, slug)`,
не глобальный unique), поэтому `/families/kupczyk/people/aleksandr` — не
`/people/[slug]` без scope. Общие примитивы (транслитерация, формат,
`ensureUniqueSlug`) вынесены в `domain/shared/slugify.ts` и переиспользуются
`domain/family/slug.ts` и `domain/person/slug.ts`, чтобы не дублировать
таблицу кириллица→латиница дважды.

Решения и обоснования:

- **Почему family-scoped, не глобальный.** Тёзки — норма для родословной
  (в одной большой семье легко встретить двух Александров через поколения);
  требовать глобальную уникальность имени человека по всему приложению
  было бы абсурдным ограничением. `/families/[slug]/people/[slug]` даёт
  каждому person'у короткий адрес без этой проблемы — коллизия возможна
  только с однофамильцем/тёзкой в той же самой семье, и там же решается
  суффиксом `-2`/`-3` (`ensureUniqueSlug`, тот же алгоритм, что и у семьи).
- **Slug строится только из имени (first name), не фамилии.** Короткий
  результат (`alexander`, не `alexander-kupchik`) — то, что запрашивалось;
  добавление фамилии почти не снижает число коллизий в генеалогических
  данных (в дереве часто все носят одну фамилию), так что оно того не
  стоило бы даже с точки зрения чистой статистики.
- **Placeholder-персоны и полностью безымянные записи** — детерминированный
  `person-<8 hex chars of id>`, тот же паттерн, что и в family-slug backfill:
  нет лингвистического материала для транслитерации в принципе.
- **`getFamilySlugById`/`getPersonSlugById`** — server actions по-прежнему
  принимают `familyId`/`personId` (первичные ключи, нужны для queries и
  `requireFamilyAccess`); эти функции резолвят обратно в slug только там, где
  реально нужно построить `redirect()`/`revalidatePath()` после мутации —
  без них `revalidatePath` инвалидировал бы несуществующий
  `id`-based путь и не тронул бы реально закэшированную `slug`-based страницу.
- **Ручное переименование** (`renamePersonSlug`) разрешено с роли `editor`
  (не `owner`, как у семьи) — смена slug одного person'а куда менее
  чувствительна: она не ломает ссылки на семью целиком, только на одну
  конкретную страницу профиля.
- **Бэкфилл существующих строк** — тот же двухшаговый паттерн, что и у
  семьи (`0003_striped_prowler.sql`: nullable → заполнить → `NOT NULL` +
  unique), но с апгрейдом: одноразовый TS-скрипт (не сохранён в репозитории,
  запускался вручную при внедрении фичи) сразу после миграции заменил
  временные `person-<id>` слаги на настоящие, транслитерированные из уже
  сохранённых имён — SQL сам по себе не может сделать кириллица→латиница
  транслитерацию, а TS-код с уже готовой `slugifyPerson()` — может.

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

**Важное ограничение `neon-http` драйвера — НЕТ поддержки multi-statement
транзакций** (`db.transaction(...)` бросает `"No transactions support in
neon-http driver"` во время выполнения, не на этапе typecheck). Там, где
нужна атомарность нескольких INSERT/UPDATE (например создание Family +
первого FamilyMember-owner одновременно), использовать **один SQL-стейтмент
с CTE** (`WITH ... INSERT ... RETURNING ... INSERT ... SELECT FROM ...`) —
Postgres гарантирует атомарность в пределах одного стейтмента без явной
транзакции. Пример — `family.service.ts::createFamily`. Если в будущем
понадобятся более сложные multi-statement транзакции, придётся переходить на
`drizzle-orm/neon-serverless` (WebSocket-driver, поддерживает транзакции, но
менее edge-совместим) для конкретных операций.

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

## Family Tree visualization

Трёхслойная развязка (domain → adapter → viz-компонент), чтобы `@xyflow/react`
не диктовал структуру БД:

1. `domain/tree/tree-layout.builder.ts` — чистый TS, `buildFocusTreeLayout()`:
   генерационный BFS от focus-person (предки вверх, потомки вниз, партнёры
   рядом с партнёром, siblings подтягиваются отдельным шагом — BFS по
   parent_child-рёбрам сам по себе их не находит, т.к. они не предки и не
   потомки focus-person). Выход — библиотеко-агностичный `TreeLayoutGraph`.
2. `components/tree/adapters/xyflow-adapter.ts` — единственный модуль,
   которому разрешено импортировать `@xyflow/react`; конвертирует
   `TreeLayoutGraph` → `Node`/`Edge`.
3. `components/tree/tree-canvas.tsx` — zoom/pan/minimap, тот же на mobile и
   desktop (touch pan/pinch-zoom из коробки от `@xyflow/react`), клик/тап-
   навигация пишет `?focus=personId` в URL (не в client state) — shareable
   deep link, кнопка "назад" браузера работает бесплатно. Одна реализация,
   один DOM-дерево на экран — никакого отдельного mobile-рендера.

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
Провайдер MVP — **Vercel Blob** (нулевая инфраструктурная конфигурация).
`Media.storage_provider` колонка допускает будущую миграцию на Cloudflare R2
(дешевле для видео/большого объёма) без переписывания domain-кода —
постепенно, старые записи держат `'vercel_blob'`, новые — `'r2'`.

**Загрузка идёт через собственный сервер, не через прямой browser→Blob
client-token upload**, вопреки первоначальному предположению плана — важная
находка при реализации: Vercel Blob SDK's client-token flow
(`generateClientTokenFromReadWriteToken`/`handleUpload`) не поддерживает
`access: 'private'` — `GenerateClientTokenOptions` не имеет поля `access`,
т.е. любой файл, загруженный этим путём, становится публичным. Это
конфликтует с жёстким требованием "private/family по умолчанию, никогда
public без явного действия" — особенно для фото. Поэтому:
- `POST /api/media/upload` (Route Handler, не Server Action — у Server
  Actions маленький дефолтный лимит тела запроса, непригодный для файлов) —
  принимает multipart FormData, проверяет `requireFamilyAccess`, вызывает
  `storage.upload(..., access: 'private')`.
- `GET /api/media/[mediaId]?familyId=...` — стримит приватный blob обратно,
  тоже после `requireFamilyAccess`. Ссылки на фото в UI всегда указывают
  сюда, никогда на прямой Blob URL — угадываемого публичного URL на фото не
  существует в принципе.
- `StorageService.getSignedUrl()` у Vercel Blob implementation намеренно не
  реализован (throws) — private-доступ Blob не выдаёт presigned URL в
  привычном S3-смысле; авторизация происходит на каждый запрос через
  `/api/media/[id]`, а не через одноразовую подписанную ссылку. Метод
  оставлен в интерфейсе для будущего провайдера (напр. R2 с реальными
  presigned URLs), который сможет реализовать его осмысленно.

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
