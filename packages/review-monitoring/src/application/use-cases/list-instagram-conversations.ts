import type {
  InstagramConversationRepository,
  InstagramConversation
} from "@brm/review-monitoring";

export type ListInstagramConversationsInput = {
  tenantId: string;
  instagramConnectionId: string | undefined;
  limit: number | undefined;
  cursor: string | undefined;
};

export type ListInstagramConversationsResult = {
  conversations: InstagramConversation[];
  nextCursor: string | null;
};

export type ListInstagramConversationsDependencies = {
  instagramConversationRepository: InstagramConversationRepository;
};

export class ListInstagramConversations {
  constructor(
    private readonly dependencies: ListInstagramConversationsDependencies
  ) {}

  async execute(
    input: ListInstagramConversationsInput
  ): Promise<ListInstagramConversationsResult> {
    const result = await this.dependencies.instagramConversationRepository.findByTenant({
      tenantId: input.tenantId,
      instagramConnectionId: input.instagramConnectionId ?? undefined,
      limit: input.limit,
      cursor: input.cursor ?? undefined
    });

    return result;
  }
}
