"use client";

import { useState } from "react";

const TRUNCATE_AT = 400;

/**
 * Truncates a long story body to TRUNCATE_AT chars with a "Читать
 * полностью"/"Свернуть" toggle — PersonStoriesList used to always render the
 * full body, which made a page with a few long stories scroll forever before
 * reaching Хронология/Семья below. The full text is still sent to the
 * client (no server round-trip on expand) — this only hides it visually,
 * same tradeoff as a CSS line-clamp but with a real toggle since stories can
 * run to many paragraphs, where a fixed line count reads arbitrarily.
 *
 * Breaks only at a whitespace boundary at-or-before the cutoff so a word
 * (or, for CJK/no-space text, at least the exact cutoff) isn't split mid-way.
 */
export function StoryBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);

  if (body.length <= TRUNCATE_AT) {
    return (
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        {body}
      </p>
    );
  }

  const lastSpace = body.lastIndexOf(" ", TRUNCATE_AT);
  const cutoff = lastSpace > 0 ? lastSpace : TRUNCATE_AT;
  const truncated = body.slice(0, cutoff).trimEnd();

  return (
    <div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        {expanded ? body : `${truncated}…`}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-sm font-medium text-primary hover:opacity-80"
      >
        {expanded ? "Свернуть" : "Читать полностью"}
      </button>
    </div>
  );
}
