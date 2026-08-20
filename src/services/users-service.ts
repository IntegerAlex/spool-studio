import { getCurrentUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getUserById,
  insertUser,
  listUsers,
  listUsersByIds,
} from "@/repositories/users-repository"
import type { User } from "@/types/index"

function mapUser(user: Awaited<ReturnType<typeof getUserById>>): User | null {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.full_name ?? user.email,
    role: user.role,
    avatar: user.avatar_url ?? undefined,
    createdAt: new Date(user.created_at),
  }
}

export async function getCurrentUserProfile(): Promise<User | null> {
  try {
    return await getOrCreateCurrentUserProfile()
  } catch (error) {
    logProductionRuntimeError("current-user-profile", error)
    return null
  }
}

export async function getOrCreateCurrentUserProfile(): Promise<User> {
  const authUser = await getCurrentUser()
  if (!authUser) {
    throw new Error("Unauthorized")
  }

  const existing = await getUserById(authUser.id)
  if (existing) {
    const mapped = mapUser(existing)
    if (!mapped) {
      throw new Error("Failed to map user profile")
    }
    return mapped
  }

  if (!authUser.email) {
    throw new Error("Authenticated user is missing email")
  }

  const fullName = authUser.name ?? authUser.email

  const inserted = await insertUser({
    id: authUser.id,
    email: authUser.email,
    full_name: fullName,
    avatar_url: authUser.avatarUrl ?? null,
  })

  const mapped = mapUser(inserted)
  if (!mapped) {
    throw new Error("Failed to map user profile")
  }

  return mapped
}

export async function getUsers(): Promise<User[]> {
  try {
    const rows = await listUsers()
    return rows
      .map((user) => mapUser(user))
      .filter((user): user is User => Boolean(user))
  } catch (error) {
    logProductionRuntimeError("users-loader", error)
    return []
  }
}

export async function getUserDetail(userId: string): Promise<User | null> {
  try {
    const row = await getUserById(userId)
    return mapUser(row)
  } catch (error) {
    logProductionRuntimeError("user-detail-loader", error, { userId })
    return null
  }
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  try {
    const rows = await listUsersByIds(userIds)
    return rows
      .map((user) => mapUser(user))
      .filter((user): user is User => Boolean(user))
  } catch (error) {
    logProductionRuntimeError("users-by-ids-loader", error, {
      count: userIds.length,
    })
    return []
  }
}
