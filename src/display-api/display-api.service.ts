import { Injectable, Logger } from '@nestjs/common';
@Injectable()
export class DisplayApiService {
  constructor(
    private readonly logger: Logger
  ) {}

  fetchSlides(): string {
    this.logger.debug('fetchSlides');
    return 'test';
  }

}