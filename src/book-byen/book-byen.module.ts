import { Logger, Module } from "@nestjs/common";
import { BookByenService } from "./book-byen.service";
import { HttpModule } from "@nestjs/axios";
import { DisplayApiModule } from "../display-api/display-api.module";

@Module({
  imports: [HttpModule, DisplayApiModule],
  providers: [BookByenService, Logger],
  exports: [BookByenService],
})
export class BookByenModule {}
