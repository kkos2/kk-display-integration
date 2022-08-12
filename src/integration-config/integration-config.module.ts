import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { IntegrationConfigService } from "./integration-config.service";

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [IntegrationConfigService],
  exports: [IntegrationConfigService],
})
export class IntegrationConfigModule {}
