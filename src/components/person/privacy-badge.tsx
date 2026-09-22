import { LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PrivacyLevel } from "@/db/schema";

/**
 * Surfaces an object's own privacyLevel on its detail view — the create/edit
 * forms already let an owner set Person/Media/Story/Event to "Только я"
 * (PrivacyLevelSelect), but nothing on the read side reminded them it was
 * set, so a private Person could sit unnoticed for months. Only renders for
 * "private" — "family" is every object's default and the overwhelming
 * common case, so badging it too would just be noise on every profile;
 * "public" isn't surfaced here either since Phase 1 only asked about the
 * "hidden from most of the family" signal, not the opposite one.
 *
 * variant="outline" (neutral border), not terracotta — privacy is a state,
 * not an action (see CLAUDE.md's DESIGN TOKENS: --primary is reserved for
 * actions/selection).
 *
 * `compact` drops the "Только я" label down to a bare icon (still with a
 * title= tooltip and matching aria-label, so it stays announced to screen
 * readers) — used inline in a list of many items (PersonStoriesList,
 * TimelineListItem) where repeating the full text badge on every private row
 * would out-shout the content itself. The profile header (one instance per
 * page) keeps the full labeled badge.
 */
export function PrivacyBadge({
  privacyLevel,
  compact = false,
}: {
  privacyLevel: PrivacyLevel;
  compact?: boolean;
}) {
  if (privacyLevel !== "private") return null;

  if (compact) {
    return (
      <span title="Только я" className="inline-flex shrink-0">
        <LockIcon
          aria-label="Только я"
          className="size-3.5 text-muted-foreground"
        />
      </span>
    );
  }

  return (
    <Badge variant="outline" className="w-fit gap-1 text-muted-foreground">
      <LockIcon aria-hidden="true" />
      Только я
    </Badge>
  );
}
