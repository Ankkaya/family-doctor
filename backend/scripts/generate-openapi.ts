import "../load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";

process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:15432/platform_db?schema=public";
process.env.REDIS_PASSWORD ||= "openapi-generation-only";
process.env.FILE_BASE_URL ||= "http://localhost:3001";
process.env.JWT_SECRET ||= "openapi-generation-only-jwt-secret-32";
process.env.JWT_REFRESH_SECRET ||= "openapi-generation-only-refresh-secret-32";
process.env.MINIO_SKIP_INIT ||= "true";

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle("Family Doctor Platform API")
    .setDescription("家庭药箱系统后台与 App BFF 接口文档")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = path.resolve(process.cwd(), "../docs/api/openapi.json");

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  try {
    await app.close();
  } catch (error) {
    const message = String((error as { message?: string }).message ?? error);
    if (!message.includes("client is closed")) {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
