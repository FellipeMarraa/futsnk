import {useEffect, useState} from "react"
import {Calendar as CalendarIcon, Crown, Loader2, Plus} from "lucide-react"
import {format} from "date-fns"
import {ptBR} from "date-fns/locale"
import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Calendar} from "@/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {db} from "@/lib/firebase"
import {addDoc, collection, doc, getDoc, serverTimestamp} from "firebase/firestore"
import {useToast} from "@/hooks/use-toast"
import {useAuth} from "@/contexts/auth-context" // Importado para autoridade central

interface MatchManagerProps {
    groupId: string
    onCreated: () => void
    onCancel: () => void
}

export function MatchManager({ groupId, onCreated, onCancel }: MatchManagerProps) {
    const { isSuperAdmin, isPro } = useAuth() // Puxando autoridade do Contexto
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState<Date>()
    const [groupIsPro, setGroupIsPro] = useState(false)

    // Efeito para checar se o grupo é PRO
    useEffect(() => {
        const checkGroupStatus = async () => {
            if (!groupId) return;
            const gDoc = await getDoc(doc(db, "groups", groupId));
            if (gDoc.exists()) {
                setGroupIsPro(gDoc.data().isPro || false);
            }
        };
        checkGroupStatus();
    }, [groupId]);

    const handleCreateMatch = async () => {
        // Trava de segurança: Data é obrigatória
        if (!date) {
            toast({ variant: "destructive", title: "ESCOLHA UMA DATA" });
            return;
        }

        setLoading(true)
        try {
            const matchesRef = collection(db, "groups", groupId, "matches");

            // Usamos UTC para garantir que a data não mude no servidor
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

            await addDoc(matchesRef, {
                date: utcDate.toISOString().split('T')[0], // Apenas yyyy-mm-dd
                status: 'open', // open, drawn, finished
                createdAt: serverTimestamp(),
                confirmedPlayers: [],
                teams: null,
                // A rodada herda as capacidades do clube no momento da criação
                isProMatch: groupIsPro || isPro || isSuperAdmin
            });

            toast({ title: "RODADA AGENDADA", description: "Inscrições abertas no clube." })
            setDate(undefined)
            onCreated();
        } catch (error) {
            console.error(error)
            toast({ variant: "destructive", title: "ERRO DE SERVIDOR" })
        } finally {
            setLoading(false)
        }
    }

    // Se o usuário não for PRO e não for o Overseer, ele só pode agendar rodadas
    // se o grupo permitir (isAdmin local). Mas como as funções de Admin já são
    // tratadas no componente pai (GroupDetail), aqui apenas garantimos a UI.

    return (
        <div className="w-full">
            <div className="space-y-4 py-4">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">
                        Selecione a Data Oficial
                    </p>
                    {(groupIsPro || isPro || isSuperAdmin) && (
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            <Crown className="size-2 text-primary" />
                            <span className="text-[7px] font-black text-primary uppercase">Rodada Elite</span>
                        </div>
                    )}
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full h-12 justify-start text-left font-bold text-sm rounded-xl bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all",
                                !date && "text-white/40",
                                (groupIsPro || isPro || isSuperAdmin) && "border-primary/20"
                            )}
                        >
                            <CalendarIcon className="mr-3 size-4 text-primary opacity-60" />
                            {date ? format(date, "PPP", { locale: ptBR }) : <span className="uppercase italic text-xs tracking-wider">Escolher Dia</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-950 border-white/10 rounded-xl" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            locale={ptBR}
                            className="text-white"
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="mt-8 flex flex-row items-center justify-between gap-4 border-t border-white/5 pt-6">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="text-[10px] font-black uppercase italic tracking-[0.2em] text-white/20 hover:text-white/60 transition-colors disabled:opacity-50"
                >
                    ABORTAR
                </button>

                <Button
                    onClick={handleCreateMatch}
                    disabled={loading || !date}
                    className="h-10 px-8 rounded-lg bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase italic tracking-wider transition-all shadow-lg shadow-primary/5 disabled:bg-zinc-700 disabled:text-white/40"
                >
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <><Plus className="size-3.5 mr-1 stroke-[3px]" /> CONFIRMAR DATA</>
                    )}
                </Button>
            </div>
        </div>
    )
}