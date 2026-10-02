# TREE — рендер дерева

Раскладка (позиции) — `src/domain/tree/layout/CLAUDE.md`. История решений —
`docs/tree-layout-history.md`. Общая палитра — корневой `CLAUDE.md` § DESIGN TOKENS.

## Цвета карточек и линий

- **Sage** (`--tree-accent`) — постоянная обводка КАЖДОЙ карточки, один
  плоский оттенок. Цвет по поколению пробовали и убрали — не возвращать.
- **Терракота** — только «на что смотришь/что выбрал»: Relationship Trace
  карточка (`isTraced`) и линия (`TRACE_COLOR`, `relationship-edge.tsx`),
  keyboard-selected карточка (`isSelected`). Обе — одно двойное кольцо
  (3px solid + 6px translucent, inline `boxShadow` в `compact-card-body.tsx`).
- **Фокус** остаётся sage (акцент вторым ring), даже если он — конец
  trace: `isTraceHighlighted` в `person-node.tsx` исключает `isFocus`.
- Sage и терракоту не смешивать в одном элементе — см. doc-комментарий
  `buildCardFrameClassName`.
- **Коричневый** (`--branch`) — коннекторы (`relationship-edge.tsx`,
  `union-child-edge.tsx`).
- Карточка одна — compact. Стиль «Крупное фото» (portrait) удалён
  2026-09-25 — не возвращать.

## Развод

- Партнёрская линия — всегда ОДИН сплошной `path` (`PartnershipEdgeLine`).
  Пунктирных партнёрских линий нет — не переизобретать dasharray-схему.
- Развод (`isPastPartnership`) — `DivorceBreakMark`: генограммный `//`
  поверх линии в midpoint. Если на линии есть `UnionCollapseBadge`, штрихи
  расходятся по обе стороны кнопки (`straddle`); сам бейдж не двигать.
- Физически разрывать линию (два subpath'а) пользователь ДВАЖДЫ отклонил —
  не делать без явного нового запроса.

## Collapse/expand

- `use-collapsed-branches.ts` — эфемерный клиентский `Set`, не в БД/URL.
- `prune-collapsed.ts` (`pruneCollapsedDescendants`) — обрезает готовый
  layout по `parent_child` вниз, layout НЕ пересчитывается. Только потомки.
  Фокус-персона скрывается вместе с веткой, как все (rescue убран
  2026-10-02 по запросу пользователя); `FocusViewport` центрирует по
  id фокуса, а не по наличию карточки. Бейдж «+N» —
  `person-node.tsx`/`person-node-parts.tsx`.

## Смена фокуса и viewport

- `tree-canvas.tsx::setFocus` → `buildClientTreeLayout` на сыром графе
  (`getRawTreeGraph` — privacy-safe срез, см. `TreePersonClientPayload`),
  `router.replace` (не `push`), плавный `setCenter` в `FocusViewport` с
  `prefers-reduced-motion` fallback. Карточки прыгают мгновенно —
  анимируется только viewport.
- Виртуализация: `onlyRenderVisibleElements`. Рёбра читают геометрию из
  `TreeLayoutPositionsContext`, а не `useInternalNode().measured` (тот
  протухает при ремонте карточки на краю viewport'а).
- `@xyflow/react` импортируется только внутри этой папки.
