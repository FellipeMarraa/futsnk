import {useEffect, useState} from "react"
import {CheckCircle2, Shield, Star, Target, TrendingUp, Trophy, X, Zap} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Card} from "@/components/ui/card"
import {Dialog, DialogContent, DialogDescription, DialogTitle,} from "@/components/ui/dialog"
import {Avatar, AvatarFallback} from "@/components/ui/avatar"
import {useToast} from "@/hooks/use-toast"
import {db} from "@/lib/firebase"
import {doc, getDoc, serverTimestamp, setDoc} from "firebase/firestore"

interface RatingModalProps {
    isOpen: boolean
    onClose: () => void
    match: any
    currentUser: any
    nomeLista: string
    groupId: string
}

export function MatchRatingModal({ isOpen, onClose, match, currentUser, nomeLista, groupId }: RatingModalProps) {
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [ratings, setRatings] = useState<Record<string, any>>({})
    const [selectedGeneral, setSelectedGeneral] = useState<string[]>([])
    const [mvpChoice, setMvpChoice] = useState<string | null>(null) // NOVO: Estado para o Craque
    const [hasVoted, setHasVoted] = useState(false)
    const [checkingVote, setCheckingVote] = useState(true)

    useEffect(() => {
        const checkVoteStatus = async () => {
            if (!currentUser || !match.id) return
            try {
                const voteRef = doc(db, "groups", groupId, "matches", match.id, "technical_ratings", currentUser.uid)
                const docSnap = await getDoc(voteRef)
                if (docSnap.exists()) setHasVoted(true)
            } catch (e) { console.error(e) }
            finally { setCheckingVote(false) }
        }
        if (isOpen) checkVoteStatus()
    }, [isOpen, currentUser, match.id, groupId])

    const getMyTeammates = () => {
        if (!match.teams || !nomeLista) return []
        const myName = nomeLista.toLowerCase().trim()
        const teamKeys = ['teamA', 'teamB', 'teamC']
        const myTeamKey = teamKeys.find(key =>
            match.teams[key]?.some((p: any) => (p.name || p).toLowerCase().trim() === myName)
        )
        if (!myTeamKey) return []
        return match.teams[myTeamKey].filter((p: any) => (p.name || p).toLowerCase().trim() !== myName)
    }

    const teammates = getMyTeammates()

    const handleStarClick = (playerName: string, attr: string, value: number) => {
        if (hasVoted) return
        setRatings(prev => ({
            ...prev,
            [playerName]: { ...prev[playerName], [attr]: value }
        }))
    }

    const isTeammateStepComplete = () => {
        return teammates.every((p: any) => {
            const name = p.name || p
            const r = ratings[name]
            return r?.technique && r?.speed && r?.defense && r?.finishing
        })
    }

    const submitVotes = async () => {
        if (hasVoted || !mvpChoice) {
            toast({ variant: "destructive", title: "ESCOLHA O MVP", description: "Selecione quem foi o melhor da partida antes de finalizar." });
            return;
        }
        try {
            const voteRef = doc(db, "groups", groupId, "matches", match.id, "technical_ratings", currentUser.uid)

            await setDoc(voteRef, {
                ratings,
                mvpChoice, // Salvando o Craque da Rodada aqui dentro
                createdAt: serverTimestamp(),
                isAnonymous: true
            })

            toast({ title: "VOTOS ENVIADOS", description: "Avaliação técnica e MVP registrados!" })
            setHasVoted(true)
            onClose()
        } catch (e) {
            toast({ variant: "destructive", title: "ERRO AO SALVAR" })
        }
    }

    const PlayerRatingCard = ({ p }: { p: any }) => {
        const name = p.name || p
        return (
            <Card className="bg-white/[0.03] border-white/5 p-4 rounded-[2rem] mb-4 border-none shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar className="size-10 border border-primary/30">
                        <AvatarFallback className="bg-zinc-800 text-[10px] font-black">{name[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-black italic uppercase text-sm text-white tracking-tighter">{name}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <StarRatingField label="Técnica" icon={<TrendingUp size={10}/>} value={ratings[name]?.technique || 0} onChange={(v: number) => handleStarClick(name, 'technique', v)} />
                    <StarRatingField label="Velocidade" icon={<Zap size={10}/>} value={ratings[name]?.speed || 0} onChange={(v: number) => handleStarClick(name, 'speed', v)} />
                    <StarRatingField label="Chute" icon={<Target size={10}/>} value={ratings[name]?.finishing || 0} onChange={(v: number) => handleStarClick(name, 'finishing', v)} />
                    <StarRatingField label="Defesa" icon={<Shield size={10}/>} value={ratings[name]?.defense || 0} onChange={(v: number) => handleStarClick(name, 'defense', v)} />
                </div>
            </Card>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="max-w-2xl w-[95%] h-[85vh] bg-[#0c0c0e] border-white/10 p-0 overflow-hidden flex flex-col rounded-[2.5rem] outline-none"
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/30 shrink-0">
                    <div>
                        <DialogTitle className="text-xl font-black italic uppercase text-primary tracking-tighter">Avaliação Técnica</DialogTitle>
                        <DialogDescription className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">
                            {hasVoted ? "CONCLUÍDO" : (step === 1 ? "PASSO 1: SEU TIME" : "PASSO 2: CRAQUE E DESTAQUES")}
                        </DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/5"><X className="text-white/40"/></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20 overflow-x-hidden flex flex-col">
                    {checkingVote ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-20"><Zap className="size-12 animate-pulse text-primary" /></div>
                    ) : hasVoted ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="size-10 text-primary" /></div>
                            <h3 className="text-white font-black italic uppercase text-lg">Votos Registrados!</h3>
                            <Button onClick={onClose} className="mt-8 bg-white/5 text-white font-black uppercase italic text-[10px] h-11 px-8 rounded-xl">Fechar</Button>
                        </div>
                    ) : (
                        <>
                            {step === 1 ? (
                                <div className="space-y-2 pb-8">
                                    {teammates.map((p: any, i: number) => <PlayerRatingCard key={i} p={p} />)}
                                </div>
                            ) : (
                                <div className="space-y-6 pb-8">
                                    {/* SEÇÃO: ESCOLHA DO MVP */}
                                    <div className="bg-primary/5 border border-primary/10 p-5 rounded-[2rem]">
                                        <h4 className="text-primary font-black italic uppercase text-xs mb-4 flex items-center gap-2">
                                            <Trophy className="size-4" /> Escolha o MVP da Partida
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {match.confirmedPlayers?.filter((n:string) => n.toLowerCase() !== nomeLista.toLowerCase()).map((name: string) => (
                                                <Button
                                                    key={name}
                                                    variant="ghost"
                                                    className={`h-12 rounded-xl border text-[10px] font-black uppercase italic transition-all ${mvpChoice === name ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/5 text-white/40'}`}
                                                    onClick={() => setMvpChoice(name)}
                                                >
                                                    {name.split(' ')[0]}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SEÇÃO: OUTROS DESTAQUES */}
                                    <div className="space-y-3">
                                        <h4 className="text-white/40 font-black italic uppercase text-[10px] px-2 tracking-widest">Avaliar outros atletas (Opcional - Máx 3)</h4>
                                        {match.confirmedPlayers?.filter((n:string) => n.toLowerCase() !== nomeLista.toLowerCase()).map((name: string) => {
                                            const isSelected = selectedGeneral.includes(name);
                                            const isTeammate = teammates.some((t:any) => (t.name || t).toLowerCase() === name.toLowerCase());
                                            if (isTeammate) return null;

                                            return (
                                                <div key={name} className="w-full">
                                                    <Button
                                                        variant="ghost"
                                                        className={`w-full justify-start h-14 rounded-2xl border transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}
                                                        onClick={() => {
                                                            if(isSelected) setSelectedGeneral(prev => prev.filter(n => n !== name))
                                                            else if(selectedGeneral.length < 3) setSelectedGeneral(prev => [...prev, name])
                                                        }}
                                                    >
                                                        <div className={`size-2 rounded-full mr-3 ${isSelected ? 'bg-primary animate-pulse' : 'bg-white/10'}`} />
                                                        <span className="font-black italic uppercase text-[11px] text-white">{name}</span>
                                                    </Button>
                                                    {isSelected && <div className="mt-3 animate-in slide-in-from-top-2 duration-300"><PlayerRatingCard p={name} /></div>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!hasVoted && !checkingVote && (
                    <div className="p-6 bg-zinc-900/50 border-t border-white/5 flex gap-3 shrink-0">
                        {step === 2 && <Button onClick={() => setStep(1)} className="bg-white/5 text-white font-black uppercase text-[10px] h-12 rounded-xl px-6">Voltar</Button>}
                        {step === 1 ? (
                            <Button disabled={!isTeammateStepComplete()} onClick={() => setStep(2)} className="flex-1 bg-primary text-black font-black uppercase text-xs h-12 rounded-xl">Próximo Passo</Button>
                        ) : (
                            <Button disabled={!mvpChoice} onClick={submitVotes} className="flex-1 bg-emerald-600 text-white font-black uppercase text-xs h-12 rounded-xl">Finalizar Votação</Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function StarRatingField({ label, value, onChange, icon }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase text-white/40 tracking-tighter">
                <span className="text-primary/60">{icon}</span> {label}
            </div>
            <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onChange(s)}
                            className={`transition-all duration-300 outline-none p-0.5 ${s <= value ? 'text-primary scale-110 drop-shadow-[0_0_5px_rgba(234,255,0,0.5)]' : 'text-white/5'}`}
                    >
                        <Star size={18} fill={s <= value ? "currentColor" : "none"} strokeWidth={2.5} />
                    </button>
                ))}
            </div>
        </div>
    )
}