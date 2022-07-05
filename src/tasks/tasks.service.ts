import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private value = false;
  private readonly logger = new Logger(TasksService.name);

  @Cron('* * * * * *')
  syncBookByen() {
    if (this.value) {
      this.logger.debug('Sync book byen');
    }
    else {
      this.logger.debug('Skipping sync book byen');
    }
    this.value = !this.value;
  }
}
