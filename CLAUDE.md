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

Тёплая «семейная» палитра реализована (`src/app/globals.css`) — один тёплый
акцент (терракота, OKLCH hue 45), тёплые нейтральные (кремовый фон, тёплый
графитово-коричневый текст), НЕ стартаперский сине-фиолетовый градиент.
Generation color-coding в дереве — тот же hue, lightness/chroma по
`|generation|`-расстоянию от focus (см. DESIGN.md § Color Tokens для точных
значений и WCAG-проверки). Заголовки — Lora (`.font-heading`), UI — Geist
Sans; оба с кириллическим subset (весь интерфейс на русском).

Все цвета — только через `var(--color-name)`, никаких raw hex в компонентах.

## ANIMATION RULES

- Hardware acceleration ONLY: transform и opacity. Никогда top/left/width/height.
- will-change: transform, opacity — только на активно анимирующихся узлах
- Переходы focus-person в дереве — только transform (translate/scale),
  никогда полный re-layout всех nodes одновременно (stagger по расстоянию от нового focus)
- Всегда реализовывать `prefers-reduced-motion` fallback

## TREE LAYOUT RULES

### Модель ядра

`src/domain/tree/layout/` — единственная production-реализация layout'а
(custom recursive engine, не dagre/elk; более ранние независимые попытки —
tree-v2/tree-v3/tree-v4 — удалены). `src/domain/tree/tree-layout.builder.ts`
содержит только общий `TreeLayoutGraph`-контракт типов; DB-строки заводятся
в движок через `src/domain/tree/tree-adapter.ts` (`toTreeFamilyGraph` →
`buildTreeLayout` → `fromTreeLayout`), и то же самое можно вызвать целиком
на клиенте (`buildClientTreeLayout`, `tree-adapter.ts`) для клиентской смены
фокуса без серверного round-trip — см. «Смена фокус-персоны» ниже.

Дерево растёт «как природное»: единый рекурсивный примитив
`growBranch(ctx, personId, direction, anchor)` (`subtree.ts`) размещает
ветку локально от родителя/пары в одном из двух направлений —
`"down"` (потомки) или `"up"` (предки) — резервируя место в
пространственном индексе (`OccupancyModel`, `occupancy.ts`) перед
фиксацией позиции, а не постфактум разруливая коллизии. `placement.ts`
(тонкий оркестратор, ~100 строк) вызывает `growBranch` в обе стороны от
фокуса, затем `growInLawAncestors` (подхватывает предков супругов,
найденных при спуске вниз) и `repairSideConstraintViolations`
(пост-размещенческий проход — см. «Эластичный Y» ниже).

- `generation: number` — BFS-расстояние от фокуса (0 = фокус, +N =
  потомки, −N = предки), назначается один раз в `normalizeGraph`
  (`graph.ts::assignGenerations`) — **мягкий хинт** для группировки по
  строкам и цвета по поколению (`generationColor` в `person-node.tsx`), не
  жёсткий инвариант. Итоговый `y` — непрерывная координата, вычисляемая
  рекурсивно как `anchor.y ± GENERATION_GAP` внутри `growBranch`, а не
  `generation * GENERATION_GAP` напрямую.
- `branch: "focus" | "paternal" | "maternal" | "descendant" | "unknown"` —
  назначается одновременным BFS flood-fill от обоих прямых родителей
  фокуса (`graph.ts::assignBranches`) — единственный источник, откуда
  `growBranch("up")` читает directional bias (`ancestorSideBias`): paternal
  всегда ищет влево, maternal — всегда вправо.
