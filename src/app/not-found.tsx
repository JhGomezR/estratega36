"use client"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <div className="container mx-auto p-4">
        <SearchX className="mx-auto h-24 w-24 text-primary opacity-50" />
        <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          404 - Página No Encontrada
        </h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">
          Lo sentimos, no pudimos encontrar la página que estás buscando.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild>
            <Link href="/">Volver al Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
             <Link href="#">Contactar Soporte &rarr;</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
