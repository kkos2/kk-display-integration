import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z, ZodError } from "zod";

const IntegrationConfiguration = z.object({
  displayApiEndpoint: z.string(),
});

type IntegrationConfiguration = z.infer<typeof IntegrationConfiguration>;

@Injectable()
export class IntegrationConfigService {
  configuration: IntegrationConfiguration;

  constructor(private configService: ConfigService) {
    // Build a config object.
    const unsafeConfig = {
      displayApiEndpoint: this.configService.get("DISPLAY_API_ENDPOINT"),
    };

    // Then validate it or crash.
    try {
      IntegrationConfiguration.parse(unsafeConfig);
      this.configuration = unsafeConfig;
    } catch (error) {
      throw new Error("Unable to parse configuration: " + (error as ZodError).message);
    }
  }

  get displayApiEndpoint(): string {
    return this.configuration.displayApiEndpoint;
  }
}