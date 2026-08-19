export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages"
] as const;

export const INSTAGRAM_SCOPE_STRING = INSTAGRAM_SCOPES.join(",");