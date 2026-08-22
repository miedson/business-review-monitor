import type { InstagramReviewProvider } from "../ports/business-profile-review-provider.js";
import type { InstagramConnectionRepository } from "../ports/instagram-connection-repository.js";
import type { InstagramConversationRepository } from "../ports/instagram-conversation-repository.js";
import type { InstagramMessageRepository } from "../ports/instagram-message-repository.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type SendInstagramDirectMessageInput = {
  tenantId: string;
  conversationId: string;
  message: string;
};

export type SendInstagramDirectMessageResult = {
  conversationId: string;
  messageId: string;
  externalMessageId: string;
};

export type SendInstagramDirectMessageDependencies = {
  instagramConnectionRepository: InstagramConnectionRepository;
  instagramConversationRepository: InstagramConversationRepository;
  instagramMessageRepository: InstagramMessageRepository;
  instagramProvider: InstagramReviewProvider;
  tokenCipher: TokenCipher;
  now?: () => Date;
};

export class SendInstagramDirectMessage {
  constructor(private readonly dependencies: SendInstagramDirectMessageDependencies) {}

  async execute(input: SendInstagramDirectMessageInput): Promise<SendInstagramDirectMessageResult> {
    const message = input.message.trim();
    if (!message) throw new Error("Instagram direct message is required");

    const conversation = await this.dependencies.instagramConversationRepository.findByIdForTenant({
      id: input.conversationId,
      tenantId: input.tenantId
    });
    if (!conversation) throw new Error("Instagram conversation not found");

    const connection = await this.dependencies.instagramConnectionRepository.findByTenantId(input.tenantId);
    if (!connection || connection.status !== "CONNECTED" || !connection.encryptedAccessToken) {
      throw new Error("Instagram connection is required");
    }
    if (!connection.instagramProfessionalAccountId) {
      throw new Error("Instagram professional account is required");
    }
    if (!this.dependencies.instagramProvider.sendDirectMessage) {
      throw new Error("Instagram direct messages are not supported by this provider");
    }

    const sentAt = (this.dependencies.now ?? (() => new Date()))();
    const accessToken = this.dependencies.tokenCipher.decrypt(connection.encryptedAccessToken);
    const result = await this.dependencies.instagramProvider.sendDirectMessage({
      accessToken,
      instagramAccountId: connection.instagramProfessionalAccountId,
      recipientId: conversation.participantExternalId,
      message
    });

    const savedMessage = await this.dependencies.instagramMessageRepository.save({
      tenantId: input.tenantId,
      instagramConversationId: conversation.id,
      externalMessageId: result.id,
      senderExternalId: connection.instagramProfessionalAccountId,
      recipientExternalId: conversation.participantExternalId,
      direction: "OUTBOUND",
      text: message,
      sentAtExternal: sentAt,
      status: "SENT"
    });

    await this.dependencies.instagramConversationRepository.update({
      conversationId: conversation.id,
      tenantId: input.tenantId,
      lastMessageAt: sentAt,
      lastMessagePreview: message.length > 100 ? `${message.slice(0, 100)}...` : message,
      unreadCount: undefined
    });

    return { conversationId: conversation.id, messageId: savedMessage.id, externalMessageId: result.id };
  }
}
