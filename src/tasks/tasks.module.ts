import { Logger, Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { BookByenModule } from "../book-byen/book-byen.module";
import { TwentyThreeVideoModule } from "../twenty-three-video/twenty-three-video.module";

@Module({
  imports: [BookByenModule, TwentyThreeVideoModule],
  providers: [TasksService, Logger],
})
export class TasksModule {}
