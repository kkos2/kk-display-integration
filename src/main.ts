import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import xmlParser from "express-xml-bodyparser";
import basicAuth from "express-basic-auth";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(xmlParser());

  // Add basic auth to the swagger endpoint.
  // Grab credentials directly from .env, since we cannot inject the integration
  // configuration service.
  if (process.env.HTTP_BASIC_USER && process.env.HTTP_BASIC_PASS) {
    app.use(
      ["/api"],
      basicAuth({
        challenge: true,
        users: { [process.env.HTTP_BASIC_USER]: process.env.HTTP_BASIC_PASS },
      })
    );
  }

  const config = new DocumentBuilder()
    .setTitle("KK Display Integration")
    .setDescription("API documentation for the KK Display Integration")
    .setVersion("1.0")
    .addTag("NemDeling")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(process.env.PORT || 3000);
}
void bootstrap();
