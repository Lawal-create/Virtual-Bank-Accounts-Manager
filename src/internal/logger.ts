import Bunyan from "bunyan";
import env from "../config/env";
export class Logger {
  private logger: Bunyan;
  constructor() {
    this.logger = new Bunyan({
      name: env.application_name
    });
  }
  warn(message: string) {
    this.logger.warn(message);
  }
  error(error: Error) {
    this.warn(`Error in application: ${env.application_name}`);
    this.logger.error(error);
  }
  info(message: string) {
    this.logger.info(message);
  }
}
