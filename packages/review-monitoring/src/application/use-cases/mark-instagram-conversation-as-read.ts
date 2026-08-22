import type {
  InstagramConversation,
  InstagramConversationRepository,
} from "@brm/review-monitoring";

export type MarkInstagramConversationAsReadInput = {
  conversationId: string;
  tenantId: string;
};

export type MarkInstagramConversationAsReadResult = {
  conversation: InstagramConversation;
};

export type MarkInstagramConversationAsReadDependencies = {
  instagramConversationRepository: InstagramConversationRepository;
};

export class MarkInstagramConversationAsRead {
  constructor(private readonly dependencies: MarkInstagramConversationAsReadDependencies) {}

  async execute(
    input: MarkInstagramConversationAsReadInput,
  ): Promise<MarkInstagramConversationAsReadResult> {
    const conversation = await this.dependencies.instagramConversationRepository.markAsRead(
      input.conversationId,
      input.tenantId,
    );

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return { conversation };
  }
}
