import type {
  InstagramMessageRepository,
  InstagramMessage
} from "@brm/review-monitoring";

export type ListInstagramConversationMessagesInput = {
  tenantId: string;
  instagramConversationId: string;
  limit: number | undefined;
  cursor: string | undefined;
};

export type ListInstagramConversationMessagesResult = {
  messages: InstagramMessage[];
  nextCursor: string | null;
};

export type ListInstagramConversationMessagesDependencies = {
  instagramMessageRepository: InstagramMessageRepository;
};

export class ListInstagramConversationMessages {
  constructor(
    private readonly dependencies: ListInstagramConversationMessagesDependencies
  ) {}

  async execute(
    input: ListInstagramConversationMessagesInput
  ): Promise<ListInstagramConversationMessagesResult> {
    const result = await this.dependencies.instagramMessageRepository.findByConversation({
      tenantId: input.tenantId,
      instagramConversationId: input.instagramConversationId,
      limit: input.limit,
      cursor: input.cursor ?? undefined
    });

    return result;
  }
}
