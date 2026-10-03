CREATE TABLE "income_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_kopecks" bigint NOT NULL,
	"status" varchar(32) DEFAULT 'EARNED' NOT NULL,
	"source" varchar(256),
	"description" text,
	"earned_at" timestamp with time zone NOT NULL,
	"expected_at" date,
	"received_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_entries" ADD CONSTRAINT "chk_income_positive" CHECK ("amount_kopecks" > 0);--> statement-breakpoint
ALTER TABLE "income_entries" ADD CONSTRAINT "chk_income_received_at" CHECK ("status" != 'RECEIVED' OR "received_at" IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_income_user_status" ON "income_entries" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_income_user_earned" ON "income_entries" USING btree ("user_id","earned_at");--> statement-breakpoint
CREATE INDEX "idx_income_user_expected" ON "income_entries" USING btree ("user_id","expected_at");--> statement-breakpoint
CREATE INDEX "idx_income_user_received" ON "income_entries" USING btree ("user_id","received_at");