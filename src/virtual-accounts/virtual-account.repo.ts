import { Repository } from "@app/internal/postgres";
import { VirtualAccount } from "./virtual-account.model";

export class VirtualAccountRepository extends Repository<VirtualAccount> {
  private db = this.setup("virtual_accounts");

  async getOne(id: string): Promise<VirtualAccount | null> {
    return this.db().where("id", id).first();
  }

  async withdraw(id: string, amount: number): Promise<VirtualAccount | null> {
    const [account] = await this.db()
      .where("id", id)
      .andWhere("balance", ">=", amount)
      .decrement("balance", amount)
      .returning("*");
    return account;
  }

  async deposit(id: string, amount: number): Promise<VirtualAccount | null> {
    const [account] = await this.db().where("id", id).increment("balance", amount).returning("*");
    return account;
  }

  async transfer(depositAccountID: string, withdrawalAccountID: string, amount: number): Promise<VirtualAccount[]> {
    return this.knex.transaction(async trx => {
      const table = "virtual_accounts";

      const [withdrawalAccount] = await trx<VirtualAccount>(table)
        .where("id", withdrawalAccountID)
        .andWhere("balance", ">=", amount)
        .decrement("balance", amount)
        .returning("*");
      if (!withdrawalAccount) {
        return [];
      }

      const [depositAccount] = await trx<VirtualAccount>(table)
        .where("id", depositAccountID)
        .increment("balance", amount)
        .returning("*");
      return [depositAccount, withdrawalAccount];
    });
  }
}
