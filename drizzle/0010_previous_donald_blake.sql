CREATE TYPE "public"."allocation_target_type" AS ENUM('GENERAL', 'DEBT', 'GOAL', 'ENVELOPE', 'OBLIGATION');--> statement-breakpoint
CREATE TYPE "public"."cycle_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" "allocation_target_type" NOT NULL,
	"target_id" uuid,
	"amount_kopecks" bigint NOT NULL,
	"reason" text,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"snapshot_version" varchar(64),
	"idempotency_key" varchar(256),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_budget_allocation_positive" CHECK ("budget_allocations"."amount_kopecks" > 0),
	CONSTRAINT "chk_budget_allocation_target" CHECK (("budget_allocations"."target_type" = 'GENERAL' AND "budget_allocations"."target_id" IS NULL) OR ("budget_allocations"."target_type" <> 'GENERAL' AND "budget_allocations"."target_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "planning_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"opening_balance_kopecks" bigint NOT NULL,
	"expected_income_kopecks" bigint DEFAULT 0 NOT NULL,
	"status" "cycle_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_planning_cycle_expected_nonnegative" CHECK ("planning_cycles"."expected_income_kopecks" >= 0),
	CONSTRAINT "chk_planning_cycle_date_range" CHECK ("planning_cycles"."end_date" > "planning_cycles"."start_date")
);
--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_cycle_id_planning_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."planning_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_cycles" ADD CONSTRAINT "planning_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budget_allocations_cycle" ON "budget_allocations" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "idx_budget_allocations_user_cycle" ON "budget_allocations" USING btree ("user_id","cycle_id");--> statement-breakpoint
CREATE INDEX "idx_budget_allocations_target" ON "budget_allocations" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_budget_allocations_cycle_idempotency" ON "budget_allocations" USING btree ("cycle_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_planning_cycles_user_active" ON "planning_cycles" USING btree ("user_id") WHERE "planning_cycles"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "idx_planning_cycles_user_status" ON "planning_cycles" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_planning_cycles_user_start" ON "planning_cycles" USING btree ("user_id","start_date");
