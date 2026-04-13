import {useEffect, useState} from "react"
import {CheckCircle2, Lock, Shield, Star, Target, TrendingUp, Trophy, X, Zap} from "lucide-react"
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
    isAdmin: boolean
}

export function MatchRatingModal({ isOpen, onClose, match, currentUser, nomeLista, groupId, isAdmin }: RatingModalProps) {
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [ratings, setRatings] = useState<Record<string, any>>({})
    const [selectedGeneral, setSelectedGeneral] = useState<string[]>([])
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
        if (isOpen) {
            setStep(1)
            if (isAdmin) {
                setRatings({})
                setSelectedGeneral([])
                setHasVoted(false)
                setCheckingVote(false)
            } else {
                checkVoteStatus()
            }
        }
    }, [isOpen, currentUser, match.id, groupId, isAdmin])

    const getMyTeammates = () => {
        if (!match.teams || !nomeLista) return []

        const myNameProfile = nomeLista.toString().trim().toLowerCase()
        const teamKeys = ['teamA', 'teamB', 'teamC'] as const

        const myTeamKey = teamKeys.find(key =>
            match.teams[key]?.some((p: any) => {
                const pNameList = (p?.name || p || "").toString().trim().toLowerCase()
                return pNameList === myNameProfile ||
                    myNameProfile.includes(pNameList) ||
                    pNameList.includes(myNameProfile)
            })
        )

        if (!myTeamKey) return []

        return (match.teams[myTeamKey] || []).filter((p: any) => {
            const pNameList = (p?.name || p || "").toString().trim().toLowerCase()
            const isMe = pNameList === myNameProfile ||
                myNameProfile.includes(pNameList) ||
                pNameList.includes(myNameProfile)
            return !isMe && pNameList !== ""
        })
    }

    const teammates = getMyTeammates()

    const isParticipant = () => {
        if (!match.teams || !nomeLista) return false;
        const myNameProfile = nomeLista.toString().trim().toLowerCase();
        const teamKeys = ['teamA', 'teamB', 'teamC'] as const;

        return teamKeys.some(key =>
            match.teams[key]?.some((p: any) => {
                const pNameList = (p?.name || p || "").toString().trim().toLowerCase();
                return pNameList === myNameProfile ||
                    myNameProfile.includes(pNameList) ||
                    pNameList.includes(myNameProfile);
            })
        );
    };

    const userIsParticipant = isParticipant();

    const handleStarClick = (playerName: string, attr: string, value: number) => {
        setRatings(prev => ({
            ...prev,
            [playerName]: { ...prev[playerName], [attr]: value }
        }))
    }

    const isTeammateStepComplete = () => {
        if (teammates.length === 0) return true
        return teammates.every((p: any) => {
            const name = p.name || p
            const r = ratings[name]
            return r?.technique && r?.speed && r?.defense && r?.finishing
        })
    }

    const submitVotes = async () => {
        if (!isAdmin && hasVoted) return;

        try {
            const voteId = isAdmin ? `admin_${currentUser.uid}_${Date.now()}` : currentUser.uid;
            const voteRef = doc(db, "groups", groupId, "matches", match.id, "technical_ratings", voteId)

            await setDoc(voteRef, {
                ratings,
                voterName: nomeLista,
                createdAt: serverTimestamp(),
                isAnonymous: !isAdmin
            })

            toast({ title: "VOTOS ENVIADOS" })
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
                        <DialogTitle className="text-xl font-black italic uppercase text-primary tracking-tighter">
                            {isAdmin ? "Admin: Voto de Contingência" : "Avaliação Técnica"}
                        </DialogTitle>
                        <DialogDescription className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">
                            {hasVoted && !isAdmin ? "CONCLUÍDO" : !userIsParticipant && !isAdmin ? "ACESSO NEGADO" : (step === 1 ? "PASSO 1: SEU TIME" : "PASSO 2: OUTROS ATLETAS")}
                        </DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/5"><X className="text-white/40"/></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20 flex flex-col">
                    {checkingVote ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-20"><Zap className="size-12 animate-pulse text-primary" /></div>
                    ) : (hasVoted && !isAdmin) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="size-10 text-primary" /></div>
                            <h3 className="text-white font-black italic uppercase text-lg">Votos Registrados!</h3>
                            <Button onClick={onClose} className="mt-8 bg-white/5 text-white font-black uppercase italic text-[10px] h-11 px-8 rounded-xl">Fechar</Button>
                        </div>
                    ) : (!userIsParticipant && !isAdmin) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                            <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                <Lock className="size-10 text-red-500" />
                            </div>
                            <h3 className="text-white font-black italic uppercase text-lg leading-tight">Votação Restrita</h3>
                            <Button onClick={onClose} className="mt-8 bg-white/5 text-white font-black uppercase italic text-[10px] h-11 px-8 rounded-xl border border-white/5">Voltar ao Clube</Button>
                        </div>
                    ) : (
                        <>
                            {step === 1 ? (
                                <div className="space-y-2 pb-8">
                                    {teammates.length > 0 ? (
                                        teammates.map((p: any, i: number) => <PlayerRatingCard key={i} p={p} />)
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-center opacity-40 py-10">
                                            <p className="text-[10px] uppercase font-black italic">Vá para o Passo 2 para votar nos adversários</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 pb-8">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-2 px-2">
                                            <Trophy className="size-4 text-primary" />
                                            <h4 className="text-white/40 font-black italic uppercase text-[10px] tracking-widest">
                                                {isAdmin ? "Todos os Atletas" : "Outros Jogadores (Máx 3)"}
                                            </h4>
                                        </div>
                                        {match.confirmedPlayers?.filter((n:string) => {
                                            const nameInList = n.toString().trim().toLowerCase();
                                            const myNameProfile = nomeLista.toString().trim().toLowerCase();
                                            const isMe = nameInList === myNameProfile ||
                                                                    myNameProfile.includes(nameInList) ||
                                                                    nameInList.includes(myNameProfile);
                                            return !isMe;
                                        }).map((name: string) => {
                                            const isSelected = selectedGeneral.includes(name);
                                            const isTeammate = teammates.some((t:any) => {
                                                const tName = (t.name || t || "").toString().trim().toLowerCase();
                                                return tName === name.trim().toLowerCase();
                                            });
                                            if (isTeammate) return null;

                                            return (
                                                <div key={name} className="w-full">
                                                    <Button
                                                        variant="ghost"
                                                        className={`w-full justify-start h-14 rounded-2xl border transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}
                                                        onClick={() => {
                                                            if(isSelected) setSelectedGeneral(prev => prev.filter(n => n !== name))
                                                            else if(isAdmin || selectedGeneral.length < 3) setSelectedGeneral(prev => [...prev, name])
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

                {(!hasVoted || isAdmin) && !checkingVote && (userIsParticipant || isAdmin) && (
                    <div className="p-6 bg-zinc-900/50 border-t border-white/5 flex gap-3 shrink-0">
                        {step === 2 && <Button onClick={() => setStep(1)} className="bg-white/5 text-white font-black uppercase text-[10px] h-12 rounded-xl px-6">Voltar</Button>}
                        {step === 1 ? (
                            <Button
                                disabled={!isAdmin && teammates.length > 0 && !isTeammateStepComplete()}
                                onClick={() => setStep(2)}
                                className="flex-1 bg-primary text-black font-black uppercase text-xs h-12 rounded-xl"
                            >
                                Próximo Passo
                            </Button>
                        ) : (
                            <Button onClick={submitVotes} className="flex-1 bg-emerald-600 text-white font-black uppercase text-xs h-12 rounded-xl">
                                Finalizar Votação
                            </Button>
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
                            className={`transition-all duration-300 outline-none p-0.5 ${s <= value ? 'text-primary scale-110' : 'text-white/5'}`}
                    >
                        <Star size={18} fill={s <= value ? "currentColor" : "none"} strokeWidth={2.5} />
                    </button>
                ))}
            </div>
        </div>
    )
}