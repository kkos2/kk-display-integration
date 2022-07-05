import { Injectable, Logger } from '@nestjs/common';
@Injectable()
export class BookByenService {
  constructor(
    private readonly logger: Logger
  ) {}

  syncAllSlides(): void {
    this.logger.debug('syncAllSlides');
  }
}