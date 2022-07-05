import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookByenService } from "../book-byen/book-byen.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly logger: Logger,
    private readonly bookByen: BookByenService
  ) {}

  @Cron('* * * * * *')
  syncBookByen() {
    this.bookByen.syncAllSlides();
  }
}
