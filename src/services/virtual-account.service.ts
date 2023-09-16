import { RequestType, TransactionRequest, TransactionRequestRepository } from "@app/transaction-requests";
import { VirtualAccount, VirtualAccountRepository } from "@app/virtual-accounts";
import { inject, injectable } from "inversify";

import TYPES from "@app/config/app.types";
import { v4 as uuidV4 } from "uuid";

@injectable()
export class VirtualAccountService {
  @inject(TYPES.VirtualAccountRepo) private repo: VirtualAccountRepository;
  @inject(TYPES.TransactionRequestRepo) private txReqRepo: TransactionRequestRepository;

  async deposit(id: string, amount: number): Promise<VirtualAccount> {
    const account = await this.repo.getOne(id);
    if (!account) {
      throw new NoVirtualAccountError();
    }
    const updatedAccount = await this.repo.deposit(id, amount);
    await this.txReqRepo.create({
      amount,
      virtual_account_id: account.id,
      owner_id: account.owner_id,
      request_type: "deposit",
      status: "successful"
    });
    return updatedAccount;
  }

  async withdraw(id: string, amount: number): Promise<VirtualAccount> {
    const account = await this.repo.getOne(id);
    if (!account) {
      throw new NoVirtualAccountError();
    }
    const updatedAccount = await this.repo.withdraw(id, amount);
    if (!updatedAccount) {
      throw new InsufficientBalanceError();
    }
    await this.txReqRepo.create({
      amount,
      virtual_account_id: account.id,
      owner_id: account.owner_id,
      request_type: "withdrawal",
      status: "successful"
    });
    return updatedAccount;
  }

  async getBalance(id: string): Promise<number> {
    const account = await this.repo.getOne(id);
    if (!account) {
      throw new NoVirtualAccountError();
    }
    return account.balance;
  }

  async getTransactions(virtualAccountID: string, limit?: number, offset?: number): Promise<TransactionRequest[]> {
    const trueLimit = limit ?? 10;
    const trueOffset = offset ?? 0;
    return this.txReqRepo.getMultiple(virtualAccountID, trueLimit, trueOffset);
  }

  async transfer(
    depositAccountID: string,
    withdrawalAccountID: string,
    amount: number,
    parentID?: string
  ): Promise<VirtualAccount[]> {
    const accounts = await this.repo.transfer(depositAccountID, withdrawalAccountID, amount);
    if (!accounts.length) {
      throw new InsufficientBalanceError();
    }
    const [depositAccount, withdrawalAccount] = accounts;
    const sharedID = uuidV4();
    await this.txReqRepo.createPair(
      {
        amount,
        virtual_account_id: depositAccount.id,
        owner_id: depositAccount.owner_id,
        request_type: "deposit",
        status: "successful",
        metadata: {
          description: this.getTransferDescription(depositAccount, withdrawalAccount, "deposit"),
          shared_id: sharedID
        }
      },
      {
        amount,
        virtual_account_id: withdrawalAccount.id,
        owner_id: withdrawalAccount.owner_id,
        request_type: "withdrawal",
        status: "successful",
        metadata: {
          description: this.getTransferDescription(depositAccount, withdrawalAccount, "withdrawal"),
          shared_id: sharedID,
          ...(parentID ? { parent_id: parentID } : null)
        }
      }
    );
    return accounts;
  }

  async refund(withdrawalTransactionID: string): Promise<VirtualAccount[]> {
    const withdrawalTx = await this.txReqRepo.getOne(withdrawalTransactionID);
    if (!withdrawalTx) {
      throw new NoTransactionRequestError();
    }
    const correspondingDepositTx = await this.txReqRepo.getBySharedID(withdrawalTx.id, withdrawalTx.metadata.shared_id);
    return this.transfer(
      withdrawalTx.virtual_account_id,
      correspondingDepositTx.virtual_account_id,
      withdrawalTx.amount,
      withdrawalTransactionID
    );
  }

  private getTransferDescription(
    depositAccount: VirtualAccount,
    withdrawalAccount: VirtualAccount,
    requestType: RequestType
  ): string {
    const preposition = requestType === "deposit" ? "from" : "to";
    const account = requestType === "deposit" ? withdrawalAccount : depositAccount;
    const accountName = account.metadata.account_name;
    const accountNumber = account.metadata.account_number;
    return `Transfer ${preposition} ${accountName} - ${accountNumber}`;
  }
}
export class InsufficientBalanceError extends Error {
  constructor() {
    super("You do not have sufficient balance for this operation");
  }
}
export class NoVirtualAccountError extends Error {
  constructor() {
    super("This virtual account does not exist");
  }
}
export class NoTransactionRequestError extends Error {
  constructor() {
    super("This transaction request does not exist");
  }
}
