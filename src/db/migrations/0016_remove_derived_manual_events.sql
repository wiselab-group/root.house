-- Birth/death/marriage are now derived automatically onto a Person's
-- timeline from persons.birth_date_*/death_date_* and
-- relationships_partnership.start_date_* (see event.service.ts::
-- synthesizeDerivedEvents), instead of being stored as ordinary
-- manually-created `events` rows. Existing rows of these three types are
-- now redundant and would show as duplicates alongside the derived
-- pseudo-events — delete them. event_participants rows referencing a
-- deleted event are removed automatically (event_participants.event_id has
-- ON DELETE CASCADE, see db/schema/event.ts).
DELETE FROM "events" WHERE "type" IN ('birth', 'death', 'marriage');
