'use server'

import { adminDb } from '@/firebase/admin'
import { z } from 'zod'

const signUpFormSchema = z.object({
  companyName: z.string(),
  fullName: z.string(),
  subdomain: z.string(),
  email: z.string().email(),
  password: z.string(),
  plan: z.enum(['basico', 'estratega', '360']),
})

type SignUpFormValues = z.infer<typeof signUpFormSchema>

export async function checkSubdomainAvailability(
  subdomain: string
): Promise<{ exists: boolean }> {
  try {
    if (!subdomain) {
      return { exists: false }
    }
    const existingTenant = await adminDb.collection('tenants').doc(subdomain).get()
    return { exists: existingTenant.exists }
  } catch (error) {
    console.error('Error checking subdomain:', error)
    return { exists: true }
  }
}

/**
 * @deprecated PUBLIC SIGNUP IS DISABLED.
 *
 * Tenant onboarding is now platform-managed exclusively through the Control
 * Plane (`provisionTenant` in `src/app/admin/tenants/actions.ts`), which is
 * guarded by the `platformAdmin` claim and creates a dedicated database per
 * tenant. This endpoint used to allow ANY caller to create tenants/users
 * (a critical privilege-escalation hole) and is intentionally closed.
 */
export async function createTenantAndUser(
  _data: SignUpFormValues
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'El registro público está deshabilitado. El alta de organizaciones se realiza desde la administración de la plataforma.',
  }
}
