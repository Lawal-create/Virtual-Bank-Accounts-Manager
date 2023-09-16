import "reflect-metadata";

import { createTransactionRequest, getTransactionRequest } from "../helpers/transaction-request";

import { Container } from "inversify";
import { Knex } from "knex";
import LIB_TYPES from "../../src/internal/library.types";
import { Logger } from "../../src/internal/logger";
import TYPES from "../../src/config/app.types";
import { TransactionRequestRepository } from "../../src/transaction-requests";
import { VirtualAccountRepository } from "../../src/virtual-accounts";
import { VirtualAccountService } from "../../src/services";
import { createPostgres } from "../../src/config/postgres";
import { createVirtualAccount } from "../helpers/virtual-account";
import { expect } from "chai";
import faker from "faker";
import { repeat } from "../helper";

let pg: Knex;
let container: Container;

beforeAll(async () => {
  container = new Container();
  const logger = new Logger();
  pg = await createPostgres(logger);
  container.bind<Knex>(LIB_TYPES.Knex).toConstantValue(pg);
  container.bind<Logger>(TYPES.Logger).toConstantValue(logger);
  container.bind<VirtualAccountRepository>(TYPES.VirtualAccountRepo).to(VirtualAccountRepository);
  container.bind<TransactionRequestRepository>(TYPES.TransactionRequestRepo).to(TransactionRequestRepository);
  container.bind<VirtualAccountService>(TYPES.VirtualAccountService).to(VirtualAccountService);
});

afterEach(async () => {
  await pg("transaction_requests").del();
  await pg("virtual_accounts").del();
});

describe("VirtualAccountService#getBalance", () => {
  it("should throw an error for a non-existent account", async () => {
    const randomID = faker.datatype.uuid();
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    try {
      await service.getBalance(randomID);
    } catch (error) {
      expect(error.message).to.eq("This virtual account does not exist");
    }
  });
  it("should fetch balance for an existing account", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const ownerID = faker.datatype.uuid();
    const account = await createVirtualAccount(pg, ownerID);
    const result = await service.getBalance(account.id);
    expect(result).to.eq(account.balance);
  });
});

describe("VirtualAccountService#deposit", () => {
  it("should successfully process a deposit", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const ownerID = faker.datatype.uuid();
    const amount = faker.datatype.number({ min: 100, max: 500 });
    const account = await createVirtualAccount(pg, ownerID);
    const result = await service.deposit(account.id, amount);
    expect(result.balance).to.eq(amount + account.balance);
  });
});

describe("VirtualAccountService#withdrawal", () => {
  it("should be unable to process withdrawal due to insufficient funds", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const ownerID = faker.datatype.uuid();
    const amount = faker.datatype.number({ min: 300, max: 500 });
    const account = await createVirtualAccount(pg, ownerID, { balance: faker.datatype.number({ min: 50, max: 250 }) });
    try {
      await service.withdraw(account.id, amount);
    } catch (error) {
      expect(error.message).to.eq("You do not have sufficient balance for this operation");
    }
  });
  it("should successfully process a withdrawal", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const ownerID = faker.datatype.uuid();
    const amount = faker.datatype.number({ min: 50, max: 250 });
    const account = await createVirtualAccount(pg, ownerID, { balance: faker.datatype.number({ min: 300, max: 500 }) });
    const result = await service.withdraw(account.id, amount);
    expect(result.balance).to.eq(account.balance - amount);
  });
});

describe("VirtualAccountService#getTransactions", () => {
  it("should successfully fetch transaction history", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const ownerID = faker.datatype.uuid();
    const account = await createVirtualAccount(pg, ownerID, { balance: faker.datatype.number({ min: 300, max: 500 }) });
    await repeat(3, () => createTransactionRequest(pg, ownerID, { virtual_account_id: account.id }));
    const result = await service.getTransactions(account.id);
    expect(result).to.have.lengthOf(3);
    result.forEach(acc => {
      expect(acc.virtual_account_id).to.eq(account.id);
      expect(acc.owner_id).to.eq(ownerID);
    });
  });
});

