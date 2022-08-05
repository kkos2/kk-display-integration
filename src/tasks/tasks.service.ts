import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BookByenService } from "../book-byen/book-byen.service";
import { TwentyThreeVideoService } from "../twenty-three-video/twenty-three-video.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly logger: Logger,
    private readonly bookByen: BookByenService,
    private readonly twentyThreeVideo: TwentyThreeVideoService
  ) {}

  @Cron("* * * * * *")
  async syncBookByen(): Promise<void> {
    await this.bookByen.syncAllSlides();
    return;
  }

  @Cron("* * * * * *")
  async syncTwentyThreeVideo(): Promise<void> {
    await this.twentyThreeVideo.syncAllSlides();
    return;
  }
}
