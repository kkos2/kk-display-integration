import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import xmlParser from "express-xml-bodyparser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(xmlParser());

  const config = new DocumentBuilder()
    .setTitle("KK Display Integration")
    .setDescription("API documentation for the KK Display Integration")
    .setVersion("1.0")
    .addTag("NemDeling")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(3000);
}
void bootstrap();