- **Эластичный Y** (§7 Stage 4 плана): когда обычный X-поиск на
  естественном ряду исчерпан, `OccupancyModel.findFreeSlot`
  (`occupancy.ts`) пробует тот же X-поиск на ряду, сдвинутом на
  ограниченный шаг вверх/вниз (`MAX_Y_NUDGE` — до половины
  `GENERATION_GAP` в каждую сторону), вместо жёсткого «первое свободное
  место на этом самом ряду». После полного размещения graph'а
  `repairSideConstraintViolations` (`subtree.ts`) — пост-размещенческий
  проход, который находит нарушения «отцовская линия не строго слева» /
  «чужой человек между кровными сиблингами» и сдвигает весь уже
  размещённый поддерево нарушителя на свободный ряд, если это не создаёт
  новых коллизий.

### 9 инвариантов — гарантируются построением, не пост-хок патчами

1. **Линии-коннекторы никогда не пересекаются** — гарантируется тем, что
   `growBranch` всегда резервирует поддерево ветки как один непрерывный
   блок перед переходом к следующему сиблингу; порядок по x внутри ряда
   структурно совпадает с порядком обхода.
2. **Карточки никогда не накладываются** (приоритетнее правила выше) —
   двойная защита: `OccupancyModel` отклоняет любой не полностью свободный
   слот превентивно, и `assertNoOverlaps` (`collision.ts`) — финальный
   жёсткий assert в конце `buildTreeLayout`.
3. **Дети всегда рядом с родителями** — якорь ряда детей всегда прямая
   функция от `x` уже размещённого partnership. Отдельный пробел был
   подтверждён на реальных данных (не только синтетике): единственный
   ребёнок без сиблингов/супруга мог уехать на тысячи px от родителей, если
   его естественный ряд плотно занят чужой веткой (occupancy-поиск в
   `growChildrenRowDown` сам по себе не ограничен по дальности) — коллизий
   и нарушений остальных инвариантов при этом не было, но связь
   родитель-ребёнок визуально не читалась как «рядом», и ни
   `repairSideConstraintViolations`, ни его during-placement проверки эту
   форму не ловили (только side-constraint и interleaved-sibling). Закрыто
   третьим видом пост-размещенческого прохода в той же функции —
   `findFirstFarFromParentViolator`/`tryRaiseAncestorBranchForChild`
   (`subtree.ts`, с `tryMoveChildNearParent` как fallback): для
   одинокого бездетного листа (без своего супруга/детей и без размещённых
   кровных сиблингов на ряду — не трогает случаи, где нужно двигать весь
   ряд целиком) **приоритет — держать семью визуально вместе**, а не искать
   ребёнку далёкое свободное место: сначала пытаемся поднять ВСЮ ветвь
   предков родителя (`collectAncestorBranchIds` — родитель, его супруг(а) и
   вся цепочка ИХ предков выше, но не боковые линии/сиблинги) на N шагов по
   `GENERATION_GAP` (перебор 1, 2, 3 шага, вверх раньше вниз), пока не
   найдётся сдвиг, под которым и сама ветвь, и новая позиция ребёнка прямо
   под её junction свободны — весь сдвиг проверяется на коллизии ДО
   коммита, атомарно (частичный сдвиг без проверки самого ребёнка — баг,
   пойманный на реальных данных при первой версии этого прохода). Это
   **не** привязка к конкретному дискретному поколению — просто больший
   шаг элестичного Y (кратный `GENERATION_GAP`, не заранее выбранная
   «нужная» строка), консистентный с общим принципом «эластичный Y, никогда
   жёсткая привязка к ряду поколения». Только если раскрутить ветвь предков
   не удаётся вовсе (например, у родителя нет собственных предков в графе)
   — fallback на `tryMoveChildNearParent`: 2D-поиск (X и Y) свободного
   слота рядом с junction, не требующий точного совпадения x. См. память
   `tree-layout-downward-strand-gap` за историей находки и ревизий фикса на
   реальных данных (family Ушкар/Свидунович) — там же зафиксирован главный
   урок: сравнивать с `main` по фактическим числам, а не полагаться на
   «нет коллизий» как критерий готовности.
4. **Отцовская линия строго слева / материнская строго справа** —
   `ancestorSideBias`/`sideConstraintOk` (`subtree.ts`) как единственная
   точка, откуда `growBranch("up")` читает directional bias; проверяется
   инвариант-чекером `findSideConstraintViolation` (`invariants.ts`).
