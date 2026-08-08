/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  // Salida autocontenida (.next/standalone) para una imagen Docker mínima.
  output: 'standalone',

  // Don't advertise the framework/version (fingerprinting). DAST finding.
  poweredByHeader: false,

  // react-simple-maps (y sus deps d3-*) se distribuyen como ESM; transpilarlos
  // evita el error "Cannot use import statement outside a module" en SSR.
  transpilePackages: ['react-simple-maps'],

  // Baseline security headers (were entirely absent — DAST finding).
  // NOTE: a strict Content-Security-Policy is intentionally NOT set here yet:
  // it requires allow-listing Google Maps / Firebase / amCharts / image hosts
  // and must be validated in a browser before enforcing (otherwise it breaks
  // the app). Track CSP as a dedicated follow-up.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },

  // Verificación de tipos REACTIVADA: `npm run typecheck` pasa con 0 errores
  // (tras la migración a genkit 1.x y la corrección de los errores latentes que
  // este flag ocultaba). El build ahora falla si se introduce un error de tipos.
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint sigue ignorado durante el build SOLO porque el proyecto aún no tiene
  // configuración de ESLint y `next lint` entraría en modo interactivo. Paso
  // pendiente: añadir config de ESLint, ejecutar `npm run lint`, corregir y
  // poner esto en `false`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Server-only packages must NOT be bundled by webpack: they are loaded at
  // runtime on the server. This also avoids an ESM re-export bundling bug in
  // @genkit-ai/google-genai (TaskTypeSchema) under Next 14's webpack.
  experimental: {
    serverComponentsExternalPackages: [
      'genkit',
      '@genkit-ai/google-genai',
      '@genkit-ai/core',
      'firebase-admin',
      '@google-cloud/secret-manager',
      'google-auth-library',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipapi.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
