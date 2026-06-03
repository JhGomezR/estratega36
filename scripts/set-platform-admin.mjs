/**
 * Designa (o revoca) el SUPER ADMIN del Control Plane mediante el custom claim
 * `platformAdmin`. No hay super admin por defecto: este script crea uno.
 *
 * Requiere credenciales del Firebase Admin SDK (una de las dos):
 *   - GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *   - FIREBASE_SERVICE_ACCOUNT_KEY='{...json...}'
 *
 * Uso:
 *   node scripts/set-platform-admin.mjs correo@dominio.com           # otorgar
 *   node scripts/set-platform-admin.mjs correo@dominio.com --revoke  # revocar
 *
 * El usuario debe EXISTIR en Firebase Auth. Si no existe, créalo primero
 * (consola de Firebase > Authentication > Add user, o tu flujo de alta).
 * Tras ejecutarlo, el usuario debe cerrar sesión y volver a entrar para que
 * el token recoja el nuevo claim.
 */
import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');

if (!email) {
  console.error('Uso: node scripts/set-platform-admin.mjs <email> [--revoke]');
  process.exit(1);
}

if (!getApps().length) {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  initializeApp(saKey ? { credential: cert(JSON.parse(saKey)) } : { credential: applicationDefault() });
}

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, revoke ? null : { platformAdmin: true });
  console.log(`${revoke ? '✗ Revocado' : '✓ Otorgado'} platformAdmin a ${email} (uid: ${user.uid}).`);
  console.log('El usuario debe cerrar sesión y volver a iniciarla para refrescar el token.');
  process.exit(0);
} catch (e) {
  console.error('Error:', e?.message || e);
  process.exit(1);
}
