import { Logger, Module } from '@nestjs/common';
import { BookByenService } from './book-byen.service';

@Module({
  providers: [BookByenService, Logger],
  exports: [BookByenService],
})
export class BookByenModule {}