'use server'

/**
 * Server Action para CREAR roles en el tenant. Existe (en vez de escribir
 * directo desde el cliente) para poder hacer cumplir el límite de roles del
 * plan en el servidor: las reglas de Firestore no pueden contar documentos, y
 * el Admin SDK las evita, así que este es el punto de control real.
 *
 * Editar/eliminar roles sigue en el cliente (no aumentan el conteo).
 */

import { getCallerContext, assertCan } from '@/firebase/authz'
import { assertWithinRoleLimit } from '@/firebase/plan-limits'

export interface CreateRoleInput {
  name: string
  permissions: string[]
  status: 'activo' | 'inactivo'
}

export async function createRole(
  data: CreateRoleInput,
  idToken: string,
  impersonatedTenantId?: string | null
): Promise<{ id?: string; error?: string }> {
  let ctx
  try {
    ctx = await getCallerContext(idToken, impersonatedTenantId)
    assertCan(ctx, 'role:create')
    await assertWithinRoleLimit(ctx)
  } catch (e: any) {
    return { error: e?.message || 'No autorizado.' }
  }

  try {
    const name = (data.name || '').trim()
    if (name.length < 3) return { error: 'El nombre del rol debe tener al menos 3 caracteres.' }
    if (!Array.isArray(data.permissions) || data.permissions.length === 0) {
      return { error: 'Debes seleccionar al menos un permiso.' }
    }

    const id = name.toLowerCase().replace(/\s+/g, '_')
    const ref = ctx.db.collection('roles').doc(id)
    if ((await ref.get()).exists) {
      return { error: `Ya existe un rol con el identificador "${id}".` }
    }

    await ref.set({
      name,
      permissions: data.permissions,
      status: data.status === 'inactivo' ? 'inactivo' : 'activo',
      trash: false,
    })

    return { id }
  } catch (e: any) {
    return { error: e?.message || 'No se pudo crear el rol.' }
  }
}
