import { inject, injectable } from "inversify";

import { Knex } from "knex";
import TYPES from "./library.types";
export interface Model {
  id: string;
  created_at: Date;
}
/**
 * Properties for models that need to track updates
 */
export interface Trackable {
  updated_at: Date;
}
@injectable()
export class Repository<T> {
  @inject(TYPES.Knex) protected knex: Knex;
  /**
   * creates a knex query object for a specified table
   * @param table table name
   * @param excluded fields which should be excluded from the query result to be returned
   */
  protected setup(table: string, ...excluded: string[]) {
    return () => this.knex<T>(table).queryContext({ excluded });
  }
}
