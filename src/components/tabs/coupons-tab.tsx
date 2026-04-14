import { useState } from "react"
import { db } from "@/lib/firebase"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Calendar, Users, Ticket, Activity, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { deleteCoupon } from "@/lib/firebase-services"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CouponsTabProps {
    coupons: any[]
    loading: boolean
    hasMore: boolean
    onFetchMore: () => void
    onRefresh: () => void
    userUid: string
}

export function CouponsTab({ coupons, loading, hasMore, onFetchMore, onRefresh, userUid }: CouponsTabProps) {
    const { toast } = useToast()
    const [form, setForm] = useState({ code: '', days: '30', maxUses: '100' })
    const [isCreating, setIsCreating] = useState(false)

    const [couponToDelete, setCouponToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleCreate = async () => {
        if (!form.code.trim()) {
            toast({ variant: "destructive", title: "CÓDIGO OBRIGATÓRIO" })
            return
        }
        setIsCreating(true)
        try {
            const code = form.code.toUpperCase().trim()
            await setDoc(doc(db, "coupons", code), {
                code,
                days: Number(form.days),
                maxUses: Number(form.maxUses),
                usedCount: 0, // CORRIGIDO: de currentUses para usedCount
                usedBy: [],
                active: true,
                createdAt: serverTimestamp(),
                createdBy: userUid
            })
            toast({ title: "CUPOM ATIVADO", description: `Código ${code} gerado com sucesso.` })
            setForm({ code: '', days: '30', maxUses: '100' })
            onRefresh()
        } catch (e) {
            toast({ variant: "destructive", title: "ERRO AO CRIAR" })
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!couponToDelete) return
        setIsDeleting(true)
        try {
            await deleteCoupon(couponToDelete)
            toast({ title: "CUPOM REMOVIDO" })
            onRefresh()
        } catch (e) {
            toast({ variant: "destructive", title: "ERRO AO DELETAR" })
        } finally {
            setIsDeleting(false)
            setCouponToDelete(null)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Formulário de Criação */}
            <Card className="bg-white/[0.03] border-white/10 text-white h-fit sticky top-24">
                <CardHeader className="bg-white/5 border-b border-white/5 p-4">
                    <CardTitle className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <Plus size={14} className="stroke-[3px]" /> Criar Promoção
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
                            <Ticket size={12} className="text-primary" /> Identificador do Cupom
                        </label>
                        <Input
                            placeholder="EX: BEMVINDO2026"
                            value={form.code}
                            onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                            className="bg-white/5 border-white/10 font-black uppercase h-12 rounded-xl focus:border-primary/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
                                <Calendar size={12} className="text-primary" /> Dias PRO
                            </label>
                            <Input
                                type="number"
                                placeholder="30"
                                value={form.days}
                                onChange={e => setForm({...form, days: e.target.value})}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                            />
                            <p className="text-[8px] text-white/20 font-bold uppercase tracking-tighter">Tempo de acesso</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
                                <Users size={12} className="text-primary" /> Limite Usos
                            </label>
                            <Input
                                type="number"
                                placeholder="100"
                                value={form.maxUses}
                                onChange={e => setForm({...form, maxUses: e.target.value})}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                            />
                            <p className="text-[8px] text-white/20 font-bold uppercase tracking-tighter">Máx. resgates</p>
                        </div>
                    </div>

                    <Button
                        className="w-full h-14 bg-primary hover:bg-primary/80 text-black font-black uppercase italic rounded-2xl shadow-[0_0_20px_rgba(234,255,0,0.1)] transition-all"
                        onClick={handleCreate}
                        disabled={isCreating}
                    >
                        {isCreating ? <Loader2 className="animate-spin size-5" /> : "Ativar Campanha"}
                    </Button>
                </CardContent>
            </Card>

            {/* Listagem de Cupons */}
            <div className="lg:col-span-2 space-y-4">
                <Card className="bg-white/[0.03] border-white/10 text-white overflow-hidden">
                    <CardHeader className="bg-white/5 border-b border-white/5 p-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase italic text-white flex items-center gap-2">
                            <Activity size={14} className="text-primary" /> Registro de Atividade
                        </CardTitle>
                    </CardHeader>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-[10px] font-bold uppercase tracking-widest text-left">
                            <thead className="text-white/30 border-b border-white/5 bg-white/5">
                            <tr>
                                <th className="px-6 py-4">Código</th>
                                <th className="px-6 py-4 text-center">Dias PRO</th>
                                <th className="px-6 py-4 text-center">Engajamento</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                            {coupons.map(cp => (
                                <tr key={cp.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-primary font-black italic text-sm tracking-tighter">{cp.code}</span>
                                            <span className="text-[8px] text-white/20 uppercase">Ref: {cp.id.slice(0,8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black italic text-white/80">
                                        +{cp.days} DIAS
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            {/* CORRIGIDO: de cp.currentUses para cp.usedCount */}
                                            <span className="text-white/60">{(cp.usedCount || 0)} / {cp.maxUses}</span>
                                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: `${Math.min(((cp.usedCount || 0) / cp.maxUses) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 font-black italic text-[9px]">
                                                ATIVO
                                            </Badge>
                                            <button
                                                onClick={() => setCouponToDelete(cp.code)}
                                                className="p-2 hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all rounded-lg outline-none"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                {hasMore && (
                    <Button
                        variant="ghost"
                        className="w-full h-12 text-white/20 hover:text-primary hover:bg-primary/5 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                        onClick={onFetchMore}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin size-4" /> : "Carregar mais registros"}
                    </Button>
                )}
            </div>

            {/* AlertDialog */}
            <AlertDialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
                <AlertDialogContent className="bg-[#1a1a1e] border-white/10 text-white rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black italic uppercase">Eliminar Cupom?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            Esta ação removerá o código <span className="text-primary">{couponToDelete}</span> permanentemente da base de dados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex gap-3">
                        <AlertDialogCancel className="flex-1 bg-white/5 border-none text-white font-black uppercase italic text-[10px] h-12 rounded-xl hover:bg-white/10 transition-colors">
                            Abortar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="flex-1 bg-red-600 text-white font-black uppercase italic text-[10px] h-12 rounded-xl hover:bg-red-700 transition-colors border-none"
                        >
                            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Confirmar Exclusão"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}