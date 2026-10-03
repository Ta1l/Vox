CREATE TABLE "expense_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_kopecks" bigint NOT NULL,
	"category" varchar(128) NOT NULL,
	"title" varchar(256) NOT NULL,
	"comment" text,
	"expense_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expense_user_date" ON "expense_entries" USING btree ("user_id","expense_date");--> statement-breakpoint
CREATE INDEX "idx_expense_user_category" ON "expense_entries" USING btree ("user_id","category");