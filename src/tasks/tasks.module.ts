import {Logger, Module} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { BookByenService } from "../book-byen/book-byen.service";
import { DisplayApiService } from "../display-api/display-api.service";

@Module({
  providers: [TasksService, Logger, BookByenService, DisplayApiService],
})
export class TasksModule {}
