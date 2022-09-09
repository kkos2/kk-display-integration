import {
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
} from "@nestjs/swagger";
import { NemDelingService } from "./nemdeling.service";
import { ServiceMessageBody, NemDelingResult, NemdelingSlide, EventBody } from "./types";
import { ApiServiceUnavailableResponse } from "@nestjs/swagger/dist/decorators/api-response.decorator";
import { AuthBasicGuard } from "src/auth/auth-basic.guard";

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
  private readonly serviceMessageTemplateType = "Servicemeddelelse";

  /**
   * The template type to use when creating event slides.
   */
  private readonly eventTemplateType = "event";

  @Post("service-messages")
  @UseGuards(AuthBasicGuard)
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
  @ApiBody({ type: String })
  async serviceMessage(@Body() body: ServiceMessageBody): Promise<string> {
    const results: NemDelingResult[] = [];

    if (
      // We don't want two processes to update slides at the same time. To
      // build a failsafe into the system, we reset after skipping 4 times. We
      // never expect this to be an issue, but in case something bad happens we
      // don't want this to get completely stuck.
      this.nemDelingService.serviceMessagesAreSyncing > 0 &&
      this.nemDelingService.serviceMessagesAreSyncing < 5
    ) {
      this.nemDelingService.serviceMessagesAreSyncing++;
      throw new ServiceUnavailableException("Service messages are already being synced.");
    }

    this.nemDelingService.serviceMessagesAreSyncing = 1;

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
    return "OK: " + JSON.stringify(results);
  }

  /**
   * Converts the service messages request body to Display API friendly format.
   */
  async serviceMessagesDataMapper(
    body: ServiceMessageBody
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

    body.result.item.forEach((item) => {
      const screens = item.field_os2_display_list_spot[0].item;
      if (!screens.length) {
        return;
      }

      screens.forEach((screenName) => {
        if (!result[screenName]) {
          notFound.push(screenName);
          return;
        }

        result[screenName].push({
          templateId,
          content: {
            externalId: item.nid[0],
            title: item.title_field[0],
            text: item.body[0],
            displayInstitution: item.field_display_institution[0].item[0],
            bgColor: item.field_background_color[0],
          },
        });
      });
    });

    return { result, notFound: [...new Set(notFound)] };
  }

  @Post("events")
  @UseGuards(AuthBasicGuard)
  @ApiCreatedResponse({
    description: "The event was synced.",
    type: String,
  })
  @ApiServiceUnavailableResponse({
    description: "Application is busy processing.",
  })
  @ApiInternalServerErrorResponse({
    description: "Application not able to process request.",
  })
  @ApiBody({ type: String })
  async event(@Body() body: EventBody): Promise<string> {
    const results: NemDelingResult[] = [];

    // We don't want two processes to update slides at the same time. To
    // build a failsafe into the system, we reset after skipping 4 times. We
    // never expect this to be an issue, but in case something bad happens we
    // don't want this to get completely stuck.
    if (this.nemDelingService.eventsAreSyncing > 0 && this.nemDelingService.eventsAreSyncing < 5) {
      this.nemDelingService.eventsAreSyncing++;
      throw new ServiceUnavailableException("Events are already being synced.");
    }

    this.nemDelingService.eventsAreSyncing = 1;

    const data = await this.eventsDataMapper(body);
    for (const [screenName, slides] of Object.entries(data.result)) {
      const playlist = await this.nemDelingService.getEventPlaylistFromScreenName(screenName);
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

    this.nemDelingService.eventsAreSyncing = 0;
    this.logger.log("Events result: " + JSON.stringify(results));
    return "OK: " + JSON.stringify(results);
  }

  /**
   * Converts the events request body to Display API friendly format.
   */
  async eventsDataMapper(
    body: EventBody
  ): Promise<{ result: RequestNormalizerResult; notFound: string[] }> {
    const templateId = await this.displayApiService.getTemplateId(this.eventTemplateType);
    if (!templateId) {
      throw new InternalServerErrorException(`No template ID found for ${this.eventTemplateType}`);
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

    body.result.item.forEach((item) => {
      if (!item.screen) {
        return;
      }

      const screens = item.screen[0].item;
      if (!screens.length) {
        return;
      }

      screens.forEach((screenName) => {
        if (!result[screenName]) {
          notFound.push(screenName);
          return;
        }

        result[screenName].push({
          templateId,
          content: {
            title: item.title[0],
            subTitle: item.field_teaser[0],
            host: item.host[0],
            date: this.nemDelingService.formatEventDate(item.startdate[0].item[0]),
            time: `kl. ${item.time[0].item[0]}`,
            image: item.billede[0].item[0].img[0].$.src ?? null,
            bgColor: item.bgcolor[0],
          },
        });
      });
    });

    return { result, notFound: [...new Set(notFound)] };
  }
}
