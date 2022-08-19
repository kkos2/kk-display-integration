import { Injectable, Logger } from "@nestjs/common";
import { DisplayApiService } from "../display-api/display-api.service";
import { HttpService } from "@nestjs/axios";
import { Slide } from "../display-api/types";
import { lastValueFrom } from "rxjs";
import { SlideSlideInput } from "../display-api-client";

@Injectable()
export class BookByenService {
  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly displayApi: DisplayApiService
  ) {}

  // TODO, move this out into configuration.
  private readonly baseUrl = "https://api.bookbyen.dk/api/Bookings/Infoscreen";
  private readonly slideType = "book-byen";

  async syncAllSlides(): Promise<void> {
    this.logger.debug("BookByenService::syncAllSlides");
    const slides = await this.displayApi.fetchSlides(this.slideType);
    for (const slide of slides) {
      await this.syncSlide(slide);
    }
  }

  async syncSlide(slide: Slide): Promise<void> {
    let jsonData = await this.fetchBookByenData(slide.content.feedId);
    if (Array.isArray(jsonData)) {
      jsonData = jsonData.filter((item) => item.isDeleted !== true);
      if (slide.content.facilityId) {
        jsonData = jsonData.filter(
          (item) => item.facility.id === parseInt(slide.content.facilityId, 10)
        );
      }
      if (slide.content.areaId) {
        jsonData = jsonData.filter(
          (item) => item.facility.area.id === parseInt(slide.content.areaId, 10)
        );
      }
      slide.content.jsonData = JSON.stringify(jsonData);
      const id = slide["@id"].split("/").slice(-1)[0];
      await this.displayApi.updateSlide(id, slide as unknown as SlideSlideInput);
    }
  }

  async fetchBookByenData(feedId: number): Promise<Array<any> | void> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(this.baseUrl, { params: { locationId: feedId } })
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        "Error fetching book byen feed with id: " + feedId,
        (error as Error).message
      );
    }
  }
}
