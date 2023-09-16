import joi, { SchemaLike } from "joi";

import { DataValidationError } from "./errors";

export function validate<T>(data: any, schema: SchemaLike): T {
  const realSchema = joi.compile(schema);
  const { error, value } = realSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    throw new DataValidationError(error);
  }
  return value;
}
