import {
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
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

  /**
   * The template type to use when creating event list slides.
   */
  private readonly eventListTemplateType = "Event List";

  /**
   * The template type to use when creating event theme slides.
   */
  private readonly eventThemeTemplateType = "Event Theme";

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
  async serviceMessage(@Body() body: ServiceMessageBody, @Req() req: any): Promise<string> {
    this.logger.debug(req.rawBody);
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

    body.result.item?.forEach((item) => {
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
  async event(@Body() body: EventBody, @Req() req: any): Promise<string> {
    this.logger.debug(req.rawBody);
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

  @Post("event-lists")
  @UseGuards(AuthBasicGuard)
  @ApiCreatedResponse({
    description: "The event lists were synced.",
    type: String,
  })
  @ApiServiceUnavailableResponse({
    description: "Application is busy processing.",
  })
  @ApiInternalServerErrorResponse({
    description: "Application not able to process request.",
  })
  @ApiBody({ type: String })
  async eventList(@Body() body: EventBody, @Req() req: any): Promise<string> {
    this.logger.debug(req.rawBody);
    const results: NemDelingResult[] = [];

    const templateId = await this.displayApiService.getTemplateId(this.eventListTemplateType);
    if (!templateId) {
      throw new InternalServerErrorException(
        `No template ID found for ${this.eventListTemplateType}`
      );
    }

    // We don't want two processes to update slides at the same time. To
    // build a failsafe into the system, we reset after skipping 4 times. We
    // never expect this to be an issue, but in case something bad happens we
    // don't want this to get completely stuck.
    if (
      this.nemDelingService.eventListsAreSyncing > 0 &&
      this.nemDelingService.eventListsAreSyncing < 5
    ) {
      this.nemDelingService.eventListsAreSyncing++;
      throw new ServiceUnavailableException("Event lists are already being synced.");
    }

    this.nemDelingService.eventListsAreSyncing = 1;

    const data = await this.eventsDataMapper(body);
    for (const [screenName, slides] of Object.entries(data.result)) {
      const playlist = await this.nemDelingService.getEventListPlaylistFromScreenName(screenName);
      if (!playlist) {
        continue;
      }

      // Populate "jsonData" with the content from each event in the list.
      const slide: NemdelingSlide = {
        templateId,
        content: {
          jsonData: JSON.stringify(slides.map((item) => item.content)),
        },
      };

      const result = await this.nemDelingService.syncPlaylist(playlist, [slide]);
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

    this.nemDelingService.eventListsAreSyncing = 0;
    this.logger.log("Event lists result: " + JSON.stringify(results));
    return "OK: " + JSON.stringify(results);
  }

  @Post("event-theme")
  @UseGuards(AuthBasicGuard)
  @ApiCreatedResponse({
    description: "The event theme was synced.",
    type: String,
  })
  @ApiServiceUnavailableResponse({
    description: "Application is busy processing.",
  })
  @ApiInternalServerErrorResponse({
    description: "Application not able to process request.",
  })
  @ApiBody({ type: String })
  async eventTheme(@Body() body: EventBody, @Req() req: any): Promise<string> {
    this.logger.debug(req.rawBody);
    const results: NemDelingResult[] = [];

    const templateId = await this.displayApiService.getTemplateId(this.eventThemeTemplateType);
    if (!templateId) {
      throw new InternalServerErrorException(
        `No template ID found for ${this.eventThemeTemplateType}`
      );
    }

    // We don't want two processes to update slides at the same time. To
    // build a failsafe into the system, we reset after skipping 4 times. We
    // never expect this to be an issue, but in case something bad happens we
    // don't want this to get completely stuck.
    if (
      this.nemDelingService.eventThemesAreSyncing > 0 &&
      this.nemDelingService.eventThemesAreSyncing < 5
    ) {
      this.nemDelingService.eventThemesAreSyncing++;
      throw new ServiceUnavailableException("Event themes are already being synced.");
    }

    this.nemDelingService.eventThemesAreSyncing = 1;

    const data = await this.eventsDataMapper(body);
    for (const [screenName, slides] of Object.entries(data.result)) {
      const playlist = await this.nemDelingService.getEventThemePlaylistFromScreenName(screenName);
      if (!playlist) {
        continue;
      }

      // Remove time from the start and end date.
      const newSlides = slides.map((slide) => ({
        templateId,
        content: {
          ...slide.content,
          startDate: slide.content.startDate.split(" kl. ")[0],
          endDate: slide.content.endDate.split(" kl. ")[0],
        },
      }));

      const result = await this.nemDelingService.syncPlaylist(playlist, newSlides);
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

    this.nemDelingService.eventThemesAreSyncing = 0;
    this.logger.log("Event themes result: " + JSON.stringify(results));
    return "OK: " + JSON.stringify(results);
  }

  /**
   * Converts the events request body to Display API friendly format.
   */
  async eventsDataMapper(
    body: EventBody
  ): Promise<{ result: RequestNormalizerResult; notFound: string[] }> {
    const colorMap: any = {
      sort: "#000000",
      kk_blaa: "#000c2e",
      blaa: "#002CFC",
      marine_blaa: "#260EB5",
      stoev_blaa: "#025FCC",
      moerk_stoev_blaa: "#00519C",
      graa_blaa: "#1271A6",
      roed: "#C10023",
      rust_roed: "#BD3615",
      moerk_rosa: "#CD274F",
      bordeaux: "#900009",
      lilla: "#8332EB",
      groen: "#047C6E",
      blaa_groen: "#00777E",
      brun: "#5E4347",
      bronze: "#926B1F",
      moerke_graa: "#665E62",
      prismen: "#428515",
      gmc: "#0c807e",
      blaagaarden: "#116B91",
      huset: "#c7e2df",
      kiby: "#153d44",
    };

    const colorPaletteMap: Record<string, string> = {
      farvepar1: "farvepar1",
      farvepar2: "farvepar2",
      farvepar3: "farvepar3",
    };
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

    body.result.item
      // Sort by start date.
      ?.sort(
        (a, b) =>
          parseInt((a.startdate[0].item[0] as string).replace(/\./g, ""), 10) -
          parseInt((b.startdate[0].item[0] as string).replace(/\./g, ""), 10)
      )
      .forEach((item) => {
        if (!item.screen) {
          return;
        }

        const screens = item.screen[0].item;
        if (!screens.length) {
          return;
        }

        const [startTime, endTime] = item.time[0].item[0].split(" til ");
        const startDate = this.nemDelingService.formatEventDate(item.startdate[0].item[0]);
        const endDate = this.nemDelingService.formatEventDate(item.enddate[0].item[0]);

        screens.forEach((screenName) => {
          if (!result[screenName]) {
            notFound.push(screenName);
            return;
          }
          let backgroundColor = "";
          if (item.color && item.color[0] && colorMap[item.color[0]] !== undefined) {
            backgroundColor = colorMap[item.color[0]];
          }

          let title = item.title[0];
          /*
          Todo - what is the title name.
          if (item.field_title && item.field_title[0]) {
            title = item.field_title[0];
          }
          */

          let colorPalette = "";
          if (
            item.farvepar &&
            item.farvepar[0] &&
            colorPaletteMap[item.farvepar[0]] !== undefined
          ) {
            colorPalette = colorPaletteMap[item.farvepar[0]];
          }

          result[screenName].push({
            templateId,
            content: {
              title,
              subTitle: item.field_teaser[0],
              host: item.host[0],
              startDate: `${startDate} kl. ${startTime}`,
              endDate: startDate !== endDate ? `${endDate} kl. ${endTime}` : "",
              image: item.billede[0].item[0].img[0].$.src ?? null,
              bgColor: backgroundColor,
              colorPalette,
            },
          });
        });
      });

    return { result, notFound: [...new Set(notFound)] };
  }
}
