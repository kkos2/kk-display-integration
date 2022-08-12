import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { IntegrationConfigModule } from "./integration-config/integration-config.module";

import { TasksModule } from "./tasks/tasks.module";

@Module({
  imports: [ScheduleModule.forRoot(), TasksModule, IntegrationConfigModule],
})
export class AppModule {}
