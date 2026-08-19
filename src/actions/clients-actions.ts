"use server"

import type { ClientInput } from "@/services/clients-service"
import {
  createClient,
  getClientDetail,
  getClients,
  removeClient,
  updateClient,
} from "@/services/clients-service"
import type { Client } from "@/types/index"

export async function listClientsAction(): Promise<Client[]> {
  return getClients()
}

export async function getClientAction(
  clientId: string,
): Promise<Client | null> {
  return getClientDetail(clientId)
}

export async function createClientAction(input: ClientInput): Promise<Client> {
  return createClient(input)
}

export async function updateClientAction(
  clientId: string,
  input: Partial<ClientInput>,
): Promise<Client> {
  return updateClient(clientId, input)
}

export async function deleteClientAction(clientId: string): Promise<void> {
  return removeClient(clientId)
}
