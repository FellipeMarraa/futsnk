import {useEffect, useState} from "react"
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Copy,
    Loader2,
    MoreVertical,
    Pencil,
    PlayCircle,
    RefreshCw,
    Star,
    Trash2,
    UserMinus,
    Users,
    Crown
} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Card} from "@/components/ui/card"
import {Textarea} from "@/components/ui/textarea"
import {useToast} from "@/hooks/use-toast"
import {db} from "@/lib/firebase"
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from "firebase/firestore"
import {useAuth} from "@/contexts/auth-context"
import {MatchLogic} from "@/lib/match-logic"
import {format, isValid, parseISO} from "date-fns"
import {ptBR} from "date-fns/locale"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
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
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
import {MatchRatingModal} from "@/components/match-rating-modal"

interface MatchDetailProps {
    groupId: string
    match: any
    onBack: () => void
    isAdmin: boolean
}

export function MatchDetail({ groupId, match: initialMatch, onBack, isAdmin }: MatchDetailProps) {
    const { nomeLista, user } = useAuth()
    const { toast } = useToast()

    const [match, setMatch] = useState(initialMatch)
    const [rawList, setRawList] = useState("")
    const [votedPlayerNames, setVotedPlayerNames] = useState<string[]>([])
    const [playersMeta, setPlayersMeta] = useState<Record<string, any>>({})
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editDate, setEditDate] = useState(initialMatch.date || "")
    const [activeTeamTab, setActiveTeamTab] = useState(0)
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
    const [selectedForDraw, setSelectedForDraw] = useState<string[]>([]);

    useEffect(() => {
        const matchRef = doc(db, "groups", groupId, "matches", initialMatch.id);
        const unsubMatch = onSnapshot(matchRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setMatch({ id: doc.id, ...data });
                if (selectedForDraw.length === 0 && data.confirmedPlayers) {
                    setSelectedForDraw(data.confirmedPlayers);
                }
            }
        });

        const qRatings = collection(db, "groups", groupId, "matches", initialMatch.id, "technical_ratings");
        const unsubRatings = onSnapshot(qRatings, (snap) => {
            const names = new Set<string>();
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.ratings) {
                    Object.keys(data.ratings).forEach(name => names.add(name.toLowerCase().trim()));
                }
            });
            setVotedPlayerNames(Array.from(names));
        });

        const qMeta = query(collection(db, "groups", groupId, "players_meta"));
        const unsubMeta = onSnapshot(qMeta, (snap) => {
            const metaMap: Record<string, any> = {};
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const docId = docSnap.id;
                const nomeLista = (data.nomeLista || "").toLowerCase().trim();
                metaMap[docId.toLowerCase()] = data;
                if (nomeLista) metaMap[nomeLista] = data;
            });
            setPlayersMeta(metaMap);
        });

        return () => { unsubMatch(); unsubRatings(); unsubMeta(); };
    }, [initialMatch.id, groupId]);

    const pendingPlayers = (match.confirmedPlayers || []).filter((name: string) =>
        !votedPlayerNames.includes(name.toLowerCase().trim())
    );

    const togglePlayerSelection = (name: string) => {
        setSelectedForDraw(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const getSafeDateLabel = () => {
        if (!match.date) return "DATA NÃO DEFINIDA";
        try {
            const d = parseISO(match.date);
            return isValid(d) ? format(d, "EEEE, dd 'de' MMMM", { locale: ptBR }) : match.date;
        } catch { return match.date; }
    };

    const copyToClipboard = () => {
        if (!match.teams) return;
        const text = `⚽ *CONVOCAÇÃO FINAL* ⚽\n\n*TIME A:*\n${match.teams.teamA?.map((p: any) => `• ${p.name || p}`).join('\n')}\n\n*TIME B:*\n${match.teams.teamB?.map((p: any) => `• ${p.name || p}`).join('\n')}\n\n*RESERVAS:*\n${match.teams.teamC?.map((p: any) => `• ${p.name || p}`).join('\n')}`;
        navigator.clipboard.writeText(text);
        toast({ title: "COPIADO" });
    };

    const handleUpdateMatchDate = async () => {
        setIsProcessing(true)
        try {
            await updateDoc(doc(db, "groups", groupId, "matches", match.id), { date: editDate })
            setIsEditing(false)
            toast({ title: "DATA ATUALIZADA" })
        } catch (e) { toast({ variant: "destructive", title: "ERRO" }) }
        finally { setIsProcessing(false) }
    }

    const removePlayerFromMatch = async (pName: string) => {
        if (!confirm(`Remover ${pName}?`)) return;
        try {
            const newConfirmed = (match.confirmedPlayers || []).filter((n: string) => n !== pName);
            const newTeams = match.teams ? { ...match.teams } : null;
            if (newTeams) {
                ['teamA', 'teamB', 'teamC'].forEach(t => {
                    if (newTeams[t]) newTeams[t] = newTeams[t].filter((p: any) => (p?.name || p) !== pName);
                });
            }
            await updateDoc(doc(db, "groups", groupId, "matches", match.id), {
                confirmedPlayers: newConfirmed, teams: newTeams, updatedAt: new Date()
            });
            toast({ title: "REMOVIDO" });
        } catch (e) { toast({ variant: "destructive", title: "ERRO" }); }
    };

    const editPlayerName = async (oldName: string) => {
        const newName = prompt("Novo nome:", oldName);
        if (!newName || newName === oldName) return;
        try {
            const newConfirmed = (match.confirmedPlayers || []).map((n: string) => n === oldName ? newName : n);
            const newTeams = match.teams ? { ...match.teams } : null;
            if (newTeams) {
                ['teamA', 'teamB', 'teamC'].forEach(t => {
                    if (newTeams[t]) newTeams[t] = newTeams[t].map((p: any) => (p?.name || p) === oldName ? (typeof p === 'object' ? { ...p, name: newName } : newName) : p);
                });
            }
            await updateDoc(doc(db, "groups", groupId, "matches", match.id), {
                confirmedPlayers: newConfirmed, teams: newTeams, updatedAt: new Date()
            });
            toast({ title: "ATUALIZADO" });
        } catch (e) { toast({ variant: "destructive", title: "ERRO" }); }
    };

    const processWhatsAppList = async () => {
        if (!rawList.trim()) return;
        setIsProcessing(true)
        try {
            const lines = rawList.split('\n')
            const playersFound = lines
                .filter(line => line.includes('🏃'))
                .map(line => line.replace(/🏃🏻‍♂|🏃|[\-]/g, '').replace(/^\d+[\s.\-)]+/, '').trim())
                .filter(name => name.length >= 2);
            if (playersFound.length === 0) {
                toast({ variant: "destructive", title: "LISTA VAZIA" });
                return;
            }
            await updateDoc(doc(db, "groups", groupId, "matches", match.id), {
                confirmedPlayers: playersFound, teams: null, updatedAt: new Date()
            })
            setRawList("")
            toast({ title: "SINCRONIZADO" })
        } catch (error) { toast({ variant: "destructive", title: "ERRO" }) }
        finally { setIsProcessing(false) }
    }

    const handleDraw = async () => {
        if (selectedForDraw.length < 2) {
            toast({ variant: "destructive", title: "POUCOS ATLETAS", description: "Marque quem já chegou para o sorteio." });
            return;
        }
        setIsProcessing(true)
        try {
            const { DrawService } = await import("@/lib/draw.service.ts");
            const presentPlayers = selectedForDraw;
            const absentPlayers = (match.confirmedPlayers || []).filter((n: string) => !selectedForDraw.includes(n));
            const result = await DrawService.calculateTeams(groupId, presentPlayers, absentPlayers)

            await updateDoc(doc(db, "groups", groupId, "matches", match.id), {
                teams: result,
                status: "drawn",
                updatedAt: new Date()
            })
            toast({ title: "SORTEIO REALIZADO" })
        } catch (e) { toast({ variant: "destructive", title: "ERRO NO SORTEIO" }) }
        finally { setIsProcessing(false) }
    }

    const handleOpenVoting = async () => {
        setIsProcessing(true)
        try {
            await updateDoc(doc(db, "groups", groupId, "matches", match.id), { status: "voting_open" })
            toast({ title: "VOTAÇÃO LIBERADA" })
        } catch (e) { } finally { setIsProcessing(false) }
    }

    const handleFinalizeMatch = async () => {
        setIsProcessing(true)
        try {
            await MatchLogic.finalizeMatch(groupId, match.id, match.confirmedPlayers)
            toast({ title: "RODADA ENCERRADA" })
        } catch (e) { } finally { setIsProcessing(false) }
    }

    const handleDeleteMatch = async () => {
        setIsProcessing(true);
        try {
            const latestMatchRef = doc(db, "groups", groupId, "matches", match.id);
            const latestMatchSnap = await getDoc(latestMatchRef);
            const matchData = latestMatchSnap.data();
            if (matchData?.status === "finished" && Array.isArray(matchData.preMatchStats)) {
                const rollbackPromises = matchData.preMatchStats.map(async (stat: any) => {
                    if (!stat.playerId || !stat.oldStats) return;
                    const playerMetaRef = doc(db, "groups", groupId, "players_meta", stat.playerId);
                    return setDoc(playerMetaRef, {
                        technique: Number(stat.oldStats.technique),
                        speed: Number(stat.oldStats.speed),
                        finishing: Number(stat.oldStats.finishing),
                        defense: Number(stat.oldStats.defense),
                        lastUpdated: serverTimestamp()
                    }, { merge: true });
                });
                await Promise.all(rollbackPromises);
            }
            await deleteDoc(latestMatchRef);
            toast({ title: "RODADA EXCLUÍDA" });
            onBack();
        } catch (e) { toast({ variant: "destructive", title: "ERRO AO EXCLUIR" }); }
        finally { setIsProcessing(false); setIsDeleteDialogOpen(false); }
    };

    const PlayerIcon = ({ player, className }: { player: any, className: string }) => {
        const playerName = player?.name || (typeof player === 'string' ? player : "---");
        const searchName = playerName.toLowerCase().trim();
        let meta = playersMeta[searchName];
        if (!meta) {
            const fallbackKey = Object.keys(playersMeta).find(key => searchName.includes(key) || key.includes(searchName));
            if (fallbackKey) meta = playersMeta[fallbackKey];
        }
        const photo = meta?.photoURL || "";
        let displayOvr = 70;
        if (meta) {
            const t = Number(meta.technique) || 70;
            const c = Number(meta.finishing) || 70;
            const v = Number(meta.speed) || 70;
            const d = Number(meta.defense) || 70;
            displayOvr = Math.round((t * 0.35) + (c * 0.35) + (v * 0.15) + (d * 0.15));
        }
        return (
            <div className={`absolute flex flex-col items-center transition-all duration-700 animate-in zoom-in-50 ${className}`}>
                <div className="relative">
                    <Avatar className="size-14 border-2 border-primary/40 shadow-[0_0_15px_rgba(234,255,0,0.2)] bg-zinc-900">
                        <AvatarImage src={photo} className="object-cover" />
                        <AvatarFallback className="text-white font-black italic text-[10px] bg-zinc-800 flex items-center justify-center">
                            {playerName.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 bg-primary text-black text-[8px] font-black px-1.5 rounded-full ring-2 ring-emerald-950 min-w-5 h-5 flex items-center justify-center">
                        {displayOvr > 99 ? 99 : displayOvr}
                    </div>
                </div>
                <span className="mt-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-black text-white uppercase italic border border-white/10 max-w-[90px] truncate">
                    {playerName.split(' ')[0]}
                </span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-32 font-sans selection:bg-primary/30">
            <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-md border-b border-white/5 p-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between font-sans">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-white outline-none"><ArrowLeft className="size-5"/></button>
                        <div>
                            {isEditing ? (
                                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} onBlur={handleUpdateMatchDate} className="h-8 bg-white/5 border-none text-white font-black italic uppercase" autoFocus />
                            ) : (
                                <h2 className="text-lg font-black italic uppercase tracking-tighter text-white" onClick={() => isAdmin && setIsEditing(true)}>
                                    {getSafeDateLabel()}
                                </h2>
                            )}
                            <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">Rodada Oficial</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="bg-white/5 rounded-full text-white outline-none">
                                    <MoreVertical/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1a1e] border-white/10 text-white text-[10px] font-black uppercase italic">
                                <DropdownMenuItem onClick={copyToClipboard}><Copy className="size-4 mr-2" /> WhatsApp</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsEditing(true)}><Calendar className="size-4 mr-2" /> Alterar Data</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                {match.status === 'drawn' && (
                                    <DropdownMenuItem onClick={handleOpenVoting} className="text-primary"><PlayCircle className="size-4 mr-2" /> Liberar Votação</DropdownMenuItem>
                                )}
                                {match.status === 'voting_open' && (
                                    <DropdownMenuItem onClick={handleFinalizeMatch} className="text-emerald-400"><CheckCircle2 className="size-4 mr-2" /> Encerrar Rodada</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-500"><Trash2 className="size-4 mr-2" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                        {match.teams ? (
                            <div className="w-full flex flex-col items-center">
                                <div className="w-full flex items-center justify-between mb-4">
                                    <Button variant="ghost" size="icon" onClick={() => setActiveTeamTab(prev => (prev > 0 ? prev - 1 : 2))} className="rounded-full bg-white/5 text-white"><ChevronLeft/></Button>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black italic uppercase text-primary tracking-tighter leading-none">
                                            {activeTeamTab === 2 ? 'Reservas' : `Time ${['A', 'B'][activeTeamTab]}`}
                                        </h3>
                                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">Campo EAFC</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setActiveTeamTab(prev => (prev < 2 ? prev + 1 : 0))} className="rounded-full bg-white/5 text-white"><ChevronRight/></Button>
                                </div>
                                {isAdmin && match.status !== "finished" && (
                                    <div className="mb-4">
                                        <Button onClick={handleDraw} disabled={isProcessing} variant="outline" className="bg-white/5 border-white/10 text-white/60 hover:text-white text-[9px] font-black uppercase italic h-8 rounded-lg">
                                            <RefreshCw className={`size-3 mr-2 ${isProcessing ? 'animate-spin' : ''}`} /> Refazer Equilíbrio
                                        </Button>
                                    </div>
                                )}
                                <div className="relative aspect-[3/4] w-full max-w-[320px] mx-auto bg-emerald-950/40 rounded-[3rem] border-2 border-white/5 shadow-2xl overflow-hidden">
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-b-2 border-white/10 rounded-b-full" />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-white/10 rounded-t-full" />
                                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10" />
                                    <div className="relative h-full w-full">
                                        {(() => {
                                            const currentTeamKey = ['teamA', 'teamB', 'teamC'][activeTeamTab];
                                            const currentTeam = match.teams[currentTeamKey] || [];
                                            return (
                                                <>
                                                    {currentTeam[0] && <PlayerIcon player={currentTeam[0]} className="top-[12%] left-1/2 -translate-x-1/2" />}
                                                    {currentTeam[1] && <PlayerIcon player={currentTeam[1]} className="top-[42%] left-[12%]" />}
                                                    {currentTeam[2] && <PlayerIcon player={currentTeam[2]} className="top-[42%] right-[12%]" />}
                                                    {currentTeam[3] && <PlayerIcon player={currentTeam[3]} className="bottom-[12%] left-1/2 -translate-x-1/2" />}
                                                    {currentTeam[4] && <PlayerIcon player={currentTeam[4]} className="top-[28%] left-1/2 -translate-x-1/2 scale-75 opacity-50" />}
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                                {match.status === 'voting_open' && (
                                    <div className="w-full max-w-[320px] mt-6">
                                        <Button onClick={() => setIsRatingModalOpen(true)} className="w-full bg-gradient-to-r from-primary to-emerald-500 text-black font-black italic uppercase text-xs h-14 rounded-2xl">
                                            <Star className="mr-2 size-5 fill-black" /> Avaliar Atletas
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-[3/4] flex flex-col items-center justify-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem] text-center p-8">
                                {match.confirmedPlayers?.length > 0 ? (
                                    <div className="space-y-4 text-center">
                                        <Users className="size-12 text-primary mx-auto opacity-20" />
                                        <h4 className="text-white font-black italic uppercase tracking-tighter">Sorteio Pendente</h4>
                                        <p className="text-[10px] text-white/40 uppercase font-bold">Marque na lista ao lado quem já chegou para equilibrar os times A e B.</p>
                                        {isAdmin && <Button onClick={handleDraw} disabled={isProcessing} className="bg-primary text-black font-black uppercase text-[10px] h-11 px-8 rounded-xl shadow-lg">
                                            {isProcessing ? <Loader2 className="animate-spin size-4" /> : "Sortear com Presentes"}
                                        </Button>}
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Aguardando Convocação</p>
                                )}
                            </div>
                        )}

                        {/* SECTION: MISS DO RACHA (EX-MVP) */}
                        {match.status === 'finished' && match.mvp && (
                            <div className="w-full mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="bg-white/[0.03] border-white/5 rounded-3xl p-4 flex items-center gap-4 w-full max-w-[320px] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                        <Crown className="size-12 text-primary rotate-12" />
                                    </div>

                                    <div className="relative shrink-0">
                                        <Avatar className="size-16 border-2 border-primary/50 shadow-[0_0_20px_rgba(234,255,0,0.2)]">
                                            <AvatarImage
                                                src={playersMeta[match.mvp.toLowerCase()]?.photoURL}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-zinc-800 text-xl font-black italic">
                                                {match.mvp[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 bg-primary p-1 rounded-full shadow-lg">
                                            <Star className="size-3 text-black fill-black" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Crown className="size-3 text-primary shrink-0" />
                                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] italic">
                                                Miss do Racha
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black italic uppercase text-white truncate tracking-tighter leading-none">
                                            {match.mvp}
                                        </h3>
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">
                                            Destaque da Rodada
                                        </p>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        {isAdmin && match.status === 'voting_open' && (
                            <>
                                {pendingPlayers.length > 0 ? (
                                    <Card className="bg-amber-500/10 border-amber-500/20 rounded-[2rem] p-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="size-4 text-amber-500" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Atletas Sem Voto</h3>
                                            </div>
                                            <Button
                                                onClick={() => setIsRatingModalOpen(true)}
                                                variant="ghost"
                                                className="h-7 px-3 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 text-[8px] font-black uppercase rounded-lg"
                                            >
                                                Votar Agora
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {pendingPlayers.map((name: string) => (
                                                <Badge
                                                    key={name}
                                                    variant="outline"
                                                    className="bg-black/20 border-amber-500/30 text-white/60 text-[8px] font-bold uppercase italic px-3 py-1 rounded-full cursor-pointer hover:border-amber-500 transition-colors"
                                                    onClick={() => setIsRatingModalOpen(true)}
                                                >
                                                    {name}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-[8px] text-white/20 font-bold uppercase mt-4 leading-tight italic">
                                            * Use seu voto de admin para avaliar quem ficou no vácuo antes de encerrar.
                                        </p>
                                    </Card>
                                ) : (
                                    <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-[2rem] p-6 text-center border-dashed">
                                        <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-2" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Tudo Pronto!</h3>
                                        <p className="text-[9px] text-white/40 font-bold uppercase mt-1">Todos já possuem ao menos 1 voto.</p>
                                    </Card>
                                )}
                            </>
                        )}

                        {isAdmin && match.status === 'open' && (
                            <Card className="bg-[#1a1a1e] border-white/5 rounded-[2rem] p-6 shadow-2xl border-none">
                                <Textarea placeholder="Cole a lista..." className="bg-black/20 border-white/10 text-[11px] font-bold rounded-xl min-h-[150px] mb-4 text-white" value={rawList} onChange={(e) => setRawList(e.target.value)} />
                                <Button onClick={processWhatsAppList} disabled={isProcessing} className="w-full bg-white/5 text-white font-black text-[10px] uppercase h-11 rounded-xl">SINCRONIZAR</Button>
                            </Card>
                        )}

                        <Card className="bg-white/[0.03] border-white/5 rounded-[2rem] p-6 shadow-lg border-none">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Check-in Sorteio</h3>
                                <Badge variant="outline" className="text-primary border-primary/20 text-[9px] font-black">{selectedForDraw.length}/{match.confirmedPlayers?.length || 0}</Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {match.confirmedPlayers?.map((name: string, i: number) => {
                                    const isSelected = selectedForDraw.includes(name);
                                    return (
                                        <div key={i} className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5'}`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <button onClick={() => isAdmin && togglePlayerSelection(name)} className={`size-5 rounded-md flex items-center justify-center transition-all border ${isSelected ? 'bg-primary border-primary text-black' : 'bg-black/40 border-white/10 text-transparent'}`}>
                                                    <Check className="size-3.5 stroke-[4px]" />
                                                </button>
                                                <span className={`text-[10px] font-bold uppercase truncate ${isSelected ? 'text-white' : 'text-white/40'}`}>{name}</span>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => editPlayerName(name)} className="p-1.5 text-white/30 hover:text-primary"><Pencil className="size-3" /></button>
                                                    <button onClick={() => removePlayerFromMatch(name)} className="p-1.5 text-white/30 hover:text-red-500"><UserMinus className="size-3" /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>

            {user && nomeLista && <MatchRatingModal isAdmin={isAdmin} isOpen={isRatingModalOpen} onClose={() => setIsRatingModalOpen(false)} match={match} currentUser={user} nomeLista={nomeLista} groupId={groupId} />}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] shadow-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white uppercase font-black italic text-xl">Excluir Rodada?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[10px] uppercase font-bold tracking-widest leading-relaxed">Ação irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-4">
                        <AlertDialogCancel className="bg-white/5 border-none text-white font-black uppercase text-[10px] italic h-12 rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMatch} className="bg-red-600 text-white font-black uppercase text-[10px] italic h-12 rounded-xl border-none">Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}