import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { applyProductionEnvAliases, normalizePlatformEnv } from "./config/productionEnv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "..");
const apiEnv = resolve(apiDir, ".env");
const apiProductionEnv = resolve(apiDir, ".env.production");
const rootEnv = resolve(__dirname, "..", "..", ".env");
const rootProductionEnv = resolve(__dirname, "..", "..", ".env.production");

/** 모노레포 루트 → apps/api 순 (API 전용 값이 우선) */
dotenv.config({ path: rootEnv, override: false });
dotenv.config({ path: apiEnv, override: true });

const isProduction =
  process.env.NODE_ENV === "production" || process.env.VLUE_PRODUCTION_LOCK === "1";
if (isProduction) {
  dotenv.config({ path: rootProductionEnv, override: false });
  dotenv.config({ path: apiProductionEnv, override: true });
}

normalizePlatformEnv();
applyProductionEnvAliases();
