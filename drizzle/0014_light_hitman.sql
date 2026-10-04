CREATE TYPE "public"."import_status" AS ENUM('PENDING', 'MATCHED', 'REVIEW', 'CONFIRMED', 'REJECTED', 'DUPLICATE');--> statement-breakpoint
CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_name" varchar(128) NOT NULL,
	"bank_name" varchar(256),
	"account_number_masked" varchar(64),
	"connection_config" jsonb,
	"last_sync_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid,
	"external_id" varchar(256),
	"amount_kopecks" bigint NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text,
	"category_hint" varchar(128),
	"matched_income_id" uuid,
	"matched_expense_id" uuid,
	"import_status" "import_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matched_income_id_income_entries_id_fk" FOREIGN KEY ("matched_income_id") REFERENCES "public"."income_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matched_expense_id_expense_entries_id_fk" FOREIGN KEY ("matched_expense_id") REFERENCES "public"."expense_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bank_connections_user_active" ON "bank_connections" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bank_connections_user_provider" ON "bank_connections" USING btree ("user_id","provider_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bank_transactions_connection_external" ON "bank_transactions" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_bank_transactions_user_status" ON "bank_transactions" USING btree ("user_id","import_status");--> statement-breakpoint
CREATE INDEX "idx_bank_transactions_user_date" ON "bank_transactions" USING btree ("user_id","transaction_date");