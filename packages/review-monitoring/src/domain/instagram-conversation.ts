export type InstagramConversation = {
  id: string;
  tenantId: string;
  instagramConnectionId: string;
  participantExternalId: string;
  participantUsername: string | null;
  participantName: string | null;
  participantProfilePictureUrl: string | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
};
