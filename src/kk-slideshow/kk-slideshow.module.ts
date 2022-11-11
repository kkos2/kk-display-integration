import { Logger, Module } from "@nestjs/common";
import { KkSlideshowService } from "./kk-slideshow.service";
import { HttpModule } from "@nestjs/axios";
import { DisplayApiModule } from "../display-api/display-api.module";
import { IntegrationConfigModule } from "../integration-config/integration-config.module";

@Module({
  imports: [HttpModule, DisplayApiModule, IntegrationConfigModule],
  providers: [KkSlideshowService, Logger],
  exports: [KkSlideshowService],
})
export class KkSlideshowModule {}
