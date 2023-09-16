import { Knex } from "knex";
import { VirtualAccount } from "../../src/virtual-accounts";
import faker from "faker";
export function newVirtualAccount(ownerID: string, extras?: Partial<VirtualAccount>): VirtualAccount {
  return {
    id: faker.datatype.uuid(),
    created_at: new Date(),
    updated_at: new Date(),
    owner_id: ownerID,
    balance: faker.datatype.number({ min: 1000, max: 5000 }),
    metadata: {
      account_name: faker.finance.accountName(),
      account_number: faker.finance.account(10),
      bank_name: faker.company.companyName(),
      account_type: "savings",
      currency: "usd"
    },
    ...extras
  };
}
export async function createVirtualAccount(
  db: Knex,
  ownerID: string,
  extras?: Partial<VirtualAccount>
): Promise<VirtualAccount> {
  const [account] = await db<VirtualAccount>("virtual_accounts").insert(newVirtualAccount(ownerID, extras), "*");
  return account;
}
