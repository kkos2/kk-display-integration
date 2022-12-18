import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { parseString } from "xml2js";
import { lastValueFrom } from "rxjs";
import { NemdelingSlide } from "../nemdeling/types";
import { DisplayApiService } from "../display-api/display-api.service";
import { NemDelingService } from "../nemdeling/nemdeling.service";
import { differenceInHours, format } from "date-fns";
import daLocale from "date-fns/locale/da";
import { IntegrationConfigService } from "../integration-config/integration-config.service";

// We have only defined the properties that we actually use here.
type KkBibActivity = {
  uid: string[];
  titel: string[];
  list_image: string[];
  beskrivelse: string[];
  startdato: string[];
  slutdato: string[];
  bibname: string[];
  screenname?: Array<{ item: string[] }>;
};

export type KkBibResult = {
  name: string;
  status: string;
};

type RequestNormalizerResult = { [key: string]: NemdelingSlide[] };

@Injectable()
export class KkBibService {
  /**
   * The template type to use when creating KK Bib slides.
   */
  private readonly templateType = "event";

  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
    private displayApiService: DisplayApiService,
    private nemDelingService: NemDelingService,
    private readonly config: IntegrationConfigService
  ) {}

  /**
   * Syncs all slides from the KK Bib feed.
   */
  async syncAllSlides(): Promise<void> {
    this.logger.debug("KkBibService::syncAllSlides");
    const response = await this.fetchSlides();
    if (!response || !response.length) {
      return;
    }

    const data = await this.dataMapper(response);
    const results: KkBibResult[] = [];
    for (const [screenName, slides] of Object.entries(data.result)) {
      const playlist = await this.nemDelingService.getKkBibPlaylistFromScreenName(screenName);
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

    this.logger.log("KkBibService result: " + JSON.stringify(results));
  }

  /**
   * Fetches slides from the KK Bib feed.
   */
  async fetchSlides(): Promise<KkBibActivity[]> {
    const { data } = await lastValueFrom(this.httpService.get(this.config.kkBibApiEndpoint));
    return new Promise((resolve, reject) => {
      parseString(data, (err, result) => {
        if (err) {
          reject(err);
        } else {
          const slides = result.activities?.activity?.filter(
            (item: KkBibActivity) => item?.screenname
          );
          resolve(slides);
        }
      });
    });
  }

  /**
   * Converts the request body to Display API friendly format.
   */
  async dataMapper(
    body: KkBibActivity[]
  ): Promise<{ result: RequestNormalizerResult; notFound: string[] }> {
    const templateId = await this.displayApiService.getTemplateId(this.templateType);
    if (!templateId) {
      throw new InternalServerErrorException(`No template ID found for ${this.templateType}`);
    }

    const result: RequestNormalizerResult = {};
    const notFound: string[] = [];

    // Create result object from existing screens, to support cases where
    // event slides have been deleted, but still exist on a screen.
    const screensResponse = await this.displayApiService.fetchScreens();
    screensResponse.forEach(({ title }) => {
      if (title) {
        result[title] = [];
      }
    });

    body.forEach((item) => {
      if (!item.screenname) {
        return;
      }

      const screens = item.screenname[0].item;
      if (!screens || !screens.length) {
        return;
      }

      const startDate = new Date(item.startdato[0].replace(/\w*$/, ""));
      const endDate = new Date(item.slutdato[0].replace(/\w*$/, ""));
      screens.forEach((screenName) => {
        if (!result[screenName]) {
          notFound.push(screenName);
          return;
        }

        result[screenName].push({
          templateId,
          content: {
            externalId: item.uid[0],
            title: item.titel[0],
            subTitle: item.beskrivelse[0],
            host: item.bibname[0],
            startDate: this.formatDate(startDate),
            endDate: differenceInHours(endDate, startDate) > 24 ? this.formatDate(endDate) : "",
            image: item.list_image[0] ?? null,
            date: startDate,
            bgColor: "#3a6f55",
          },
        });
      });
    });

    // Sort results by date.
    Object.entries(result).forEach(([key, slides]) => {
      result[key] = slides.sort((a, b) => (a.content.date > b.content.date ? 1 : -1));
    });

    return { result, notFound: [...new Set(notFound)] };
  }

  /**
   * Formats a date to a human-readable format.
   *
   * @param {Date} date - The date to format.
   * @return {string} - The formatted date.
   */
  formatDate(date: Date): string {
    return format(date, "d. MMMM yyyy - 'kl'. HH.mm", {
      locale: daLocale,
    }).replace(/^\w/, (letter) => letter.toUpperCase());
  }
}
