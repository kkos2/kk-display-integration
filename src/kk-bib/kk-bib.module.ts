import { Logger, Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DisplayApiModule } from "../display-api/display-api.module";
import { KkBibService } from "./kk-bib.service";
import { NemDelingModule } from "../nemdeling/nemdeling.module";

@Module({
  imports: [HttpModule, DisplayApiModule, NemDelingModule],
  providers: [KkBibService, Logger],
  exports: [KkBibService],
})
export class KkBibModule {}
