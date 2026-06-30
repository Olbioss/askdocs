ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE "documents"
ALTER COLUMN "user_id"
SET DEFAULT auth.uid ();

--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");

--> statement-breakpoint
CREATE POLICY "chunks_select_own" ON "chunks" AS PERMISSIVE FOR
SELECT
    TO "authenticated" USING (
        exists (
            select
                1
            from
                "documents" d
            where
                d.id = "chunks"."document_id"
                and d.user_id = (
                    select
                        auth.uid ()
                )
        )
    );

--> statement-breakpoint
CREATE POLICY "chunks_insert_own" ON "chunks" AS PERMISSIVE FOR INSERT TO "authenticated"
WITH
    CHECK (
        exists (
            select
                1
            from
                "documents" d
            where
                d.id = "chunks"."document_id"
                and d.user_id = (
                    select
                        auth.uid ()
                )
        )
    );

--> statement-breakpoint
CREATE POLICY "chunks_update_own" ON "chunks" AS PERMISSIVE FOR
UPDATE TO "authenticated" USING (
    exists (
        select
            1
        from
            "documents" d
        where
            d.id = "chunks"."document_id"
            and d.user_id = (
                select
                    auth.uid ()
            )
    )
)
WITH
    CHECK (
        exists (
            select
                1
            from
                "documents" d
            where
                d.id = "chunks"."document_id"
                and d.user_id = (
                    select
                        auth.uid ()
                )
        )
    );

--> statement-breakpoint
CREATE POLICY "chunks_delete_own" ON "chunks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
    exists (
        select
            1
        from
            "documents" d
        where
            d.id = "chunks"."document_id"
            and d.user_id = (
                select
                    auth.uid ()
            )
    )
);

--> statement-breakpoint
CREATE POLICY "documents_select_own" ON "documents" AS PERMISSIVE FOR
SELECT
    TO "authenticated" USING (
        (
            select
                auth.uid ()
        ) = "documents"."user_id"
    );

--> statement-breakpoint
CREATE POLICY "documents_insert_own" ON "documents" AS PERMISSIVE FOR INSERT TO "authenticated"
WITH
    CHECK (
        (
            select
                auth.uid ()
        ) = "documents"."user_id"
    );

--> statement-breakpoint
CREATE POLICY "documents_update_own" ON "documents" AS PERMISSIVE FOR
UPDATE TO "authenticated" USING (
    (
        select
            auth.uid ()
    ) = "documents"."user_id"
)
WITH
    CHECK (
        (
            select
                auth.uid ()
        ) = "documents"."user_id"
    );

--> statement-breakpoint
CREATE POLICY "documents_delete_own" ON "documents" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
    (
        select
            auth.uid ()
    ) = "documents"."user_id"
);