5. **Родные сиблинги рядом** — `growSiblingRow`/`growChildrenRowDown`
   размещают весь ряд детей одной партнёрской пары за один проход, в
   порядке `childrenIds`, как непрерывный блок.
6. **≥2x зазор между несвязанными семьями на одном ряду** —
   `INTER_FAMILY_GAP` (`= 2 * SPOUSE_GAP`, `subtree.ts`) передаётся как
   `gap` при межветочном поиске места; внутри одной ветки используется
   более узкий `SIBLING_GAP`.
7. **Супруги всегда рядом, стандартный `SPOUSE_GAP`, никогда не
   разводятся** — партнёрство резервируется как единая атомарная единица
   (`ownWidth = CARD_WIDTH*2 + SPOUSE_GAP`) — в `growBranch` физически нет
   пути, который двигает одного супруга независимо от другого.
8. **Фокус-персона всегда в центре (x=0)** — `placeGraph` резервирует
   слот фокуса первым, до любого другого вызова `growBranch`.
9. **Родители центрируются по всему ряду детей** —
   `growPersonBranchUp`/`growChildrenRowDown` сначала достраивают ПОЛНЫЙ
   ряд сиблингов/детей, и только потом вычисляют `idealX` родителей как
   среднее по всему готовому ряду — никогда по одному ребёнку, попавшему в
   граф первым.

### Новое поведение (переписывание движка, `tree-layout-rewrite`)

- **Эластичный Y** — см. «Модель ядра» выше. Заменяет старый дискретный
  подход (поднять всю предковую цепочку на одно поколение и перезапустить
  весь layout целиком, см. «Удалено этим переписыванием» ниже) на
  локальный, ограниченный сдвиг без второго полного прохода.
- **Collapse/expand потомков** — `components/tree/use-collapsed-branches.ts`
  (чисто клиентский, эфемерный `Set<string>` свёрнутых корневых id,
  никогда не персистится в БД/URL — каждое открытие дерева полностью
  развёрнуто) + `components/tree/prune-collapsed.ts`
  (`pruneCollapsedDescendants` — чистая функция, обрезает уже готовый,
  спозиционированный `TreeLayoutGraph` по дереву `parent_child`-рёбер вниз
  от свёрнутого id; **не** перезапускает layout-движок — карточки вокруг
  свёрнутой ветки НЕ сдвигаются компактнее, просто ветка скрывается).
  Только вниз (потомки) — предки и боковые ветки не сворачиваются.
  Бейдж «+N» на карточке — `person-node.tsx`/`person-node-parts.tsx`.
  Текущий фокус никогда не скрывается сворачиванием своего же предка
  (явный rescue в `pruneCollapsedDescendants`).
- **Виртуализация** — `onlyRenderVisibleElements` включён в
  `tree-canvas.tsx`. `RelationshipEdge`/`UnionChildEdge` читают геометрию
  узлов из `TreeLayoutPositionsContext`
  (`components/tree/tree-layout-positions-context.tsx`) — committed
  позиции из `nodes` (те же, что XYFlow уже обновляет на каждый кадр
  drag через `onNodesChange`), а не через `useInternalNode`'s
  DOM-измеренный `measured`, который «протухает» на короткое время при
  ремонте карточки, покидающей и возвращающей viewport.
