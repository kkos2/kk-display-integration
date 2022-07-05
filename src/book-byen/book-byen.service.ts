import { Injectable, Logger } from '@nestjs/common';
import { DisplayApiService } from "../display-api/display-api.service";
@Injectable()
export class BookByenService {
  constructor(
    private readonly logger: Logger,
    private readonly displayApi: DisplayApiService
  ) {}

  syncAllSlides(): void {
    this.logger.debug('syncAllSlides');
    this.displayApi.fetchSlides();
  }
}