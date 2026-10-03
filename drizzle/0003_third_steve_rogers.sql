CREATE TYPE "public"."occurrence_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."protection_level" AS ENUM('HARD', 'NEGOTIABLE', 'FLEXIBLE');--> statement-breakpoint
CREATE TYPE "public"."recurrence_type" AS ENUM('ONE_TIME', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "payment_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"amount_kopecks" bigint NOT NULL,
	"due_date" date NOT NULL,
	"status" "occurrence_status" DEFAULT 'PENDING' NOT NULL,
	"protection_level" "protection_level" NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recurring_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"amount_kopecks" bigint NOT NULL,
	"recurrence_type" "recurrence_type" NOT NULL,
	"recurrence_config" jsonb,
	"protection_level" "protection_level" DEFAULT 'FLEXIBLE' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payment_occurrences" ADD CONSTRAINT "payment_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_occurrences" ADD CONSTRAINT "payment_occurrences_obligation_id_recurring_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."recurring_obligations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_obligations" ADD CONSTRAINT "recurring_obligations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_occurrence_obligation_date" ON "payment_occurrences" USING btree ("obligation_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_occurrences_user_status" ON "payment_occurrences" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_occurrences_user_date" ON "payment_occurrences" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_occurrences_user_status_date" ON "payment_occurrences" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "idx_obligations_user_active" ON "recurring_obligations" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_obligations_user_start" ON "recurring_obligations" USING btree ("user_id","start_date");
