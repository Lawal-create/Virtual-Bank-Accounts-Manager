import { TransactionRequest, TransactionRequestDTO } from "./transaction-request.model";

import { Repository } from "@app/internal/postgres";

export class TransactionRequestRepository extends Repository<TransactionRequest> {
  private db = this.setup("transaction_requests");

  /**
   *
   * @param dto transaction request partial details
   * @returns
   */
  async create(dto: TransactionRequestDTO): Promise<TransactionRequest> {
    const [txReq] = await this.db().insert(dto, "*");
    return txReq;
  }

  /**
   *
   * @param id id of the transaction request
   * @returns
   */
  async getOne(id: string): Promise<TransactionRequest | null> {
    return this.db().where("id", id).first();
  }

  /**
   *
   * @param id id of the transaction request
   * @param sharedID
   * @returns
   */
  async getBySharedID(id: string, sharedID: string): Promise<TransactionRequest | null> {
    return this.db().where("id", "<>", id).andWhereRaw("metadata->>'shared_id' = ?", sharedID).first();
  }

  async getMultiple(virtualAccountID: string, limit: number, offset: number): Promise<TransactionRequest[]> {
    return this.db().where("virtual_account_id", virtualAccountID).limit(limit).offset(offset);
  }

  async createPair(
    depositDTO: TransactionRequestDTO,
    withdrawalDTO: TransactionRequestDTO
  ): Promise<TransactionRequest[]> {
    return this.knex.transaction(async trx => {
      const table = "transaction_requests";
      const [depositTx] = await trx<TransactionRequest>(table).insert(depositDTO, "*");
      const [withdrawalTx] = await trx<TransactionRequest>(table).insert(withdrawalDTO, "*");
      return [depositTx, withdrawalTx];
    });
  }
}
