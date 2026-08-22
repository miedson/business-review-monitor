import type { BusinessProfileReviewProvider } from "../ports/business-profile-review-provider.js";
import type { OAuthStateStore } from "../ports/oauth-state-store.js";

export type StartInstagramOAuthConnectionInput = {
  userId: string;
  tenantId: string;
};

export type StartInstagramOAuthConnectionResult = {
  authorizationUrl: string;
};

export type StartInstagramOAuthConnectionDependencies = {
  provider: BusinessProfileReviewProvider;
  stateStore: OAuthStateStore;
};

export class StartInstagramOAuthConnection {
  constructor(private readonly dependencies: StartInstagramOAuthConnectionDependencies) {}

  async execute(
    input: StartInstagramOAuthConnectionInput,
  ): Promise<StartInstagramOAuthConnectionResult> {
    const state = await this.dependencies.stateStore.create({
      userId: input.userId,
      tenantId: input.tenantId,
    });

    return {
      authorizationUrl: this.dependencies.provider.buildAuthorizationUrl({ state }),
    };
  }
}
