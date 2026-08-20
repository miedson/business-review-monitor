export type StoredInstagramConnection = {
  id: string;
  tenantId: string;
  instagramUserId: string;
  instagramProfessionalAccountId: string | null;
  username: string | null;
  accountType: string | null;
  encryptedAccessToken: string | null;
  scope: string;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR";
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  tokenExpiresAt: Date | null;
};

export type SaveConnectedInstagramConnectionInput = {
  tenantId: string;
  instagramUserId: string;
  instagramProfessionalAccountId: string | undefined;
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

export type SetProfessionalAccountIdInput = {
  connectionId: string;
  professionalAccountId: string;
};

export interface InstagramConnectionRepository {
  findByTenantId(tenantId: string): Promise<StoredInstagramConnection | null>;
  findByInstagramUserId(instagramUserId: string): Promise<StoredInstagramConnection | null>;
  findByProfessionalAccountId(professionalAccountId: string): Promise<StoredInstagramConnection | null>;
  findConnectedWithoutProfessionalAccountId(): Promise<StoredInstagramConnection[]>;
  saveConnected(
    input: SaveConnectedInstagramConnectionInput
  ): Promise<StoredInstagramConnection>;
  setProfessionalAccountId(
    input: SetProfessionalAccountIdInput
  ): Promise<void>;
  disconnectByTenantId(
    input: DisconnectInstagramConnectionInput
  ): Promise<StoredInstagramConnection | null>;
}