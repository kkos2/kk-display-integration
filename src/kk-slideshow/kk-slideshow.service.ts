import { Injectable, Logger } from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import { HttpService } from "@nestjs/axios";
import { Slide } from "../display-api/types";
import { lastValueFrom } from "rxjs";
import { parseString } from "xml2js";
import { SlideSlideInput } from "../display-api-client";
import { IntegrationConfigService } from "../integration-config/integration-config.service";

interface KkSlideshowXmlResponse {
  EnumerationResults?: {
    Blobs?: {
      Blob: KkSlideshowXmlResponseBlob[];
    }[];
  };
}

interface KkSlideshowXmlResponseBlob {
  Name: string[];
}

@Injectable()
export class KkSlideshowService {
  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly displayApi: DisplayApiService,
    private readonly config: IntegrationConfigService
  ) {}

  private readonly baseUrl = this.config.kkSlideshowApiEndpoint;
  private readonly apiToken = this.config.kkSlideshowApiToken;
  private readonly imageToken = this.config.kkSlideshowImageToken;
  private readonly slideType = "KK Slideshow";

  async syncAllSlides(): Promise<void> {
    this.logger.debug("KkSlideshowService::syncAllSlides");
    const slides = await this.displayApi.fetchSlides(this.slideType);
    for (const slide of slides) {
      void this.syncSlide(slide);
    }
  }

  async syncSlide(slide: Slide): Promise<void> {
    const folder = slide.content.imageFolder;
    if (!folder) {
      return;
    }
    const xmlData = await this.fetchImageData(slide.content.imageFolder);
    if (!xmlData) {
      return;
    }
    parseString(xmlData, (err, result) => {
      const images: string[] = [];

      const data = result as KkSlideshowXmlResponse;
      data?.EnumerationResults?.Blobs?.shift()?.Blob?.forEach((blob) => {
        images.push(this.baseUrl + blob.Name[0] + this.imageToken);
      });
      slide.content.jsonData = JSON.stringify(images);
      const id = slide["@id"].split("/").slice(-1)[0];
      void this.displayApi.updateSlide(id, slide as unknown as SlideSlideInput);
    });
  }

  async fetchImageData(folder: string): Promise<string | void> {
    try {
      let url = this.baseUrl + this.apiToken;
      if (folder && folder.length > 0) {
        url += "&prefix=" + folder;
      }
      const response = await lastValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      this.logger.error(
        "Error fetching slideshow images for folder: " + folder,
        (error as Error).message
      );
    }
  }
}
