import { Logger, Module } from "@nestjs/common";
import { NemDelingService } from "./nemdeling.service";
import { NemDelingController } from "./nemdeling.controller";
import { HttpModule } from "@nestjs/axios";
import { DisplayApiModule } from "../display-api/display-api.module";

@Module({
  imports: [HttpModule, DisplayApiModule],
  controllers: [NemDelingController],
  providers: [NemDelingService, Logger],
  exports: [NemDelingService],
})
export class NemDelingModule {}
