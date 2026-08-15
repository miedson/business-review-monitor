export type StoredGoogleConnection = {
  id: string;
  tenantId: string;
  encryptedRefreshToken: string | null;
  scope: string;
  status: "CONNECTED" | "DISCONNECTED" | "REAUTH_REQUIRED" | "ERROR";
};

export type SaveConnectedGoogleConnectionInput = {
  tenantId: string;
  encryptedRefreshToken: string;
  scope: string;
  connectedAt: Date;
};

export type DisconnectGoogleConnectionInput = {
  tenantId: string;
  disconnectedAt: Date;
};

export interface GoogleConnectionRepository {
  findByTenantId(tenantId: string): Promise<StoredGoogleConnection | null>;
  saveConnected(
    input: SaveConnectedGoogleConnectionInput
  ): Promise<StoredGoogleConnection>;
}
