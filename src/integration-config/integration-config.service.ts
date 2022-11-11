import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZodError } from "zod";
import {
  basicAuthCredentials,
  displayApiCredentials,
  IntegrationConfiguration,
} from "./integration-config.types";

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
      displayApiCredentials: {
        email: getOrThrow(configService, "DISPLAY_API_EMAIL") || "",
        password: getOrThrow(configService, "DISPLAY_API_PASSWORD") || "",
      },
      basicAuthCredentials: {
        username: configService.get("HTTP_BASIC_USER") || "",
        password: configService.get("HTTP_BASIC_PASS") || "",
      },
      kkSlideshowApiEndpoint: getOrThrow(configService, "KK_SLIDESHOW_API_ENDPOINT"),
      kkSlideshowApiToken: getOrThrow(configService, "KK_SLIDESHOW_API_TOKEN"),
      kkSlideshowImageToken: getOrThrow(configService, "KK_SLIDESHOW_IMAGE_TOKEN"),
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

  get displayApiCredentials(): displayApiCredentials {
    return this.configuration.displayApiCredentials;
  }

  get displayApiEndpoint(): string {
    return this.configuration.displayApiEndpoint;
  }

  get basicAuthCredentials(): basicAuthCredentials {
    return this.configuration.basicAuthCredentials;
  }

  get kkSlideshowApiEndpoint(): string {
    return this.configuration.kkSlideshowApiEndpoint;
  }

  get kkSlideshowApiToken(): string {
    return this.configuration.kkSlideshowApiToken;
  }

  get kkSlideshowImageToken(): string {
    return this.configuration.kkSlideshowImageToken;
  }
}
