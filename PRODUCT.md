# Product Requirements

## Core Scope

Type: Root house SaaS (семейная родословная + архив) — root.house.
Target: пользователь может собрать, визуализировать и сохранить историю своей
семьи, а затем передать её следующим поколениям. Первые версии деплоятся на
дефолтном Vercel-домене (`*.vercel.app`); кастомный домен root.house
подключается позже — это не блокирует MVP.
Animation Level: subtle-medium — спокойный, «семейный» тон, не immersive/loud.
Content Ready: no — реальные семейные данные вносятся пользователем после запуска.

## Sections Map

- `/register`, `/login` — регистрация/вход (Auth.js v5, Credentials provider)
- `/families` — список семей текущего пользователя + создание новой
- `/families/[slug]` — dashboard семьи (после MVP — редирект/ссылка на tree)
- `/families/[slug]/tree` — интерактивное семейное дерево (@xyflow/react)
- `/families/[slug]/people` — список людей + создание
- `/families/[slug]/people/[personSlug]` — Person Profile (осн. данные, семья, timeline, media, stories)
- `/families/[slug]/people/[personSlug]/edit` — редактирование
- `/families/[slug]/events/[eventId]` — детали события
- `/families/[slug]/search` — поиск по имени/фамилии/девичьей фамилии/годам

## User Flow

Основной вертикальный срез (целевой сценарий для проверки качества MVP):

1. Регистрация
2. Создание Family
3. Добавление себя как Person
4. Добавление родителей
5. Добавление супруга
6. Добавление ребёнка
7. Просмотр интерактивного дерева (desktop: canvas с zoom/pan/focus; mobile: карточная focus-навигация)
8. Открытие Person Profile
9. Добавление фотографии к Person
10. Добавление события (basic timeline)
11. Поиск человека через Search

## Technical Constraints

- Images: next/image, sizes attribute, blur placeholder — всегда, без исключений
- SEO: семантический HTML. JSON-LD (WebSite + Organization) — низкий приоритет,
  т.к. приложение в основном приватное/за аутентификацией
- Forms: Server Actions + `useActionState`/`useFormStatus` (React 19), zod-валидация
  и на клиенте (UX), и на сервере (source of truth)
- Analytics: не реализовано в MVP
- CMS: не применимо — данные вводятся пользователем через приложение
- Privacy default: все новые Person/Media/Story/Event — `privacyLevel: 'family'`
  по умолчанию, никогда `'public'` без явного действия пользователя
- Auth: Auth.js v5, database sessions, Credentials provider (email+пароль) в MVP,
  OAuth-провайдеры добавляются позже без миграций схемы
- i18n: не реализовано — интерфейс на русском

## Out of Scope (v1) — сознательно отложено, но не заблокировано архитектурно

AI-помощник, OCR, распознавание лиц, автоматический genealogy inference,
DNA-данные, billing/subscriptions/Stripe (в схеме есть только заготовка
`Family.planTier`), интерактивные карты (Place уже geo-ready полями
latitude/longitude), печать/книги, marketplace, публичный genealogy search,
продвинутая коллаборация (real-time co-editing, история изменений), recommendation
system, реальный GEDCOM import/export (структура полей это допускает,
маппинг документируется когда фича берётся в работу), video/audio upload UI
(схема media готова, форма — только для фото в MVP), Document как отдельная
таблица (пока `Media.documentMetadata jsonb`).

## Performance Budget

- LCP: < 2.5s
- CLS: 0.00 (без layout shifts)
- INP: < 200ms
- JS first load: < 150KB gzipped
- Без render-blocking ресурсов
- Без неоптимизированных изображений

## Roadmap (краткая ссылка — детали в docs/architecture.md)

Все этапы 0-12 завершены — MVP полностью реализован и проверен вживую. 0. Bootstrap + документация (готово)

1. Auth (готово)
2. Family + FamilyMember + authorization (готово)
3. Person CRUD + placeholder-person (готово)
4. Relationship (parent_child + partnership) (готово)
5. Ancestors/Descendants + Relationship Path (domain-only) (готово)
6. Family Tree visualization (desktop) (готово)
7. Mobile tree navigation (готово)
8. Person Profile (полный) + Event + timeline (готово)
9. Media (photo upload) (готово)
10. Search (готово)
11. Story + Place (минимально) (готово)
12. Полировка design/motion (premium visual pass — см. DESIGN.md) (готово)
