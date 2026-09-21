---
target: Хронология (person-timeline.tsx)
total_score: 27
p0_count: 2
p1_count: 2
timestamp: 2026-09-21T20-35-34Z
slug: src-components-person-person-timeline-tsx
---

Method: dual-agent (A: general-purpose · B: general-purpose)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                         |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Ничего динамического, но "completed"-состояние дота может ложно читаться как значащий статус      |
| 2         | Match System / Real World       | 1         | Метафора roadmap/прогресса не соответствует "списку событий жизни"                                |
| 3         | User Control and Freedom        | 3         | CollapsibleForm даёт чистый выход, проблем нет                                                    |
| 4         | Consistency and Standards       | 2         | Единственное место в профиле с "горящим" terracotta-декором — ломает единый flow остальных секций |
| 5         | Error Prevention                | 4         | Не затронуто изменением                                                                           |
| 6         | Recognition Rather Than Recall  | 3         | Хорошее группирование, но дата визуально мельче бейджа                                            |
| 7         | Flexibility and Efficiency      | 3         | Без изменений                                                                                     |
| 8         | Aesthetic and Minimalist Design | 1         | Постоянно "зажжённая" terracotta-линия — самый громкий элемент тихой страницы                     |
| 9         | Error Recovery                  | 4         | Не затронуто                                                                                      |
| 10        | Help and Documentation          | 3         | Нейтрально                                                                                        |
| **Total** |                                 | **27/40** | **Acceptable**                                                                                    |

## Anti-Patterns Verdict — Да, AI slop

LLM-оценка: готовый shadcn-блок @reui/c-timeline-2 ("Timeline with roadmap") построен вокруг понятия прогресса через шаги (step/activeStep/data-completed). У записи о жизни человека нет "текущего шага". defaultValue={timeline.length} форсирует все элементы в "completed" одновременно — нейтрализует единственную причину, по которой Timeline вообще stateful.

Детерминированный скан: detect.mjs — exit 0, JSON []. Токены используются правильно (border-primary, bg-primary), находок нет — вне периметра детектора.

Визуальный оверлей: не выполнен (Assessment B задекларировал отсутствие браузерного тула в своей среде, дал аналитический расчёт контраста из OKLCH-токенов вместо этого).

Ключевая находка на стыке assessments: border-primary/20 (default indicator) ≈1.31:1, bg-primary/10 (default line) ≈1.14:1 — оба ниже порога 3:1 в 2.3-2.6 раза. Только "completed"-состояние (4.92:1) проходит порог. Хак с defaultValue — единственное, что спасает компонент от недостаточного контраста по умолчанию.

## Overall Impression

Данные/приватность перенесены корректно, но выбор компонента неверен на уровне метафоры — roadmap поверх архивной хронологии жизни (включая Смерть/Война/Заключение/Развод).

## What's Working

1. filterVisibleEvents/isSyntheticEventId корректно перенесены
2. Порядок полей (бейдж → название → место) в целом верный
3. Пустое состояние и форма добавления сдержанные

## Priority Issues

[P0] Terracotta как состояние покоя — нарушение CLAUDE.md цветового контракта (терракота только для действия). Fix: border-border/bg-border вместо border-primary/bg-primary в indicator/separator.

[P0] Неверная семантика — roadmap-примитив вместо статичного списка. defaultValue={timeline.length} — хак без комментария, весь stateful-механизм мёртв. Fix: вернуть простой <ol> или статичный line+dot без step/activeStep.

[P1] Тональное несоответствие — энергичный SaaS-roadmap против "тёплого спокойного" тона CLAUDE.md, особенно рядом с Смерть/Война/Заключение.

[P1] Дата (text-xs) визуально уступает бейджу, хотя должна быть организующей осью timeline.

[P2] Нет постоянного визуального отличия кликабельных заголовков от некликабельных (hover-only, не работает на мобильном).

## Persona Red Flags

Jordan: не может заранее понять кликабельность записей на телефоне; terracotta-прогресс-трекер рядом с "Смерть"/"Заключение" ощущается неуместно бодро.

Sam: латентный контраст-риск (1.31:1/1.14:1) скрыт только хаком defaultValue; нет явного focus-visible на Link; каждое событие — <h3>, засоряет heading-навигацию скринридера.

## Minor Observations

- defaultValue={timeline.length} — единственная строка без doc-комментария в стиле остального репо
- flex items-center gap-2 без flex-wrap — риск переноса на 375px, не проверено вживую
- Badge variant="secondary" — правильно нейтрален, контрастирует с terracotta-утечкой самого примитива

## Questions to Consider

- Если activeStep никогда не меняется, зачем клиентский stateful-компонент внутри Server Component дерева?
- Планируется ли где-то настоящий roadmap UI — не стоит ли зарезервировать примитив для него?
- Terracotta здесь — осознанное третье исключение или непроверенная утечка дефолта shadcn-блока?
