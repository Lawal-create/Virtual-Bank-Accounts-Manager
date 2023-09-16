import { DataValidationError, IncompleteEnvError } from "../internal/errors";

import dotenv from "dotenv";
import joi from "joi";
import { mapKeys } from "lodash";
import { validate } from "../internal/validator";
const trimmedString = joi.string().trim();
dotenv.config();
export interface ApplicationEnv {
  application_name: string;
  is_production: boolean;
  postgres_host: string;
  postgres_port: number;
  postgres_db: string;
  postgres_user: string;
  postgres_password: string;
  postgres_schema: string;
}
let env: ApplicationEnv;
const processedEnv = mapKeys(process.env, (_, key) => {
  return key.toLowerCase();
});
const envSchema = joi.object({
  application_name: trimmedString.default("platform-challenge"),
  node_env: trimmedString.valid("dev", "test", "production", "staging").default("dev"),
  is_production: joi.when("node_env", {
    is: joi.valid("dev", "test"),
    then: joi.boolean().default(false),
    otherwise: joi.boolean().default(true)
  }),
  postgres_host: joi.string().required(),
  postgres_port: joi.number().required(),
  postgres_db: joi.string().required(),
  postgres_user: joi.string().required(),
  postgres_password: joi.string().required(),
  postgres_schema: joi.string().default("public")
});
try {
  env = validate(processedEnv, envSchema);
} catch (err) {
  if (err instanceof DataValidationError) {
    throw new IncompleteEnvError(err);
  }
  throw err;
}
export default env;