describe("VirtualAccountService#transfer", () => {
  it("should fail to transfer due to insufficient funds", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const depositOwnerID = faker.datatype.uuid();
    const withdrawalOwnerID = faker.datatype.uuid();
    const depositAccount = await createVirtualAccount(pg, depositOwnerID, {
      balance: faker.datatype.number({ min: 300, max: 500 })
    });
    const withdrawalAccount = await createVirtualAccount(pg, withdrawalOwnerID, {
      balance: faker.datatype.number({ min: 300, max: 500 })
    });
    const amount = faker.datatype.number({ min: 700, max: 900 });
    try {
      await service.transfer(depositAccount.id, withdrawalAccount.id, amount);
    } catch (error) {
      expect(error.message).to.eq("You do not have sufficient balance for this operation");
    }
  });
  it("should successfully transfer funds between 2 virtual accounts", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const depositOwnerID = faker.datatype.uuid();
    const withdrawalOwnerID = faker.datatype.uuid();
    const depositAccount = await createVirtualAccount(pg, depositOwnerID, {
      balance: faker.datatype.number({ min: 300, max: 500 })
    });
    const withdrawalAccount = await createVirtualAccount(pg, withdrawalOwnerID, {
      balance: faker.datatype.number({ min: 300, max: 500 })
    });
    const amount = faker.datatype.number({ min: 50, max: 250 });
    const result = await service.transfer(depositAccount.id, withdrawalAccount.id, amount);
    expect(result).to.have.lengthOf(2);
    expect(result[0].id).to.eq(depositAccount.id);
    expect(result[0].balance).to.eq(depositAccount.balance + amount);
    expect(result[1].id).to.eq(withdrawalAccount.id);
    expect(result[1].balance).to.eq(withdrawalAccount.balance - amount);
    const depositTx = await getTransactionRequest(pg, depositAccount.id);
    expect(depositTx!.virtual_account_id).to.eq(depositAccount.id);
    expect(depositTx!.request_type).to.eq("deposit");
    const withdrawalTx = await getTransactionRequest(pg, withdrawalAccount.id);
    expect(withdrawalTx!.virtual_account_id).to.eq(withdrawalAccount.id);
    expect(withdrawalTx!.request_type).to.eq("withdrawal");
  });
});

describe("VirtualAccountService#refund", () => {
  it("should successfully refund an existing withdrawal transaction", async () => {
    const service = container.get<VirtualAccountService>(TYPES.VirtualAccountService);
    const depositOwnerID = faker.datatype.uuid();
    const withdrawalOwnerID = faker.datatype.uuid();
    const depositAccount = await createVirtualAccount(pg, depositOwnerID, {
      balance: faker.datatype.number({ min: 300, max: 500 })
    });
    const withdrawalAccount = await createVirtualAccount(pg, withdrawalOwnerID, {
      balance: faker.datatype.number({ min: 300, max: 500 })
    });
    const initialSharedID = faker.datatype.uuid();
    const amount = faker.datatype.number({ min: 50, max: 250 });
    const initialWithdrawalTx = await createTransactionRequest(pg, withdrawalOwnerID, {
      amount,
      virtual_account_id: withdrawalAccount.id,
      request_type: "withdrawal",
      metadata: { shared_id: initialSharedID }
    });
    await createTransactionRequest(pg, depositOwnerID, {
      amount,
      virtual_account_id: depositAccount.id,
      request_type: "withdrawal",
      metadata: { shared_id: initialSharedID }
    });
    const result = await service.refund(initialWithdrawalTx.id);
    expect(result).to.have.lengthOf(2);
    expect(result[0].id).to.eq(withdrawalAccount.id);
    expect(result[0].balance).to.eq(withdrawalAccount.balance + amount);
    expect(result[1].id).to.eq(depositAccount.id);
    expect(result[1].balance).to.eq(depositAccount.balance - amount);
  });
});
