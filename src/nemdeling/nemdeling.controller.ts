import {
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
} from "@nestjs/swagger";
import { NemDelingService } from "./nemdeling.service";
import { ServiceMessage } from "./nemdeling.models";
import { NemDelingResult, NemdelingSlide } from "./types";
import { ApiServiceUnavailableResponse } from "@nestjs/swagger/dist/decorators/api-response.decorator";

type RequestNormalizerResult = { [key: string]: NemdelingSlide[] };

@ApiTags("NemDeling")
@Controller("api/v1/nemdeling")
export class NemDelingController {
  constructor(
    private readonly nemDelingService: NemDelingService,
    private readonly displayApiService: DisplayApiService,
    private readonly logger: Logger
  ) {}

  /**
   * The template type to use when creating service message slides.
   */
  private readonly serviceMessageTemplateType = "Billede og tekst";

  @Post("service-messages")
  @ApiCreatedResponse({
    description: "The service message was synced.",
    type: String,
  })
  @ApiServiceUnavailableResponse({
    description: "Application is busy processing.",
  })
  @ApiInternalServerErrorResponse({
    description: "Application not able to process request.",
  })
  @ApiBody({ type: [ServiceMessage] })
  async serviceMessage(@Body() body: ServiceMessage[]): Promise<string> {
    const results: NemDelingResult[] = [];

    if (
      this.nemDelingService.serviceMessagesAreSyncing > 0 &&
      this.nemDelingService.serviceMessagesAreSyncing < 5
    ) {
      this.nemDelingService.serviceMessagesAreSyncing++;
      throw new ServiceUnavailableException("Service messages are already being synced.");
    }

    this.nemDelingService.serviceMessagesAreSyncing++;

    const data = await this.serviceMessagesDataMapper(body);
    for (const [screenName, slides] of Object.entries(data.result)) {
      const playlist = await this.nemDelingService.getServiceMessagePlaylistFromScreenName(
        screenName
      );
      if (!playlist) {
        continue;
      }

      const result = await this.nemDelingService.syncPlaylist(playlist, slides);
      results.push({
        name: screenName,
        status: result ? "success" : "error",
      });
    }

    data.notFound.forEach((screenName) => {
      results.push({
        name: screenName,
        status: "not_found",
      });
    });

    this.nemDelingService.serviceMessagesAreSyncing = 0;
    this.logger.log("Service messages result: " + JSON.stringify(results));
    return "OK";
  }

  /**
   * Converts the service messages request body to Display API friendly format.
   */
  async serviceMessagesDataMapper(
    body: ServiceMessage[]
  ): Promise<{ result: RequestNormalizerResult; notFound: string[] }> {
    const templateId = await this.displayApiService.getTemplateId(this.serviceMessageTemplateType);
    if (!templateId) {
      throw new InternalServerErrorException(
        `No template ID found for ${this.serviceMessageTemplateType}`
      );
    }

    const result: RequestNormalizerResult = {};
    const notFound: string[] = [];

    // Create result object from existing screens, to support cases where
    // service messages have been deleted, but still exist on a screen.
    const screensResponse = await this.displayApiService.fetchScreens();
    screensResponse.forEach(({ title }) => {
      if (title) {
        result[title] = [];
      }
    });

    body.forEach((item) => {
      item.screens.forEach((screenName) => {
        if (!result[screenName]) {
          notFound.push(screenName);
          return;
        }

        result[screenName].push({
          templateId,
          content: {
            title: item.title,
            text: item.text,
          },
        });
      });
    });

    return { result, notFound: [...new Set(notFound)] };
  }
}
