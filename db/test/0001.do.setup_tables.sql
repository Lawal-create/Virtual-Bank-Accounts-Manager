begin;
create or replace function on_update_timestamp()
  returns trigger as $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
$$ language 'plpgsql';

create table if not exists virtual_accounts(
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    owner_id uuid not null,
    balance decimal(12, 2) not null,
    metadata jsonb
);
create table if not exists transaction_requests(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  owner_id uuid not null,
  virtual_account_id uuid not null,
  request_type text not null,
  status text default 'pending',
  amount decimal(12, 2) not null,
  currency text default 'usd',
  metadata jsonb,
  foreign key (virtual_account_id) references virtual_accounts on delete cascade
);


drop trigger if exists virtual_accounts_updated_at on virtual_accounts;
create trigger virtual_accounts_updated_at before
update on virtual_accounts for each row execute procedure on_update_timestamp();

drop trigger if exists transaction_requests_updated_at on transaction_requests;
create trigger transaction_requests_updated_at before
update on transaction_requests for each row execute procedure on_update_timestamp();

create index if not exists idx_virtual_accounts_owner_id on virtual_accounts(owner_id);
create index if not exists idx_transaction_requests_owner_id on transaction_requests(owner_id);
create index if not exists idx_transaction_requests_request_type on transaction_requests(request_type);
create index if not exists idx_transaction_requests_status on transaction_requests(status);
commit;