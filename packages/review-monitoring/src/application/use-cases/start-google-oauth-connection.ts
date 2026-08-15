import type { BusinessProfileReviewProvider } from "../ports/business-profile-review-provider.js";
import type { OAuthStateStore } from "../ports/oauth-state-store.js";

export type StartGoogleOAuthConnectionInput = {
  userId: string;
  tenantId: string;
};

export type StartGoogleOAuthConnectionResult = {
  authorizationUrl: string;
};

export type StartGoogleOAuthConnectionDependencies = {
  provider: BusinessProfileReviewProvider;
  stateStore: OAuthStateStore;
};

export class StartGoogleOAuthConnection {
  constructor(
    private readonly dependencies: StartGoogleOAuthConnectionDependencies
  ) {}

  async execute(
    input: StartGoogleOAuthConnectionInput
  ): Promise<StartGoogleOAuthConnectionResult> {
    const state = await this.dependencies.stateStore.create({
      userId: input.userId,
      tenantId: input.tenantId
    });

    return {
      authorizationUrl: this.dependencies.provider.buildAuthorizationUrl({ state })
    };
  }
}
