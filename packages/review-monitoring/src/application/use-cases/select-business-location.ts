import type {
  SelectBusinessLocationInput as SelectBusinessLocationRepositoryInput,
  StoredBusinessLocation
} from "../ports/business-location-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";

export type SelectBusinessLocationInput = {
  tenantId: string;
  businessLocationId: string;
};

export type SelectBusinessLocationDependencies = {
  businessLocationRepository: {
    selectForTenant(
      input: SelectBusinessLocationRepositoryInput
    ): Promise<StoredBusinessLocation | null>;
  };
};

export class SelectBusinessLocation {
  constructor(private readonly dependencies: SelectBusinessLocationDependencies) {}

  async execute(input: SelectBusinessLocationInput): Promise<void> {
    const location = await this.dependencies.businessLocationRepository.selectForTenant({
      businessLocationId: input.businessLocationId,
      tenantId: input.tenantId
    });

    if (!location) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_LOCATION_NOT_FOUND",
        "Google Business Profile location was not found for this tenant."
      );
    }
  }
}
