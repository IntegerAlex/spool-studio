import "dotenv/config"
import { and, isNotNull, like, or, sql } from "drizzle-orm"
import { db } from "../src/db"
import { assetRevisions, contentAssets } from "../src/db/schema"

const DEAD_PATTERNS = ["%localhost:4567%", "%r2.cloudflarestorage.com%"]

async function main() {
  const assets = await db
    .update(contentAssets)
    .set({ drive_file_url: null, thumbnail_url: null })
    .where(
      and(
        isNotNull(contentAssets.drive_file_id),
        or(
          ...DEAD_PATTERNS.flatMap((p) => [
            like(contentAssets.drive_file_url, p),
            like(contentAssets.thumbnail_url, p),
          ]),
        ),
      ),
    )
    .returning({ id: contentAssets.id })

  const revisions = await db
    .update(assetRevisions)
    .set({ drive_file_url: null })
    .where(
      and(
        isNotNull(assetRevisions.drive_file_id),
        or(...DEAD_PATTERNS.map((p) => like(assetRevisions.drive_file_url, p))),
      ),
    )
    .returning({ id: assetRevisions.id })

  console.log(
    `[cleanup] nulled stale URLs: ${assets.length} assets, ${revisions.length} revisions`,
  )
  await db.execute(sql`select 1`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[cleanup] failed", err)
    process.exit(1)
  })
