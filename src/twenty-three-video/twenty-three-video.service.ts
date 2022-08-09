import { Injectable, Logger } from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import { HttpService } from "@nestjs/axios";
import { Slide } from "../display-api/types";
import { lastValueFrom } from "rxjs";
import { SlideSlideInput } from "../display-api-client";

interface TwentyThreeVideoListParams {
  format: string;
  raw: boolean;
  tags?: string;
  album_id?: string;
}

@Injectable()
export class TwentyThreeVideoService {
  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly displayApi: DisplayApiService
  ) {}

  // TODO, move this out into configuration.
  private readonly baseUrl = "https://video.kk.dk/api/photo/list";
  private readonly slideType = "TwentyThreeVideo";

  async syncAllSlides(): Promise<void> {
    this.logger.debug("TwentyThreeVideoService::syncAllSlides");
    const slides = await this.displayApi.fetchSlides(this.slideType);
    for (const slide of slides) {
      await this.syncSlide(slide);
    }
  }

  async syncSlide(slide: Slide): Promise<void> {
    const args: TwentyThreeVideoListParams = {
      format: "json",
      raw: true,
    };
    if (slide.content.tags) {
      args.tags = slide.content.tags;
    }
    if (slide.content.album_id) {
      args.album_id = slide.content.album_id;
    }
    const jsonData = await this.fetchTwentyThreeVideoList(args);
    if (Array.isArray(jsonData)) {
      slide.content.jsonData = JSON.stringify(jsonData);
      const id = slide["@id"].split("/").slice(-1)[0];
      await this.displayApi.updateSlide(id, slide as unknown as SlideSlideInput);
    }
  }

  async fetchTwentyThreeVideoList(params: TwentyThreeVideoListParams): Promise<Array<any> | void> {
    try {
      const data = await lastValueFrom(this.httpService.get(this.baseUrl, { params })).then(
        (response) => response.data
      );
      if (data.status !== "ok") {
        this.logger.error("❌ ~ error fetching kk video list did not get ok status back");
      }
      if (!Array.isArray(data.photos)) {
        return [];
      }
      // Return all photo items with a photo_id.
      return data.photos.filter((item) => !!item.photo_id).map((item) => item.photo_id);
    } catch (error) {
      this.logger.error("❌ ~ error fetching kk video list", error);
    }
  }
}
