import type {
  InstagramConversationRepository,
  InstagramMessageRepository,
  NormalizedInstagramMessage,
  StoredInstagramConnection,
  UpdateInstagramConversationInput,
} from "@brm/review-monitoring";

type Logger = {
  info: (meta: Record<string, unknown>, msg?: string) => void;
  warn: (meta: Record<string, unknown>, msg?: string) => void;
  error: (meta: Record<string, unknown>, msg?: string) => void;
};

export type ProcessInstagramDirectMessageInput = {
  connection: StoredInstagramConnection;
  normalizedMessage: NormalizedInstagramMessage;
};

export type ProcessInstagramDirectMessageResult = {
  conversationId: string;
  messageId: string;
  isNew: boolean;
};

export type ProcessInstagramDirectMessageDependencies = {
  instagramConversationRepository: InstagramConversationRepository;
  instagramMessageRepository: InstagramMessageRepository;
  resolveParticipantProfile?: (input: {
    connection: StoredInstagramConnection;
    participantExternalId: string;
  }) => Promise<{
    username?: string;
    name?: string;
    profilePictureUrl?: string;
  } | null>;
  logger?: Logger;
};

export class ProcessInstagramDirectMessage {
  constructor(private readonly dependencies: ProcessInstagramDirectMessageDependencies) {}

  async execute(
    input: ProcessInstagramDirectMessageInput,
  ): Promise<ProcessInstagramDirectMessageResult> {
    const logger = this.dependencies.logger ?? console;

    const participantExternalId =
      input.normalizedMessage.direction === "INBOUND"
        ? input.normalizedMessage.senderExternalId
        : input.normalizedMessage.recipientExternalId;

    let conversation =
      await this.dependencies.instagramConversationRepository.findByConnectionAndParticipant({
        instagramConnectionId: input.connection.id,
        participantExternalId,
      });

    const shouldResolveProfile =
      this.dependencies.resolveParticipantProfile &&
      (!conversation?.participantUsername || !conversation.participantProfilePictureUrl);
    const participantProfile = shouldResolveProfile
      ? await this.resolveParticipantProfile(input.connection, participantExternalId)
      : null;

    if (!conversation) {
      logger.info({
        operation: "instagram_conversation_created",
        tenantId: input.connection.tenantId,
        instagramConnectionId: input.connection.id,
        participantExternalId,
      });

      conversation = await this.dependencies.instagramConversationRepository.save({
        tenantId: input.connection.tenantId,
        instagramConnectionId: input.connection.id,
        participantExternalId,
        // Meta messaging payloads commonly provide only the external ID.
        // Keep that identifier in participantExternalId, never present it as a name.
        participantUsername: participantProfile?.username,
        participantName: participantProfile?.name,
        participantProfilePictureUrl: participantProfile?.profilePictureUrl,
        lastMessageAt: input.normalizedMessage.sentAtExternal,
        lastMessagePreview: input.normalizedMessage.text,
        unreadCount: input.normalizedMessage.direction === "INBOUND" ? 1 : 0,
      });
    } else {
      const isInbound = input.normalizedMessage.direction === "INBOUND";
      const updates: {
        lastMessageAt?: Date;
        lastMessagePreview?: string;
        unreadCount?: number | { increment: number };
        participantUsername?: string;
        participantName?: string;
        participantProfilePictureUrl?: string;
      } = {};

      if (input.normalizedMessage.sentAtExternal) {
        updates.lastMessageAt = input.normalizedMessage.sentAtExternal;
      }
      if (input.normalizedMessage.text) {
        updates.lastMessagePreview =
          input.normalizedMessage.text.length > 100
            ? input.normalizedMessage.text.slice(0, 100) + "..."
            : input.normalizedMessage.text;
      }
      if (isInbound) {
        updates.unreadCount = { increment: 1 };
      }
      if (participantProfile?.username) updates.participantUsername = participantProfile.username;
      if (participantProfile?.name) updates.participantName = participantProfile.name;
      if (participantProfile?.profilePictureUrl)
        updates.participantProfilePictureUrl = participantProfile.profilePictureUrl;

      conversation = await this.dependencies.instagramConversationRepository.update({
        conversationId: conversation.id,
        tenantId: input.connection.tenantId,
        lastMessageAt: updates.lastMessageAt,
        lastMessagePreview: updates.lastMessagePreview,
        unreadCount: updates.unreadCount,
        participantUsername: updates.participantUsername,
        participantName: updates.participantName,
        participantProfilePictureUrl: updates.participantProfilePictureUrl,
      } as UpdateInstagramConversationInput);
    }

    const existingMessage = await this.dependencies.instagramMessageRepository.findByExternalId({
      instagramConversationId: conversation.id,
      externalMessageId: input.normalizedMessage.externalMessageId,
    });

    if (existingMessage) {
      logger.info({
        operation: "instagram_message_duplicate_ignored",
        tenantId: input.connection.tenantId,
        instagramConversationId: conversation.id,
        externalMessageId: input.normalizedMessage.externalMessageId,
      });

      return {
        conversationId: conversation.id,
        messageId: existingMessage.id,
        isNew: false,
      };
    }

    const message = await this.dependencies.instagramMessageRepository.save({
      tenantId: input.connection.tenantId,
      instagramConversationId: conversation.id,
      externalMessageId: input.normalizedMessage.externalMessageId,
      senderExternalId: input.normalizedMessage.senderExternalId,
      recipientExternalId: input.normalizedMessage.recipientExternalId,
      direction: input.normalizedMessage.direction,
      text: input.normalizedMessage.text ?? undefined,
      sentAtExternal: input.normalizedMessage.sentAtExternal,
      status: "DELIVERED",
    });

    logger.info({
      operation: "instagram_message_persisted",
      tenantId: input.connection.tenantId,
      instagramConversationId: conversation.id,
      messageId: message.id,
      externalMessageId: input.normalizedMessage.externalMessageId,
      direction: input.normalizedMessage.direction,
    });

    return {
      conversationId: conversation.id,
      messageId: message.id,
      isNew: true,
    };
  }

  private async resolveParticipantProfile(
    connection: StoredInstagramConnection,
    participantExternalId: string,
  ): Promise<{ username?: string; name?: string; profilePictureUrl?: string } | null> {
    try {
      return await this.dependencies.resolveParticipantProfile!({
        connection,
        participantExternalId,
      });
    } catch (error) {
      (this.dependencies.logger ?? console).warn({
        operation: "instagram_participant_profile_resolution_failed",
        participantExternalId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      return null;
    }
  }
}
