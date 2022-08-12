import { Logger, Module } from "@nestjs/common";
import { IntegrationConfigModule } from "../integration-config/integration-config.module";
import { DisplayApiService } from "./display-api.service";

@Module({
  imports: [IntegrationConfigModule],
  providers: [DisplayApiService, Logger],
  exports: [DisplayApiService],
})
export class DisplayApiModule {}
