CREATE TABLE "poll_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "poll_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pollId" integer NOT NULL,
	"option" varchar(255) NOT NULL,
	"displayOrder" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_polls_id_fk" FOREIGN KEY ("pollId") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;