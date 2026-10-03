CREATE TYPE "public"."debt_status" AS ENUM('ACTIVE', 'ON_TRACK', 'BEHIND', 'CLOSED', 'DEFAULTED');--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expense_id" uuid,
	"amount_kopecks" bigint NOT NULL,
	"previous_balance_kopecks" bigint NOT NULL,
	"new_balance_kopecks" bigint NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"notes" text,
	"idempotency_key" varchar(256),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_debt_payment_positive" CHECK ("debt_payments"."amount_kopecks" > 0),
	CONSTRAINT "chk_debt_payment_arithmetic" CHECK ("debt_payments"."new_balance_kopecks" = "debt_payments"."previous_balance_kopecks" - "debt_payments"."amount_kopecks")
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"creditor" varchar(256),
	"original_amount_kopecks" bigint NOT NULL,
	"current_balance_kopecks" bigint NOT NULL,
	"minimum_payment_kopecks" bigint,
	"due_date" date,
	"interest_rate_percent" integer,
	"schedule" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" "debt_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_debt_original_positive" CHECK ("debts"."original_amount_kopecks" > 0),
	CONSTRAINT "chk_debt_balance_valid" CHECK ("debts"."current_balance_kopecks" >= 0 AND "debts"."current_balance_kopecks" <= "debts"."original_amount_kopecks"),
	CONSTRAINT "chk_debt_minimum_valid" CHECK ("debts"."minimum_payment_kopecks" IS NULL OR "debts"."minimum_payment_kopecks" >= 0)
);
--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_expense_id_expense_entries_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_debt_payments_debt_date" ON "debt_payments" USING btree ("debt_id","paid_at");--> statement-breakpoint
CREATE INDEX "idx_debt_payments_user_date" ON "debt_payments" USING btree ("user_id","paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_debt_payments_user_idempotency" ON "debt_payments" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_debts_user_status" ON "debts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_debts_user_priority" ON "debts" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "idx_debts_user_due_date" ON "debts" USING btree ("user_id","due_date");