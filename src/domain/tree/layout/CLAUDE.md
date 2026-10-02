# TREE LAYOUT RULES — движок раскладки дерева

Подробная история каждого решения (какие баги, на каких данных, что
отклонено) — `docs/tree-layout-history.md`. Здесь — только действующие правила.

## Модель ядра

- Этот каталог — единственная production-реализация layout'а (свой
  рекурсивный движок, не dagre/elk). tree-v2/v3/v4 и старая ~1700-строчная
  построчная модель предков в `placement.ts` удалены безвозвратно — не
  искать их функции из git-истории, не ре-изобретать. `edges.ts` тоже удалён:
  рёбра для рендера строятся в `tree-adapter.ts::fromTreeLayout`.
- Поток: `tree-adapter.ts` (`toTreeFamilyGraph` → `buildTreeLayout` →
  `fromTreeLayout`); `tree-layout.builder.ts` — только общий
  `TreeLayoutGraph`-контракт. `buildClientTreeLayout` — тот же путь на
  клиенте для смены фокуса без round-trip.
- Единый примитив `growBranch(ctx, personId, "down" | "up", anchor)`
  (`subtree.ts`) резервирует место в `OccupancyModel` (`occupancy.ts`) ДО
  фиксации позиции — коллизии предотвращаются, а не разруливаются потом.
- `placement.ts` (~100 строк) — оркестратор: фокус → `growBranch` в обе
  стороны → `growInLawAncestors` → `repairSideConstraintViolations`.
- `generation` (`graph.ts::assignGenerations`) — мягкий хинт для группировки
  рядов, не жёсткий инвариант. Итоговый `y` — непрерывный, `anchor.y ±
GENERATION_GAP`, а не `generation * GENERATION_GAP`.
- `branch` (`graph.ts::assignBranches`, BFS от обоих родителей фокуса) —
  единственный источник directional bias: paternal — влево, maternal — вправо.
- **Эластичный Y**: если X-поиск на ряду исчерпан, `findFreeSlot` пробует
  ряд со сдвигом до `MAX_Y_NUDGE` (½ `GENERATION_GAP`). Никогда жёсткая
  привязка к дискретному ряду поколения; никогда «поднять цепочку и
  перезапустить весь layout».

## 9 инвариантов — гарантируются построением

1. **Коннекторы не пересекаются** — поддерево ветки резервируется одним
   непрерывным блоком до перехода к следующему сиблингу.
2. **Карточки не накладываются** (приоритетнее п.1) — `OccupancyModel` +
   финальный `assertNoOverlaps` (`collision.ts`).
3. **Ребёнок строго под родителями.** Одинокий бездетный лист, стоящий не
   ровно под junction.x, всегда чинится (`findFirstFarFromParentViolator`,
   триггер — `FAR_FROM_PARENT_X_EPSILON`, НЕ числовой порог «насколько
   далеко»). Порядок: `tryRaiseAncestorBranchForChild` поднимает ВЕСЬ ряд
   поколения родителя (со всеми их ветками предков) на 1–3 шага
   `GENERATION_GAP`, вверх раньше вниз, проверяя весь сдвиг + ребёнка
   атомарно до коммита; свободность проверяется по `positionByPerson`, а НЕ
   по `junctionByPartnership`. Поднимать только пару родителя — нельзя
   (отрывается от ровесников). Fallback — `tryMoveChildNearParent`.
4. **Отцовская линия строго слева, материнская строго справа** —
   `ancestorSideBias`/`sideConstraintOk` (`subtree.ts`), проверка —
   `findSideConstraintViolation` (`invariants.ts`).
5. **Родные сиблинги рядом** — ряд детей пары ставится за один проход по
   `childrenIds`. Кровный родственник — со стороны якоря ряда, супруг — с
   дальней, независимо от пола (`personIsLeftOverride`). Курсор МЕЖДУ
   единицами ряда — всегда `compactWidth`, никогда `totalWidth` (иначе
   глубокое поддерево растаскивает сиблингов на тысячи px); `totalWidth`
   резервируется только на своём Y и ниже.
6. **≥2× зазор между несвязанными семьями** — `INTER_FAMILY_GAP`
   (`2 * SPOUSE_GAP`); внутри ветки — `SIBLING_GAP`.
7. **Супруги всегда рядом** — партнёрство — атомарная единица
   (`CARD_WIDTH*2 + SPOUSE_GAP`), нет пути двигать одного супруга.
8. **Фокус в x=0** — его слот резервируется первым.
9. **Родители центрируются по всему ряду детей** — `idealX` считается
   после того, как ряд детей/сиблингов достроен полностью.

## Multi-marriage

- При 2+ партнёрствах сам человек точно на `anchorX`, супруги чередуются
  по сторонам (`multiPartnershipSpouseXs`): 1-й брак слева, 2-й справа, 3-й
  дальше слева… (Ламех между Адой и Циллой — запрос пользователя).
- Solo-дети (без второго известного родителя) растут прямо под человеком и
  растятся РАНЬШЕ детей партнёрств — занимают центр, дети жён — по краям.
- `compactWidth` такого человека — `multiPartnershipRowWidth`, симметричная
  относительно `anchorX` (`CARD_WIDTH + 2*max(left, right)`).
- Near-edge карточка в `growSiblingRow` — `nearEdgeOffsetFromAnchor`, не
  `ownCardOffsetFromAnchor` (для 2+ браков та всегда 0).

## Не подключено (есть в типах)

- `marriageOrder` — всегда `0`; порядок браков = порядок `partnershipIds`.
- `parentRole` (усыновление) — не доходит до рендера пунктира.
- `orderingKeyByPersonId` для однополых пар — `shouldBeLeft` его не читает
  (male < unknown < female, tie-break по id).
- Лимит карточек (free 200) — бизнес-правило, движок на таком масштабе
  stress-тестом не проверен.

## Тесты и отладка

- Основное: property-based инварианты (`invariants.property.test.ts` +
  `random-graph.ts`); baseline — реальный 58-человек фикстур (`fixture.ts`,
  `layout.test.ts`); точечные кейсы — `test-fixtures.ts`.
- Баги layout'а сначала воспроизводить на реальных данных из Neon
  (`getFocusTreeLayout`/`getRawTreeGraph`) — синтетика может не задеть нужную
  комбинацию. Сравнивать с `main` по фактическим числам; «нет коллизий» —
  не критерий готовности.
