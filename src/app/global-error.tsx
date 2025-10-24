'use client'

import { Button } from "@/components/ui/button"
import { ServerCrash } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
            <div className="container mx-auto p-4">
                <ServerCrash className="mx-auto h-24 w-24 text-destructive opacity-50" />
                <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    ¡Ups! Algo salió mal
                </h1>
                <p className="mt-6 text-base leading-7 text-muted-foreground">
                    Lo sentimos, ocurrió un error inesperado en la aplicación.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Button onClick={() => reset()}>
                        Intentar de Nuevo
                    </Button>
                     <Button variant="outline" asChild>
                        <a href="/">Volver al Inicio</a>
                    </Button>
                </div>
                 {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 text-left bg-muted p-4 rounded-md">
                        <h3 className="font-semibold">Detalles del Error (Solo Desarrollo):</h3>
                        <pre className="mt-2 text-sm text-muted-foreground overflow-auto">
                            <code>
                                {error.stack || error.toString()}
                            </code>
                        </pre>
                    </div>
                )}
            </div>
        </div>
      </body>
    </html>
  )
}
