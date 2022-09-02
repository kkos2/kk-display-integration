import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { IntegrationConfigModule } from "./integration-config/integration-config.module";
import { TasksModule } from "./tasks/tasks.module";
import { NemDelingModule } from "./nemdeling/nemdeling.module";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TasksModule,
    IntegrationConfigModule,
    NemDelingModule,
    AuthModule,
  ],
})
export class AppModule {}
