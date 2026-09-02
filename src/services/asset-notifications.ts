import { sendDesignerNotification } from "@/lib/notifications/mailgun"
import { getAssetById } from "@/repositories/assets-repository"
import { getClientById } from "@/repositories/clients-repository"
import { getUserById } from "@/repositories/users-repository"

export interface NotifyDesignerChangeParams {
  assetId: string
  notificationType: "revision_requested" | "comment_added"
  commentMessage: string | null
  triggeredByUserId: string
}

/**
 * Looks up the assigned designer for an asset and emails them about a change
 * (rejection or new comment). Never notifies the triggering user themselves,
 * and never throws — notification failures are non-blocking.
 */
export async function notifyDesignerOfChange(
  params: NotifyDesignerChangeParams,
): Promise<void> {
  const { assetId, notificationType, commentMessage, triggeredByUserId } =
    params

  try {
    const asset = await getAssetById(assetId)
    if (!asset?.assigned_to) {
      return
    }

    const designer = await getUserById(asset.assigned_to)
    if (!designer?.email || triggeredByUserId === designer.id) {
      return
    }

    let clientName = "Unknown Client"
    if (asset.client_id) {
      const client = await getClientById(asset.client_id)
      if (client) {
        clientName = client.name
      }
    }

    const requester = await getUserById(triggeredByUserId)

    void sendDesignerNotification({
      notificationType,
      assetId: asset.id,
      assetTitle: asset.title,
      assetType: asset.type,
      clientId: asset.client_id,
      clientName,
      commentMessage,
      designerId: designer.id,
      designerEmail: designer.email,
      designerName: designer.full_name || null,
      requestedBy: {
        email: requester?.email || "unknown",
        name: requester?.full_name || null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(
      `[asset-notifications] Failed to send designer notification (${notificationType})`,
      err,
    )
  }
}
