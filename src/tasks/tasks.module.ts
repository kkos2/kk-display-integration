import {Logger, Module} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { BookByenService } from "../book-byen/book-byen.service";

@Module({
  providers: [TasksService, Logger, BookByenService],
})
export class TasksModule {}
