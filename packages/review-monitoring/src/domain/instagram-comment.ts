export type NormalizedInstagramComment = {
  externalCommentId: string;
  externalMediaId: string | undefined;
  instagramAccountId: string;
  authorExternalId: string | undefined;
  authorUsername: string | undefined;
  text: string | undefined;
  createdAtExternal: Date | undefined;
  rawEventId: string | undefined;
};

export type NormalizedInstagramCommentInput = {
  externalCommentId: string;
  externalMediaId?: string;
  instagramAccountId: string;
  authorExternalId?: string;
  authorUsername?: string;
  text?: string;
  createdAtExternal?: Date;
  rawEventId?: string;
};

export function createNormalizedInstagramComment(
  input: NormalizedInstagramCommentInput
): NormalizedInstagramComment {
  return {
    externalCommentId: input.externalCommentId,
    externalMediaId: input.externalMediaId ?? undefined,
    instagramAccountId: input.instagramAccountId,
    authorExternalId: input.authorExternalId ?? undefined,
    authorUsername: input.authorUsername ?? undefined,
    text: input.text ?? undefined,
    createdAtExternal: input.createdAtExternal ?? undefined,
    rawEventId: input.rawEventId ?? undefined
  };
}

export type InstagramCommentStatus = "NEW" | "READ";

export type InstagramComment = {
  id: string;
  tenantId: string;
  instagramConnectionId: string;
  externalCommentId: string;
  externalMediaId: string | null;
  authorExternalId: string | null;
  authorUsername: string | null;
  text: string | null;
  createdAtExternal: Date | null;
  status: InstagramCommentStatus;
  readAt: Date | null;
  repliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
