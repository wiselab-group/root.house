/**
 * tree-v4 — view-layer copy of the domain's card size constants. Kept
 * separate from src/domain/tree-v4/subtree.ts on purpose: the domain layer
 * must stay React-free (CLAUDE.md CODE RULES — src/domain/** does not
 * import next/react), and the view layer must not depend on domain
 * internals it doesn't need beyond these two numbers.
 */
export const CARD_WIDTH = 176;
export const CARD_HEIGHT = 176;
export const CARD_HALF_WIDTH = CARD_WIDTH / 2;
export const CARD_HALF_HEIGHT = CARD_HEIGHT / 2;
