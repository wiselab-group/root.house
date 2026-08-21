# Product Requirements

## Core Scope
Type: Family Archive SaaS (семейная родословная + архив) — root.house.
Target: пользователь может собрать, визуализировать и сохранить историю своей
семьи, а затем передать её следующим поколениям. Первые версии деплоятся на
дефолтном Vercel-домене (`*.vercel.app`); кастомный домен root.house
подключается позже — это не блокирует MVP.
Animation Level: subtle-medium — спокойный, «семейный» тон, не immersive/loud.
Content Ready: no — реальные семейные данные вносятся пользователем после запуска.

## Sections Map
- `/register`, `/login` — регистрация/вход (Auth.js v5, Credentials provider)
- `/families` — список семей текущего пользователя + создание новой
- `/families/[familyId]` — dashboard семьи (после MVP — редирект/ссылка на tree)
- `/families/[familyId]/tree` — интерактивное семейное дерево (@xyflow/react)
- `/families/[familyId]/people` — список людей + создание
- `/families/[familyId]/people/[personId]` — Person Profile (осн. данные, семья, timeline, media, stories)
- `/families/[familyId]/people/[personId]/edit` — редактирование
- `/families/[familyId]/events/[eventId]` — детали события
- `/families/[familyId]/search` — поиск по имени/фамилии/девичьей фамилии/годам

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
- LCP:              < 2.5s
- CLS:              0.00 (без layout shifts)
- INP:              < 200ms
- JS first load:    < 150KB gzipped
- Без render-blocking ресурсов
- Без неоптимизированных изображений

## Roadmap (краткая ссылка — детали в docs/architecture.md)
0. Bootstrap + документация (готово)
1. Auth
2. Family + FamilyMember + authorization
3. Person CRUD + placeholder-person
4. Relationship (parent_child + partnership)
5. Ancestors/Descendants + Relationship Path (domain-only)
6. Family Tree visualization (desktop)
7. Mobile tree navigation
8. Person Profile (полный) + Event + timeline
9. Media (photo upload)
10. Search
11. Story + Place (минимально)
12. Полировка design/motion (premium visual pass — см. DESIGN.md)