- **Смена фокус-персоны** — клиентская, без полной перезагрузки страницы.
  `tree-canvas.tsx::setFocus` вызывает `buildClientTreeLayout`
  (`tree-adapter.ts`) синхронно на уже отданном клиенту сыром графе
  (`getRawTreeGraph`, `tree.service.ts` — узкий, privacy-safe срез
  `PersonRecord`, см. `TreePersonClientPayload`'s свой doc-комментарий),
  обновляет URL через `router.replace` (не `push` — не плодит историю) и
  плавно панорамирует/зумит (`FocusViewport` в `tree-canvas.tsx`, XYFlow's
  `setCenter` с `duration`) на новый фокус — с честным
  `prefers-reduced-motion` fallback (`use-reduced-motion.ts`). Позиции
  самих карточек при этом не анимируются (мгновенный snap на новые
  координаты) — анимируется только viewport.
- **Multi-marriage** — несколько партнёрств одного человека размещаются
  side-by-side через `growSpouseOwnPartnershipsDown`/`...Up`
  (`subtree.ts`), с `REMARRIAGE_GAP` между ветками. Хронологический
  порядок (`marriageOrder`) в `Partnership` пока не вычисляется реально
  (`normalizeGraph` всегда ставит `0` — есть в типе, не подключено).
- **Adoptive/non-biological родительство** (`parentRole`) — поле есть в
  типах (`Relationship.parentRole`, `LayoutEdge.parentRole`), но ещё не
  прокинуто до рендера пунктирной линии — вне объёма текущего
  переписывания движка (`tree-adapter.ts`/`xyflow-adapter.ts` до сих пор
  не читают его на выходе).
- **Развод = пунктирная линия — уже реализовано, до этого переписывания**.
  `PartnershipEdgeLine` (`relationship-edge.tsx`) всегда рисует партнёрскую
  линию пунктиром (`"5 3"` — текущий брак, `"2 4"` — бывший/divorced);
  сплошных партнёрских линий не существует вообще. Не переизобретать.
- **Порядок для однополых пар** (`orderingKeyByPersonId` из
  `PersonRecord.createdAt`) — поле есть в `FamilyGraph`, но
  `shouldBeLeft` (`graph.ts`) его пока не читает (по-прежнему male <
  unknown < female, tie-break по id).
- **Лимит карточек** — бизнес-правило на создание Person (free — 200,
  paid — без ограничения), не ограничение самого движка; движок не
  протестирован на этом масштабе как отдельный stress-тест (§8d плана не
  реализован).

### Удалено этим переписыванием — не ре-изобретать

`placement.ts`'s старая ~1700-строчная построчная модель предков (24
функции с спецкейс-фиксами на конкретные исторические баги, каждая — под
свою специфичную комбинацию условий) — полностью удалена и заменена
унифицированным `growBranch("up")`, который покрывает то же самое по
построению (см. «9 инвариантов» выше), плюс единый пост-размещенческий
`repairSideConstraintViolations` вместо отдельного дискретного
«поднять предковую цепочку на поколение и перезапустить весь layout»
прохода (см. «Эластичный Y» выше). `edges.ts` (модуль сборки edge-спеков)
удалён — не имел ни одного потребителя вне `layout.ts`'s собственного
ре-экспорта; рёбра для рендера строятся из сырых DB-строк напрямую в
`tree-adapter.ts::fromTreeLayout`. Если в git-истории встретится ссылка на
имя функции из старой модели — она удалена безвозвратно, смотреть текущую
реализацию в `subtree.ts`/`placement.ts`, не пытаться найти удалённый файл.

Тестовая стратегия: property-based глобальные инварианты на множестве
случайных графов (`invariants.property.test.ts` + `random-graph.ts` —
основной способ ловить регрессии) + сохранённый реальный 58-человек
фикстур (`fixture.ts`, `layout.test.ts`) как regression-baseline + точечные
синтетические кейсы (`test-fixtures.ts`) на конкретные исторически сложные
паттерны. При отладке layout-багов — сначала воспроизводить на реальных
данных из Neon (`getFocusTreeLayout`/`getRawTreeGraph`), не только на
синтетике: синтетические репро могут случайно не задеть нужную комбинацию
условий (пример: пробел из пункта 3 выше найден именно так).

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
- `db.transaction(...)` — `neon-http` драйвер не поддерживает транзакции; для
  атомарных multi-table операций использовать один SQL-стейтмент с CTE
  (см. `family.service.ts::createFamily`, `docs/architecture.md`)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
