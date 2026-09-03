/**
 * tree-v3 — единственный источник истины для размера карточки персоны во
 * view-слое. Значение СОВПАДАЕТ с CARD_WIDTH/CARD_HEIGHT в
 * src/domain/tree-v3/subtree.ts и collision.ts (домен уже знает геометрию
 * карточки для measure-then-place и collision detection), но копия
 * намеренно НЕ импортируется оттуда: domain/** не должен тянуть за собой
 * ничего view-специфичного, а view — наоборот, не обязан импортировать
 * internals домена, которые могут не быть публичным API. Изменение размера
 * карточки требует синхронно поправить оба места (domain + этот файл) — как
 * и в tree-v2 (см. tree-v2/card-geometry.ts).
 */
export const CARD_WIDTH = 176;
export const CARD_HEIGHT = 176;
export const CARD_HALF_WIDTH = CARD_WIDTH / 2;
export const CARD_HALF_HEIGHT = CARD_HEIGHT / 2;
