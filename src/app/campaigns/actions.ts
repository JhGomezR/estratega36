'use server'

/**
 * Server Action para CREAR campañas. Igual que con roles, existe para hacer
 * cumplir el límite de campañas del plan en el servidor (las reglas de Firestore
 * no cuentan documentos y el Admin SDK las evita). Editar/archivar siguen en el
 * cliente (no aumentan el conteo de campañas activas).
 */

import { getCallerContext, assertCan } from '@/firebase/authz'
import { assertWithinCampaignLimit } from '@/firebase/plan-limits'
import type { Campaign } from '@/lib/types'

export async function createCampaign(
  data: Omit<Campaign, 'id' | 'progress'>,
  idToken: string,
  impersonatedTenantId?: string | null
): Promise<{ id?: string; error?: string }> {
  let ctx
  try {
    ctx = await getCallerContext(idToken, impersonatedTenantId)
    assertCan(ctx, 'campaign:create')
    await assertWithinCampaignLimit(ctx)
  } catch (e: any) {
    return { error: e?.message || 'No autorizado.' }
  }

  try {
    if (!data?.name || String(data.name).trim().length < 2) {
      return { error: 'El nombre de la campaña es obligatorio.' }
    }
    const ref = await ctx.db.collection('campaigns').add({
      ...data,
      progress: data.status === 'Finalizada' ? 100 : 0,
    })
    return { id: ref.id }
  } catch (e: any) {
    return { error: e?.message || 'No se pudo crear la campaña.' }
  }
}
