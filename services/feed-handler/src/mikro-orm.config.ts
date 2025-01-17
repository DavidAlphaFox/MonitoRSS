import { Options } from "@mikro-orm/core";
import { config } from "./config";

const configVals = config();

const MikroOrmConfig: Options = {
  entities: ["dist/**/*.entity.js"],
  entitiesTs: ["src/**/*.entity.ts"],
  clientUrl: configVals.FEED_HANDLER_POSTGRES_URI,
  dbName: configVals.FEED_HANDLER_POSTGRES_DATABASE,
  type: "postgresql",
  forceUtcTimezone: true,
  timezone: "UTC",
};

export default MikroOrmConfig;
