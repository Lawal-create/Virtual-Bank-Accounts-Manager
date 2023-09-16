import { Model, Trackable } from "../internal/postgres";
export const requestStatus = <const>["pending", "successful", "failed", "canceled"];
export type RequestStatus = (typeof requestStatus)[number];
export const requestTypes = <const>["deposit", "withdrawal"];
export type RequestType = (typeof requestTypes)[number];
export interface TransactionRequest extends Model, Trackable {
  owner_id: string;
  virtual_account_id: string;
  request_type: RequestType;
  status: RequestStatus;
  amount: number;
  currency: string;
  metadata?: TransactionRequestMetadata;
}
export interface TransactionRequestMetadata {
  description?: string;
  parent_id?: string;
  shared_id?: string;
}
export interface TransactionRequestDTO {
  owner_id: string;
  virtual_account_id: string;
  request_type: RequestType;
  amount: number;
  status?: RequestStatus;
  metadata?: any;
}
