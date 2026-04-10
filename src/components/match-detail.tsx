import {useEffect, useState} from "react"
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Copy,
    Loader2,
    MoreVertical,
    Pencil,
    Star,
    Trash2,
    Trophy,
    UserMinus,
    Users,
    Zap,
    PlayCircle,
    CheckCircle2,
    Medal
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
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    getDoc,
    serverTimestamp
} from "firebase/firestore"
import {useAuth} from "@/contexts/auth-context"
import {MatchLogic} from "@/lib/match-logic"
import {format, isValid, parseISO} from "date-fns"
import {ptBR} from "date-fns/locale"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator} from "@/components/ui/dropdown-menu"
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
import { MatchRatingModal } from "@/components/match-rating-modal"

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
    const [technicalRatings, setTechnicalRatings] = useState<any[]>([])
    const [playersMeta, setPlayersMeta] = useState<Record<string, any>>({})
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editDate, setEditDate] = useState(initialMatch.date || "")
    const [activeTeamTab, setActiveTeamTab] = useState(0)
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)

    useEffect(() => {
        const matchRef = doc(db, "groups", groupId, "matches", initialMatch.id);
        const unsubMatch = onSnapshot(matchRef, (doc) => {
            if (doc.exists()) setMatch({ id: doc.id, ...doc.data() });
        });

        const qRatings = collection(db, "groups", groupId, "matches", initialMatch.id, "technical_ratings");
        const unsubRatings = onSnapshot(qRatings, (snap) => {
            setTechnicalRatings(snap.docs.map(d => d.data()));
        });

        const qMeta = query(collection(db, "groups", groupId, "players_meta"));
        const unsubMeta = onSnapshot(qMeta, (snap) => {
            const metaMap: Record<string, any> = {};
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const docId = docSnap.id; // UID ou Nome
                const nomeLista = (data.nomeLista || "").toLowerCase().trim();

                metaMap[docId.toLowerCase()] = data;

                if (nomeLista) {
                    metaMap[nomeLista] = data;
                }
            });
            setPlayersMeta(metaMap);
        });

        return () => { unsubMatch(); unsubRatings(); unsubMeta(); };
    }, [initialMatch.id, groupId]);

    // LÓGICA ATUALIZADA: O MVP agora vem direto do documento da partida (calculado pelo MatchLogic)
    const matchMVPName = match.mvp || null;

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
        if (!match.confirmedPlayers || match.confirmedPlayers.length < 2) return;
        setIsProcessing(true)
        try {
            const { DrawService } = await import("@/lib/draw.service.ts");
            const result = await DrawService.calculateTeams(groupId, match.confirmedPlayers)

            await updateDoc(doc(db, "groups", groupId, "matches", match.id), {
                teams: result,
                status: "drawn", // Ajuste automático aqui
                updatedAt: new Date()
            })

            toast({ title: "SORTEIO CONCLUÍDO", description: "Times definidos e status atualizado." })
        } catch (e) {
            toast({ variant: "destructive", title: "ERRO NO SORTEIO" })
        } finally {
            setIsProcessing(false)
        }
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

            toast({
                title: "RODADA EXCLUÍDA",
                description: "Os níveis dos atletas voltaram ao estado anterior."
            });

            onBack();
        } catch (e) {
            console.error("Erro no Rollback:", e);
            toast({ variant: "destructive", title: "ERRO AO EXCLUIR", description: "Não foi possível restaurar os níveis." });
        } finally {
            setIsProcessing(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const PlayerIcon = ({ player, className }: { player: any, className: string }) => {
        const playerName = player?.name || (typeof player === 'string' ? player : "---");
        const searchName = playerName.toLowerCase().trim();

        let meta = playersMeta[searchName];

        if (!meta) {
            const fallbackKey = Object.keys(playersMeta).find(key =>
                searchName.includes(key) || key.includes(searchName)
            );
            if (fallbackKey) meta = playersMeta[fallbackKey];
        }

        const photo = meta?.photoURL || "";

        let displayOvr = 70;

        if (meta) {
            const t = Number(meta.technique) || 70;
            const c = Number(meta.finishing) || 70;
            const v = Number(meta.speed) || 70;
            const d = Number(meta.defense) || 70;

            const ovrReal = (t * 0.35) + (c * 0.35) + (v * 0.15) + (d * 0.15);
            displayOvr = Math.round(ovrReal);
        }

        if (displayOvr > 99) displayOvr = 99;
        if (displayOvr < 10) displayOvr = 70;

        return (
            <div className={`absolute flex flex-col items-center transition-all duration-700 animate-in zoom-in-50 ${className}`}>
                <div className="relative">
                    <Avatar className="size-14 border-2 border-primary/40 shadow-[0_0_15px_rgba(234,255,0,0.2)] bg-zinc-900">
                        <AvatarImage src={photo} className="object-cover" />
                        <AvatarFallback className="text-white font-black italic text-[10px] flex items-center justify-center bg-zinc-800">
                            {playerName.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="absolute -top-1 -right-1 bg-primary text-black text-[8px] font-black px-1.5 rounded-full ring-2 ring-emerald-950 min-w-5 h-5 flex items-center justify-center shadow-lg">
                        {displayOvr}
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
                                    <DropdownMenuItem onClick={handleOpenVoting} className="text-primary">
                                        <PlayCircle className="size-4 mr-2" /> Liberar Votação
                                    </DropdownMenuItem>
                                )}

                                {match.status === 'voting_open' && (
                                    <DropdownMenuItem onClick={handleFinalizeMatch} className="text-emerald-400">
                                        <CheckCircle2 className="size-4 mr-2" /> Encerrar Rodada
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-white/5" />

                                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-500">
                                    <Trash2 className="size-4 mr-2" /> Excluir</DropdownMenuItem>
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
                                    <div className="w-full max-w-[320px] mt-6 animate-in slide-in-from-bottom-4 duration-500">
                                        <Button
                                            onClick={() => {
                                                if(!user || !nomeLista) {
                                                    toast({ variant: "destructive", title: "LOGIN NECESSÁRIO" })
                                                    return
                                                }
                                                setIsRatingModalOpen(true)
                                            }}
                                            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-black font-black italic uppercase text-xs h-14 rounded-2xl shadow-xl shadow-primary/10 hover:scale-[1.02] transition-transform"
                                        >
                                            <Star className="mr-2 size-5 fill-black" /> Avaliar Atletas do Jogo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-[3/4] flex flex-col items-center justify-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem] text-center p-8">
                                {match.confirmedPlayers?.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto"><Users className="size-8 text-primary" /></div>
                                        <div>
                                            <h4 className="text-white font-black italic uppercase tracking-tighter">Vestiário Pronto</h4>
                                            <p className="text-[10px] text-white/40 uppercase font-bold mt-1">{match.confirmedPlayers.length} atletas convocados</p>
                                        </div>
                                        {isAdmin && <Button onClick={handleDraw} className="bg-primary text-black font-black uppercase text-[10px] h-11 px-8 rounded-xl shadow-lg">Realizar Sorteio</Button>}
                                    </div>
                                ) : (
                                    <>
                                        {isProcessing ? <Loader2 className="size-12 animate-spin text-primary opacity-20" /> : <Trophy className="size-12 text-white/5 mb-4" />}
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Aguardando Convocação</p>
                                    </>
                                )}
                            </div>
                        )}

                        {match.status === 'finished' && matchMVPName && (
                            <div className="mt-8 animate-in fade-in zoom-in duration-700">
                                <Card className="bg-gradient-to-b from-amber-400/20 to-transparent border-amber-400/30 rounded-[3rem] p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-10"><Trophy className="size-48 text-amber-400" /></div>
                                    <Medal className="size-12 text-amber-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                    <h3 className="text-amber-400 font-black italic uppercase text-2xl tracking-tighter">Man of the Match</h3>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">Melhor em Campo (Por Médias)</p>

                                    <div className="relative inline-block mb-4">
                                        <Avatar className="size-24 border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                                            <AvatarImage src={playersMeta[matchMVPName.toLowerCase().trim()]?.photoURL} className="object-cover" />
                                            <AvatarFallback className="bg-zinc-900 text-3xl font-black italic">{matchMVPName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-2 -right-2 bg-amber-400 text-black font-black italic px-3 py-1 rounded-lg text-xs shadow-lg">
                                            MVP
                                        </div>
                                    </div>

                                    <h4 className="text-white font-black italic uppercase text-xl tracking-tight mb-1">{matchMVPName}</h4>
                                    <Badge className="bg-amber-400 w-full text-black font-black border-none px-4 py-1 rounded-full text-[10px]">
                                        DESTAQUE DA RODADA
                                    </Badge>
                                </Card>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        {isAdmin && match.status === 'open' && (
                            <Card className="bg-[#1a1a1e] border-white/5 rounded-[2rem] p-6 shadow-2xl border-none">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2"><Zap className="size-3" /> Dashboard Admin</h3>
                                <Textarea placeholder="Cole a lista aqui..." className="bg-black/20 border-white/10 text-[11px] font-bold rounded-xl min-h-[150px] mb-4 text-white p-4 outline-none focus:ring-1 focus:ring-primary/50" value={rawList} onChange={(e) => setRawList(e.target.value)} />
                                <div className="grid grid-cols-1 gap-3">
                                    <Button onClick={processWhatsAppList} className="bg-white/5 text-white font-black text-[10px] uppercase h-11 rounded-xl border-none hover:bg-white/10 transition-colors">SINCRONIZAR</Button>
                                </div>
                            </Card>
                        )}

                        <Card className="bg-white/[0.03] border-white/5 rounded-[2rem] p-6 shadow-lg border-none">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4 text-left">Resumo de Votos</h3>
                            <div className="space-y-2">
                                {technicalRatings.length > 0 ? (
                                    <p className="text-[10px] text-primary font-black uppercase italic">{technicalRatings.length} atletas já avaliaram a rodada</p>
                                ) : (
                                    <p className="text-[10px] text-white/20 italic">Aguardando participações...</p>
                                )}
                            </div>
                        </Card>

                        <Card className="bg-white/[0.03] border-white/5 rounded-[2rem] p-6 shadow-lg border-none">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Confirmados</h3>
                                <Badge variant="outline" className="text-primary border-primary/20 text-[9px] font-black">{match.confirmedPlayers?.length || 0}</Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {match.confirmedPlayers?.map((name: string, i: number) => (
                                    <div key={i} className="group flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-primary/20 transition-all">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="size-1.5 rounded-full bg-primary shadow-[0_0_5px_#eaff00]" />
                                            <span className="text-[10px] font-bold text-white/80 uppercase truncate text-left">{name}</span>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => editPlayerName(name)} className="p-1.5 text-white/30 hover:text-primary transition-colors"><Pencil className="size-3" /></button>
                                                <button onClick={() => removePlayerFromMatch(name)} className="p-1.5 text-white/30 hover:text-red-500 transition-colors"><UserMinus className="size-3" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>

            {user && nomeLista && (
                <MatchRatingModal
                    isOpen={isRatingModalOpen}
                    onClose={() => setIsRatingModalOpen(false)}
                    match={match}
                    currentUser={user}
                    nomeLista={nomeLista}
                    groupId={groupId}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] shadow-3xl outline-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white uppercase font-black italic text-xl tracking-tighter">
                            Excluir Rodada?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[10px] uppercase font-bold tracking-widest leading-relaxed">
                            {match.status === "finished"
                                ? "Esta rodada já foi finalizada. Ao excluir, as notas dos jogadores retornarão exatamente ao que eram antes desta votação. Esta ação é irreversível."
                                : "Tem certeza que deseja remover esta rodada? Os dados de convocação serão perdidos."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-4 font-sans">
                        <AlertDialogCancel className="bg-white/5 border-none text-white font-black uppercase text-[10px] italic h-12 rounded-xl">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteMatch}
                            className="bg-red-600 text-white font-black uppercase text-[10px] italic h-12 rounded-xl border-none hover:bg-red-700"
                        >
                            {isProcessing ? <Loader2 className="animate-spin size-4" /> : "Confirmar Exclusão"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}