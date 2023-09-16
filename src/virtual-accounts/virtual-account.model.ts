import { Model, Trackable } from "../internal/postgres";
export const virtualAccountCurrencies = <const>["usd", "gbp", "eur"];

export type VirtualAccountCurrency = (typeof virtualAccountCurrencies)[number];

export interface VirtualAccount extends Model, Trackable {
  owner_id: string;
  balance: number;
  metadata: VirtualAccountMetadata;
}

export interface VirtualAccountMetadata {
  account_name: string;
  account_number: string;
  bank_name: string;
  account_type: string;
  currency: VirtualAccountCurrency;
  swift_code?: string;
  routing_number?: string;
  bank_address?: string;
}

export interface VirtualAccountDTO {
  owner_id: string;
  balance: number;
  metadata: VirtualAccountMetadata;
}
