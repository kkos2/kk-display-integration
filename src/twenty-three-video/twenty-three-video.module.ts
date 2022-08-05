import { Logger, Module } from "@nestjs/common";
import { TwentyThreeVideoService } from "./twenty-three-video.service";
import { HttpModule } from "@nestjs/axios";
import { DisplayApiModule } from "../display-api/display-api.module";

@Module({
  imports: [HttpModule, DisplayApiModule],
  providers: [TwentyThreeVideoService, Logger],
  exports: [TwentyThreeVideoService],
})
export class TwentyThreeVideoModule {}
