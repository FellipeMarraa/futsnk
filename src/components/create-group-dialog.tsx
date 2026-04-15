import {useEffect, useState} from "react"
import {useAuth} from "@/contexts/auth-context"
import {createGroupFull, updateGroup} from "@/lib/firebase-services.ts"
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {CircleDollarSign, Crown, Loader2, MapPin, Trophy, Users, Wallet, Lock, Zap} from "lucide-react"
import {useToast} from "@/hooks/use-toast"

interface CreateGroupDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    groupToEdit?: any
}

const DAYS_OF_WEEK = [
    { label: "Domingo", value: "0" },
    { label: "Segunda-feira", value: "1" },
    { label: "Terça-feira", value: "2" },
    { label: "Quarta-feira", value: "3" },
    { label: "Quinta-feira", value: "4" },
    { label: "Sexta-feira", value: "5" },
    { label: "Sábado", value: "6" },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ["00", "15", "30", "45"];

export function CreateGroupDialog({ isOpen, onClose, onSuccess, groupToEdit }: CreateGroupDialogProps) {
    const { user, isPro, isSuperAdmin } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const [name, setName] = useState("")
    const [day, setDay] = useState("6")
    const [hour, setHour] = useState("10")
    const [minute, setMinute] = useState("00")
    const [location, setLocation] = useState("")
    const [maxPlayers, setMaxPlayers] = useState("20") // Padrão agora é 20
    const [courtValue, setCourtValue] = useState("")
    const [balance, setBalance] = useState("")

    useEffect(() => {
        if (groupToEdit && isOpen) {
            setName(groupToEdit.name || "")
            setDay(groupToEdit.day || "6")
            const [h, m] = (groupToEdit.time || "10:00").split(":")
            setHour(h || "10")
            setMinute(m || "00")
            setLocation(groupToEdit.location || "")
            setMaxPlayers(String(groupToEdit.maxPlayers || "20"))
            setCourtValue(groupToEdit.courtValue !== undefined ? String(groupToEdit.courtValue) : "")
            setBalance(groupToEdit.balance !== undefined ? String(groupToEdit.balance) : "")
        } else if (!groupToEdit && isOpen) {
            setName("")
            setDay("6")
            setHour("10")
            setMinute("00")
            setLocation("")
            setMaxPlayers("20")
            setCourtValue("")
            setBalance("")
        }
    }, [groupToEdit, isOpen])

    const handleAction = async () => {
        if (!name.trim() || !user) {
            toast({ variant: "destructive", title: "NOME OBRIGATÓRIO" })
            return
        }

        const playersCount = Number(maxPlayers);

        if (!isPro && !isSuperAdmin && playersCount > 20) {
            toast({
                variant: "destructive",
                title: "LIMITE EXCEDIDO",
                description: "Clubes FREE suportam até 20 atletas. Assine o PRO para ilimitado."
            })
            return
        }

        setLoading(true)
        try {
            const finalTime = `${hour}:${minute}`

            if (groupToEdit) {
                // Lógica de Edição
                const editPayload = {
                    name,
                    day,
                    time: finalTime,
                    location,
                    maxPlayers: playersCount,
                    courtValue: courtValue === "" ? 0 : Number(courtValue),
                    balance: balance === "" ? 0 : Number(balance),
                }
                await updateGroup(groupToEdit.id, editPayload)
                toast({ title: "DADOS ATUALIZADOS" })
            } else {
                // Lógica de Criação - Passando exatamente o que o serviço espera
                await createGroupFull({
                    name,
                    day,
                    time: finalTime,
                    location,
                    maxPlayers: playersCount,
                    courtValue: courtValue === "" ? 0 : Number(courtValue),
                    balance: balance === "" ? 0 : Number(balance),
                    userId: user.uid,
                    userEmail: user.email!,
                    isPro: isPro || isSuperAdmin // Passando a info de status pro
                })
                toast({ title: "CLUBE FUNDADO" })
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error("Erro ao salvar clube:", error)
            toast({ variant: "destructive", title: "ERRO DE SERVIDOR" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[92%] max-w-[400px] bg-[#1a1a1e] border border-white/5 rounded-[2rem] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">

                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-lg font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
                                <Trophy className="size-4 text-primary" />
                                {groupToEdit ? "Editar Clube" : "Novo Clube"}
                            </DialogTitle>
                            <DialogDescription className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em]">
                                Configurações da Temporada
                            </DialogDescription>
                        </div>
                        {(isPro || isSuperAdmin) && !groupToEdit && (
                            <div className="bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Crown className="size-3 text-primary" />
                                <span className="text-[8px] font-black text-primary uppercase">PRO</span>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-white/40 ml-1">Nome do Clube</Label>
                        <Input
                            className="bg-white/[0.03] border-white/10 rounded-xl h-11 text-sm font-bold text-white focus:border-primary/40 focus:ring-0"
                            placeholder="Ex: Racha dos Amigos"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-white/40 ml-1">Localização</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-primary opacity-30" />
                            <Input
                                className="bg-white/[0.03] border-white/10 rounded-xl h-11 pl-10 text-sm font-bold text-white focus:border-primary/40 focus:ring-0"
                                placeholder="Ex: Arena Soccer Club"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-white/40 ml-1">Dia</Label>
                            <Select value={day} onValueChange={setDay}>
                                <SelectTrigger className="bg-white/[0.03] w-full border-white/10 rounded-xl h-11 text-xs font-bold uppercase italic text-white/80 focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" className="bg-[#1a1a1e] border-white/10 text-white rounded-xl min-w-[var(--radix-select-trigger-width)]">
                                    {DAYS_OF_WEEK.map((d) => (
                                        <SelectItem key={d.value} value={d.value} className="text-xs font-bold uppercase italic focus:bg-primary focus:text-black">
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-white/40 ml-1">Horário</Label>
                            <div className="flex items-center gap-1">
                                <Select value={hour} onValueChange={setHour}>
                                    <SelectTrigger className="bg-white/[0.03] border-white/10 rounded-xl h-11 text-xs font-bold text-white flex-1 focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="bg-[#1a1a1e] border-white/10 text-white h-48 min-w-[80px]">
                                        {HOURS.map(h => <SelectItem key={h} value={h} className="text-xs font-bold">{h}h</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <span className="text-primary font-black opacity-50">:</span>
                                <Select value={minute} onValueChange={setMinute}>
                                    <SelectTrigger className="bg-white/[0.03] border-white/10 rounded-xl h-11 text-xs font-bold text-white flex-1 focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="bg-[#1a1a1e] border-white/10 text-white min-w-[80px]">
                                        {MINUTES.map(m => <SelectItem key={m} value={m} className="text-xs font-bold">{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-white/40 ml-1">Valor Quadra</Label>
                            <div className="relative">
                                <CircleDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-primary opacity-30" />
                                <Input
                                    type="number"
                                    className="bg-white/[0.03] border-white/10 rounded-xl h-11 pl-10 text-sm font-bold text-white focus:border-primary/40 focus:ring-0"
                                    placeholder="0.00"
                                    value={courtValue}
                                    onChange={(e) => setCourtValue(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-white/40 ml-1">Caixa Atual</Label>
                            <div className="relative">
                                <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-emerald-500 opacity-30" />
                                <Input
                                    type="number"
                                    className="bg-white/[0.03] border-white/10 rounded-xl h-11 pl-10 text-sm font-bold text-white focus:border-emerald-500/40 focus:ring-0"
                                    placeholder="0.00"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <Label className="text-[9px] font-black uppercase text-white/40">Limite de Atletas</Label>
                            {!isPro && !isSuperAdmin && (
                                <span className="text-[7px] font-black text-primary uppercase flex items-center gap-1">
                                    <Lock size={8} /> Máx 20 (FREE)
                                </span>
                            )}
                            {(isPro || isSuperAdmin) && (
                                <span className="text-[7px] font-black text-emerald-400 uppercase flex items-center gap-1">
                                    <Zap size={8} className="fill-emerald-400" /> ILIMITADO (PRO)
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-primary opacity-30" />
                            <Input
                                type="number"
                                className={`bg-white/[0.03] border-white/10 rounded-xl h-11 pl-10 text-sm font-bold text-white focus:border-primary/40 focus:ring-0 ${!isPro && !isSuperAdmin && Number(maxPlayers) > 20 ? 'border-red-500/50' : ''}`}
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="text-[9px] font-black uppercase italic tracking-[0.2em] text-white/20 hover:text-white/60 transition-colors"
                    >
                        CANCELAR
                    </button>

                    <Button
                        onClick={handleAction}
                        disabled={loading}
                        className="h-10 px-8 rounded-full bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase italic tracking-wider transition-all shadow-lg shadow-primary/10"
                    >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : "CONFIRMAR"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}