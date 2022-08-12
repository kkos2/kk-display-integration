import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZodError } from "zod";
import { IntegrationConfiguration } from "./integration-config.types";

// Try to fetch config from environment and fail if we can't.
function getOrThrow<T>(configService: ConfigService, key: string): T | undefined {
  const value = configService.get<T>(key);

  if (value === undefined) {
    throw new Error("Unable to read environment variable " + key);
  }

  return value;
}

@Injectable()
export class IntegrationConfigService {
  configuration: IntegrationConfiguration;

  constructor(private configService: ConfigService) {
    // Build a config object, pulling in configuration from the environment
    // without doing a validation at this point.
    const partialConfig: Partial<IntegrationConfiguration> = {
      displayApiEndpoint: getOrThrow(configService, "DISPLAY_API_ENDPOINT"),
    };

    // Then validate it or crash.
    try {
      IntegrationConfiguration.parse(partialConfig);

      // We have validated the config so it is no longer partial.
      this.configuration = partialConfig as IntegrationConfiguration;
    } catch (error) {
      throw new Error("Unable to parse configuration: " + (error as ZodError).message);
    }
  }

  get displayApiEndpoint(): string {
    return this.configuration.displayApiEndpoint;
  }
}
