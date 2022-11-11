import { Logger, Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { BookByenModule } from "../book-byen/book-byen.module";
import { TwentyThreeVideoModule } from "../twenty-three-video/twenty-three-video.module";
import { IntegrationConfigModule } from "../integration-config/integration-config.module";
import { KkSlideshowModule } from "../kk-slideshow/kk-slideshow.module";

@Module({
  imports: [BookByenModule, TwentyThreeVideoModule, KkSlideshowModule],
  providers: [TasksService, Logger, IntegrationConfigModule],
})
export class TasksModule {}
