import { Knex } from "knex";
import { TransactionRequest } from "../../src/transaction-requests";
import faker from "faker";
export function newTransactionRequest(ownerID: string, extras?: Partial<TransactionRequest>): TransactionRequest {
  return {
    id: faker.datatype.uuid(),
    created_at: new Date(),
    updated_at: new Date(),
    owner_id: ownerID,
    virtual_account_id: faker.datatype.uuid(),
    request_type: faker.random.arrayElement(["deposit", "withdrawal"]),
    status: "successful",
    amount: faker.datatype.number({ min: 500, max: 900 }),
    currency: "usd",
    ...extras
  };
}
export async function createTransactionRequest(
  db: Knex,
  ownerID: string,
  extras: Partial<TransactionRequest>
): Promise<TransactionRequest> {
  const [txReq] = await db<TransactionRequest>("transaction_requests").insert(
    newTransactionRequest(ownerID, extras),
    "*"
  );
  return txReq;
}
export async function getTransactionRequest(
  db: Knex,
  virtualAccountID: string
): Promise<TransactionRequest | undefined> {
  return db<TransactionRequest>("transaction_requests").where("virtual_account_id", virtualAccountID).first();
}
