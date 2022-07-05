import { Logger, Module } from '@nestjs/common';
import { BookByenService } from './book-byen.service';
import { DisplayApiService } from "../display-api/display-api.service";

@Module({
  providers: [BookByenService, Logger, DisplayApiService],
  exports: [BookByenService],
})
export class BookByenModule {}