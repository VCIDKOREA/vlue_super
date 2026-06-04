-- CreateTable
CREATE TABLE "wallet_withdrawal_accounts" (
    "user_id" UUID NOT NULL,
    "bank_code" VARCHAR(10) NOT NULL,
    "bank_name" VARCHAR(40) NOT NULL,
    "account_number" VARCHAR(30) NOT NULL,
    "account_holder" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_withdrawal_accounts_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "wallet_withdrawal_accounts" ADD CONSTRAINT "wallet_withdrawal_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
