import type messages from "../../messages/ru.json";

export type UploadErrorCode = keyof typeof messages.errors;

/**
 * Client-side upload failures carry an `errors.*` message code (plus ICU
 * values), not text: lib/ has no translator, the component that shows the
 * error does — see hooks/use-upload-error-message.ts.
 */
export class UploadError extends Error {
  constructor(
    readonly code: UploadErrorCode,
    readonly values: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "UploadError";
  }
}
