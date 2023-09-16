import { Logger } from "@app/internal/logger";
import env from "./env";
import knex from "knex";
import pg from "pg";
// parse numeric types as floats
pg.types.setTypeParser(pg.types.builtins.NUMERIC, parseFloat);
export async function createPostgres(logger: Logger) {
  const pg = knex({
    client: "pg",
    connection: {
      host: env.postgres_host,
      port: env.postgres_port,
      user: env.postgres_user,
      password: env.postgres_password,
      database: env.postgres_db,
      ssl: env.is_production,
      application_name: env.application_name
    },
    searchPath: [env.postgres_schema]
  });
  pg.on("error", err => logger.error(err));
  return pg;
}
