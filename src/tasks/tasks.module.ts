import {Logger, Module} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { BookByenModule } from "../book-byen/book-byen.module";

@Module({
  imports: [BookByenModule],
  providers: [TasksService, Logger],
})
export class TasksModule {}
