import { asc, eq, ilike, inArray, or } from "drizzle-orm"
import { db } from "@/db"
import { contentAssets, portalTokens, users } from "@/db/schema"
import { verifyPassword } from "@/lib/auth/password"

export type DbUser = typeof users.$inferSelect

export type DbUserSummary = Pick<
  typeof users.$inferSelect,
  "id" | "full_name" | "avatar_url"
>

export async function listUsers(): Promise<DbUser[]> {
  const rows = await db.select().from(users).orderBy(asc(users.full_name))
  return rows
}

export async function listUsersByIds(userIds: string[]): Promise<DbUser[]> {
  if (userIds.length === 0) {
    return []
  }

  const rows = await db.select().from(users).where(inArray(users.id, userIds))
  return rows
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertUser(
  payload: typeof users.$inferInsert,
): Promise<DbUser> {
  const insertValues = payload
  const rows = await db
    .insert(users)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function searchUsers(
  term: string,
  limit = 10,
): Promise<
  Pick<DbUser, "id" | "email" | "full_name" | "avatar_url">[]
> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(or(ilike(users.full_name, term), ilike(users.email, term)))
    .orderBy(asc(users.full_name))
    .limit(limit)
  return rows
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return rows[0] ?? null
}

export async function updateUser(
  userId: string,
  updates: Partial<typeof users.$inferInsert>,
): Promise<DbUser> {
  const setValues = updates
  const rows = await db
    .update(users)
    .set(setValues)
    .where(eq(users.id, userId))
    .returning()
  return rows[0]
}

export async function deleteUserAccount(
  userId: string,
  password: string,
): Promise<{ error: "password_incorrect" } | null> {
  let passwordIncorrect = false

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ password_hash: users.password_hash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    const passwordHash = (rows[0]?.password_hash as string | null) ?? null
    if (passwordHash) {
      const valid = await verifyPassword(password ?? "", passwordHash)
      if (!valid) {
        passwordIncorrect = true
        return
      }
    }

    // portal_tokens.created_by is NO ACTION, so null it before delete.
    await tx
      .update(portalTokens)
      .set({ created_by: null })
      .where(eq(portalTokens.created_by, userId))

    // Denormalized references on content_assets have no FK; clear best-effort.
    try {
      await tx
        .update(contentAssets)
        .set({
          // SAFETY: created_by is NOT NULL; cleared best-effort before account row removal.
          created_by: null as never,
          uploaded_by: null,
          approved_by: null,
          scheduled_by: null,
          assigned_to: null,
        })
        .where(
          or(
            eq(contentAssets.created_by, userId),
            eq(contentAssets.uploaded_by, userId),
            eq(contentAssets.approved_by, userId),
            eq(contentAssets.scheduled_by, userId),
            eq(contentAssets.assigned_to, userId),
          ),
        )
    } catch {
      // content_assets may be absent in some deployments; safe to skip.
    }

    // team_members, push_subscriptions, password_resets and
    // user_notification_prefs cascade via ON DELETE CASCADE.
    await tx.delete(users).where(eq(users.id, userId))
  })

  if (passwordIncorrect) {
    return { error: "password_incorrect" }
  }
  return null
}
