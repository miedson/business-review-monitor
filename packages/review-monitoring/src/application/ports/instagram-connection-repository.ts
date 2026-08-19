export type StoredInstagramConnection = {
  id: string;
  tenantId: string;
  instagramUserId: string;
  username: string | null;
  accountType: string | null;
  encryptedAccessToken: string | null;
  scope: string;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR";
  tokenExpiresAt: Date | null;
};

export type SaveConnectedInstagramConnectionInput = {
  tenantId: string;
  instagramUserId: string;
  username: string | undefined;
  accountType: string | undefined;
  encryptedAccessToken: string;
  scope: string;
  connectedAt: Date;
  tokenExpiresAt: Date | undefined;
};

export type DisconnectInstagramConnectionInput = {
  tenantId: string;
  disconnectedAt: Date;
};

export interface InstagramConnectionRepository {
  findByTenantId(tenantId: string): Promise<StoredInstagramConnection | null>;
  findByInstagramUserId(instagramUserId: string): Promise<StoredInstagramConnection | null>;
  saveConnected(
    input: SaveConnectedInstagramConnectionInput
  ): Promise<StoredInstagramConnection>;
  disconnectByTenantId(
    input: DisconnectInstagramConnectionInput
  ): Promise<StoredInstagramConnection | null>;
}