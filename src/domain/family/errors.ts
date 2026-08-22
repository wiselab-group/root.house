/** Thrown by requireFamilyAccess() and anywhere else authorization fails. */
export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Thrown by updateFamilySlug() for a malformed/reserved/already-taken slug —
 *  a user-facing validation failure, not an authorization or not-found case. */
export class SlugTakenError extends Error {
  constructor(message = "This slug is not available.") {
    super(message);
    this.name = "SlugTakenError";
  }
}
