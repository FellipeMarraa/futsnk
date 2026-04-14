import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Copy, ExternalLink, Loader2, Search, Zap, Users, Calendar } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

interface GroupsTabProps {
    groups: any[]
    loading: boolean
    hasMore: boolean
    onFetchMore: () => void
}

export function GroupsTab({ groups, loading, hasMore, onFetchMore }: GroupsTabProps) {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [search, setSearch] = useState("")
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id)
        setCopiedId(id)

        toast({
            title: "ID COPIADO",
            description: "O ID do grupo foi copiado para a área de transferência."
        })

        setTimeout(() => setCopiedId(null), 2000)
    }

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.id.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col items-center space-y-8 animate-in fade-in duration-500 w-full max-w-4xl mx-auto">

            {/* Barra de Busca Centralizada */}
            <div className="relative w-full max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                <Input
                    placeholder="Buscar clube por nome ou ID..."
                    className="bg-white/5 border-white/10 pl-12 h-12 rounded-2xl text-white outline-none focus:ring-1 focus:ring-primary/50 w-full"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Lista de Cards Estilo Timeline/Lista Administrativa */}
            <div className="flex flex-col gap-4 w-full px-2">
                {filteredGroups.map(group => (
                    <Card
                        key={group.id}
                        className="bg-white/[0.03] border-white/10 text-white hover:border-primary/50 transition-all overflow-hidden relative group w-full"
                    >
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                {/* Info Principal do Clube */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <Users className="size-6 text-primary/60" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black italic uppercase text-base truncate text-white tracking-tighter">
                                                {group.name}
                                            </h3>
                                            {group.isPro && <Zap className="size-3 text-primary fill-primary animate-pulse" />}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} className="text-primary/40" /> {group.membersEmails?.length || 0} Atletas
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} className="text-primary/40" /> {group.createdAt?.toDate().toLocaleDateString() || 'Data N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Seção Técnica (ID e Ações) */}
                                <div className="flex items-center gap-3 sm:border-l sm:border-white/5 sm:pl-6">
                                    <div className="flex flex-col items-end mr-2">
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Reference ID</span>
                                        <code className="text-[10px] font-mono text-primary/70 bg-primary/5 px-2 py-1 rounded border border-primary/10">
                                            {group.id}
                                        </code>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCopyId(group.id)}
                                            className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-primary"
                                            title="Copiar ID"
                                        >
                                            {copiedId === group.id ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                                        </button>

                                        <Button
                                            onClick={() => navigate(`/groups/${group.id}`)}
                                            className="h-10 bg-primary text-black font-black uppercase italic text-[10px] px-4 rounded-xl shadow-lg hover:bg-primary/90"
                                        >
                                            Inspecionar <ExternalLink className="ml-2 size-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredGroups.length === 0 && !loading && (
                    <div className="w-full py-20 text-center opacity-20 italic uppercase font-black tracking-widest text-xs border-2 border-dashed border-white/5 rounded-3xl">
                        Nenhum clube encontrado na base
                    </div>
                )}
            </div>

            {/* Paginação */}
            {hasMore && (
                <div className="flex justify-center pt-4 w-full pb-10">
                    <Button
                        variant="outline"
                        onClick={onFetchMore}
                        disabled={loading}
                        className="border-white/10 text-white font-black uppercase italic text-[10px] px-12 h-12 rounded-2xl hover:bg-primary hover:text-black transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                        {loading ? "Sincronizando..." : "Carregar Próximos Clubes"}
                    </Button>
                </div>
            )}
        </div>
    )
}