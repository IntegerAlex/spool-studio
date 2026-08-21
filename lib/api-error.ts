import { NextResponse } from "next/server"

export interface ApiIssue {
  path: string
  message: string
}

export class ApiError extends Error {
  status: number
  issues?: ApiIssue[]

  constructor(
    message: string,
    status: number,
    issues?: ApiIssue[],
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.issues = issues
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401)
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(message, 403)
  }

  static badRequest(message = "Bad request", issues?: ApiIssue[]) {
    return new ApiError(message, 400, issues)
  }

  static notFound(message = "Not found") {
    return new ApiError(message, 404)
  }
}

/**
 * Parse a request body, mapping malformed JSON to a 400 ApiError instead of
 * letting SyntaxError fall into a generic 500 catch.
 */
// oxlint-disable-next-line anti-slop/no-unknown-returns  // generic boundary helper: callers parse via zod
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw ApiError.badRequest("Invalid JSON body")
  }
}

/**
 * Convert any thrown error into a uniform error response.
 * Expected failures throw ApiError (status/message preserved); anything else
 * is sanitized to a generic 500 so internals never leak to clients.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters  // boundary helper: arbitrary throw from route try-blocks
export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body = {
      success: false as const,
      error: error.message,
      issues: error.issues ?? [],
    }
    return NextResponse.json(body, { status: error.status })
  }
  return NextResponse.json(
    { success: false as const, error: "Internal server error" },
    { status: 500 },
  )
}
