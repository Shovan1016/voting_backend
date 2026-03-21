CREATE INDEX "idx_votes_poll_id" ON "votes" USING btree ("pollId");--> statement-breakpoint
CREATE INDEX "idx_votes_option_id" ON "votes" USING btree ("optionId");