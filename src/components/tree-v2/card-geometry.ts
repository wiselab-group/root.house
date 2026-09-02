/**
 * tree-v2 — единственный источник истины для размера карточки персоны.
 * Общий и для tree-canvas.tsx (конвертация center→top-left для xyflow
 * node.position), и для parent-child-edge.tsx (где именно у карточки
 * нижний/верхний край для T-образной линии). Держим оба места в одном
 * файле, чтобы при изменении размера карточки (person-node.tsx) не забыть
 * поправить геометрию линий отдельно.
 */
export const CARD_SIZE = 160;
export const CARD_HALF_SIZE = CARD_SIZE / 2;
