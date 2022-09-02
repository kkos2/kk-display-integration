import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { BasicStrategy } from "./auth-basic.strategy";
import { IntegrationConfigModule } from "src/integration-config/integration-config.module";

@Module({
  imports: [PassportModule, IntegrationConfigModule],
  providers: [BasicStrategy],
})
export class AuthModule {}
