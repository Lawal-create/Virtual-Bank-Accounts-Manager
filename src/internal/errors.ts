import { ValidationError } from "joi";
export class DataValidationError extends Error {
  readonly messages: { [key: string]: string } = {};
  constructor(baseErr: ValidationError) {
    super("Could not validate");
    baseErr.details.forEach(detail => {
      this.messages[detail.context.label] = detail.message;
    });
  }
}
export class IncompleteEnvError extends Error {
  constructor(error: DataValidationError) {
    super(`Unable to load environment:\n${JSON.stringify(error.messages, null, 2)}`);
  }
}
