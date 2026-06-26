"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"


export default function ServiceTypesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/service-types")
    if (res.ok) setTypes(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminare il tipo di servizio "${name}"?`)) return
    const res = await fetch(`/api/admin/service-types/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Eliminato" })
      load()
    } else {
      const d = await res.json()
      toast({ title: "Errore", description: d.error, variant: "destructive" })
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/service-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    if (res.ok) load()
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Tipi di Servizio"
        description="Catalogo dei servizi di sicurezza erogabili"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/service-types/new">
              <Plus className="mr-1 h-4 w-4" />
              Nuovo Servizio
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Scan Types abilitati</TableHead>
                <TableHead>Contratti</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Caricamento...
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nessun tipo di servizio. Creane uno con il pulsante in alto.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">
                      <div>{st.name}</div>
                      {st.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-48">{st.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{st.slug}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(st.scanTypeDefs ?? []).map((d: any) => (
                          <Badge key={d.id} variant="secondary" className="text-xs">
                            {d.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{st._count?.contracts ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{st._count?.assessments ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(st.id, st.isActive)}>
                        <Badge variant={st.isActive ? "success" : "secondary"}>
                          {st.isActive ? "Attivo" : "Disattivo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/admin/service-types/${st.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(st.id, st.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
