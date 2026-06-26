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

const ENGINE_COLORS: Record<string, string> = {
  NMAP:   "bg-blue-100 text-blue-800",
  NUCLEI: "bg-purple-100 text-purple-800",
  MANUAL: "bg-gray-100 text-gray-800",
}

export default function ScanTypeDefsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [defs, setDefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/scan-type-defs")
    if (res.ok) setDefs(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string, usedBy: number) {
    if (usedBy > 0) {
      toast({
        title: "Impossibile eliminare",
        description: `Usato in ${usedBy} tipo/i di servizio. Rimuovilo prima.`,
        variant: "destructive",
      })
      return
    }
    if (!confirm(`Eliminare il tipo di scan "${name}"?`)) return
    const res = await fetch(`/api/admin/scan-type-defs/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Eliminato" })
      load()
    } else {
      const d = await res.json()
      toast({ title: "Errore", description: d.error, variant: "destructive" })
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/scan-type-defs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    if (res.ok) load()
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Tipi di Scan"
        description="Definizioni delle scansioni disponibili nel catalogo"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/scan-type-defs/new">
              <Plus className="mr-1 h-4 w-4" />
              Nuovo Tipo Scan
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
                <TableHead>Engine</TableHead>
                <TableHead>Nei servizi</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Caricamento...
                  </TableCell>
                </TableRow>
              ) : defs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nessun tipo di scan. Creane uno con il pulsante in alto.
                  </TableCell>
                </TableRow>
              ) : (
                defs.map((def) => (
                  <TableRow key={def.id}>
                    <TableCell className="font-medium">
                      <div>{def.name}</div>
                      {def.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-56">{def.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{def.slug}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ENGINE_COLORS[def.engine] ?? "bg-muted text-muted-foreground"}`}>
                        {def.engine}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{def._count?.serviceTypes ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(def.id, def.isActive)}>
                        <Badge variant={def.isActive ? "success" : "secondary"}>
                          {def.isActive ? "Attivo" : "Disattivo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/admin/scan-type-defs/${def.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(def.id, def.name, def._count?.serviceTypes ?? 0)}
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
