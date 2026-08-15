export type OAuthStateData = {
  userId: string;
  tenantId: string;
};

export interface OAuthStateStore {
  create(input: OAuthStateData): Promise<string>;
  consume(state: string): Promise<OAuthStateData | null>;
}
