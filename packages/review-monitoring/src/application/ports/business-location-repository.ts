export type StoredBusinessLocation = {
  id: string;
  tenantId: string;
  googleAccountId: string;
  googleLocationId: string;
  name: string;
  isActive: boolean;
};

export type FindBusinessLocationByGoogleIdsInput = {
  tenantId: string;
  googleAccountId: string;
  googleLocationId: string;
};

export type MarkBusinessLocationSyncedInput = {
  tenantId: string;
  businessLocationId: string;
  syncedAt: Date;
};

export type SelectBusinessLocationInput = {
  tenantId: string;
  businessLocationId: string;
};

export interface BusinessLocationRepository {
  findByGoogleIds(
    input: FindBusinessLocationByGoogleIdsInput
  ): Promise<StoredBusinessLocation | null>;

  markSynced(input: MarkBusinessLocationSyncedInput): Promise<void>;
}
