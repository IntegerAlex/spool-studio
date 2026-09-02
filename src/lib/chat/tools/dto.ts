/**
 * Minimal DTOs for the subset of fields chat tools read from existing API
 * route responses. Tools intentionally do NOT import repository/service types —
 * the HTTP API is the contract, and these narrow projections are parsed at the
 * tool boundary.
 */

export interface AssetDto {
  id?: string
  title?: string | null
  status?: string | null
  type?: string | null
  clientId?: string | null
  updatedAt?: string | null
}

export interface AssetListEnvelope {
  data?: AssetDto[]
}

export interface ClientDto {
  id?: string
  name?: string | null
  email?: string | null
}

export interface ClientListEnvelope {
  data?: ClientDto[]
}

export interface DashboardSummaryDto {
  assets?: number
  clients?: number
  pendingApprovals?: number
}
