import { Logger, Module } from '@nestjs/common';
import { DisplayApiService } from './display-api.service';

@Module({
  providers: [DisplayApiService, Logger],
  exports: [DisplayApiService],
})
export class DisplayApiModule {}