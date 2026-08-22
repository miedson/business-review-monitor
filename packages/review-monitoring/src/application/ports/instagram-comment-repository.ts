import type { InstagramComment, InstagramCommentStatus } from "../../domain/instagram-comment.js";

export type { InstagramComment, InstagramCommentStatus };

export type UpsertInstagramCommentInput = {
  tenantId: string;
  instagramConnectionId: string;
  externalCommentId: string;
  externalMediaId?: string;
  authorExternalId?: string;
  authorUsername?: string;
  text?: string;
  createdAtExternal?: Date;
  status?: InstagramCommentStatus;
};

export type FindInstagramCommentsInput = {
  tenantId: string;
  instagramConnectionId?: string;
  status?: InstagramCommentStatus;
  limit?: number;
  cursor?: string;
};

export type FindInstagramCommentByIdInput = {
  id: string;
  tenantId: string;
};

export type DeleteInstagramCommentsByConnectionIdInput = {
  connectionId: string;
};
export type MarkInstagramCommentRepliedInput = { id: string; tenantId: string; repliedAt: Date };
export type SaveInstagramCommentReplyInput = {
  tenantId: string;
  instagramCommentId: string;
  externalReplyId: string;
  text: string;
  createdAt: Date;
};

export interface InstagramCommentRepository {
  upsert(input: UpsertInstagramCommentInput): Promise<InstagramComment>;
  findByTenant(input: FindInstagramCommentsInput): Promise<InstagramComment[]>;
  findByIdForTenant(input: FindInstagramCommentByIdInput): Promise<InstagramComment | null>;
  deleteByConnectionId(input: DeleteInstagramCommentsByConnectionIdInput): Promise<void>;
  markReplied?(input: MarkInstagramCommentRepliedInput): Promise<InstagramComment>;
  saveReply?(input: SaveInstagramCommentReplyInput): Promise<void>;
}
