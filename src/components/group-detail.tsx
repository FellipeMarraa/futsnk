import {useEffect, useState} from "react"
import {
    ArrowLeft,
    Calendar,
    ChevronRight,
    CircleDollarSign,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    Settings2,
    Trash2,
    Trophy,
    Users,
    Wallet
} from "lucide-react"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu"
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
import {useAuth} from "@/contexts/auth-context"
import {deleteGroup, getGroupById, isUserAdmin} from "@/lib/firebase-services.ts"
import {collection, onSnapshot, orderBy, query} from "firebase/firestore"
import {db} from "@/lib/firebase.ts"
import {MatchManager} from "./match-manager"
import {MatchDetail} from "./match-detail"
import {PlayerListManager} from "./player-list-manager"
import {CreateGroupDialog} from "@/components/create-group-dialog"
import {useToast} from "@/hooks/use-toast"

interface GroupDetailProps {
    groupId: string
    onBack: () => void
}

const DAYS_MAP: Record<string, string> = {
    "0": "Dom", "1": "Seg", "2": "Ter", "3": "Qua", "4": "Qui", "5": "Sex", "6": "Sáb"
};

export function GroupDetail({ groupId, onBack }: GroupDetailProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [group, setGroup] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [matches, setMatches] = useState<any[]>([])
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    const latestMatchPlayers = matches.length > 0 ? matches[0].confirmedPlayers || [] : [];

    useEffect(() => {
        if (!groupId) return;
        const q = query(collection(db, "groups", groupId, "matches"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [groupId]);

    const fetchData = async () => {
        try {
            setLoading(true)
            const data = await getGroupById(groupId)
            if (!data) setError("Grupo não encontrado")
            else setGroup(data)
        } catch (err) { setError("Erro ao carregar dados") } finally { setLoading(false) }
    }

    useEffect(() => {
        fetchData()
    }, [groupId])

    const isVotingOpen = (matchDate: string, matchTime: string) => {
        if (!matchDate || !matchTime) return false;
        const [hours, minutes] = matchTime.split(':').map(Number);
        const gameTime = new Date(matchDate);
        gameTime.setHours(hours + 1, minutes, 0);
        return new Date() >= gameTime;
    };

    const handleDeleteGroup = async () => {
        try {
            await deleteGroup(groupId)
            toast({ title: "Clube removido", description: "O clube e todos os dados foram excluídos." })
            onBack()
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao excluir", description: "Não foi possível remover o clube." })
        }
    }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Sincronizando...</p>
        </div>
    )

    const userIsAdmin = user?.email ? isUserAdmin(group, user.email) : false

    if (selectedMatch) {
        return (
            <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto">
                <MatchDetail
                    groupId={groupId}
                    match={selectedMatch}
                    isAdmin={userIsAdmin}
                    onBack={() => setSelectedMatch(null)}
                />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col w-full overflow-x-hidden font-sans selection:bg-primary/20">
            <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-md border-b border-white/5">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0 outline-none">
                            <ArrowLeft className="size-5 text-white" />
                        </button>
                        <div className="min-w-0 flex items-center gap-2">
                            <div>
                                <h1 className="text-lg font-black italic uppercase tracking-tighter truncate text-white leading-none">
                                    {group.name}
                                </h1>
                                <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Status: Ativo</p>
                            </div>

                            {userIsAdmin && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1 text-white/20 hover:text-white transition-colors">
                                            <Settings2 className="size-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-[#1a1a1e] border-white/10 text-white p-1 rounded-xl shadow-2xl">
                                        <DropdownMenuItem
                                            onClick={() => setIsEditDialogOpen(true)}
                                            className="text-[10px] font-bold uppercase italic py-2 cursor-pointer gap-2"
                                        >
                                            <Pencil className="size-3 text-primary" /> Editar Clube
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="text-[10px] font-bold uppercase italic py-2 cursor-pointer gap-2 text-red-400"
                                        >
                                            <Trash2 className="size-3" /> Excluir Clube
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                    {userIsAdmin && (
                        <Button
                            onClick={() => setIsMatchModalOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-black font-black text-[9px] uppercase italic h-9 px-4 rounded-lg shadow-lg"
                        >
                            <Plus className="size-3.5 mr-1 stroke-[3px]" /> Agendar
                        </Button>
                    )}
                </div>
            </header>

            <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="size-3 text-primary opacity-60" />
                            <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Agenda</span>
                        </div>
                        <p className="text-xs font-bold text-white uppercase italic truncate">{DAYS_MAP[group.day]} às {group.time}</p>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin className="size-3 text-primary opacity-60" />
                            <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Local</span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{group.location || "Arena"}</p>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                            <CircleDollarSign className="size-3 text-primary" />
                            <span className="text-[8px] font-black uppercase text-primary/80 tracking-widest">Quadra</span>
                        </div>
                        <p className="text-xs font-black text-white italic truncate">
                            R$ {group.courtValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                        </p>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="size-3 text-emerald-500" />
                            <span className="text-[8px] font-black uppercase text-emerald-500/80 tracking-widest">Caixa</span>
                        </div>
                        <p className="text-xs font-black text-white italic truncate">
                            R$ {group.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="matches" className="w-full block">
                    <TabsList className="grid w-full grid-cols-2 h-11 bg-white/5 border border-white/10 p-1 rounded-xl mb-6">
                        <TabsTrigger value="matches" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all outline-none">
                            <Trophy className="size-3.5" /> Rodadas
                        </TabsTrigger>
                        <TabsTrigger value="players" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all outline-none">
                            <Users className="size-3.5" /> Níveis
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="matches" className="w-full block m-0 outline-none space-y-4">
                        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-1">Histórico da Temporada</h3>

                        {matches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                <Calendar className="size-10 text-white/10 mb-2" />
                                <p className="text-[10px] font-bold text-white/20 uppercase">Nenhuma rodada.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 w-full">
                                {matches.map((match, idx) => {
                                    const votingOpen = isVotingOpen(match.date, group.time);
                                    return (
                                        <Card
                                            key={match.id}
                                            className="w-full cursor-pointer border-none bg-white/[0.03] active:bg-white/[0.08] transition-all rounded-[1.5rem] group overflow-hidden shadow-lg selection:bg-transparent"
                                            onClick={() => setSelectedMatch(match)}
                                        >
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="size-11 rounded-xl bg-zinc-900 border border-white/5 flex flex-col items-center justify-center shrink-0 shadow-inner">
                                                        <span className="text-[10px] font-black text-primary leading-none uppercase">
                                                            {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' })}
                                                        </span>
                                                        <span className="text-[7px] text-white/40 uppercase font-bold">
                                                            {new Date(match.date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black italic text-sm text-white uppercase tracking-tight truncate">
                                                                Rodada #{matches.length - idx}
                                                            </p>
                                                            {match.status === 'drawn' && votingOpen && (
                                                                <div className="size-2 bg-amber-500 rounded-full animate-pulse shrink-0" />
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-black text-white/40 uppercase flex items-center gap-1.5 mt-0.5">
                                                            <Users className="size-3 text-primary" /> {match.confirmedPlayers?.length || 0} Atletas
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {match.status === 'open' ? (
                                                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase italic tracking-tighter rounded">Inscrições</Badge>
                                                    ) : (
                                                        <Badge className="bg-white/5 text-white/40 border border-white/10 text-[8px] font-black uppercase italic tracking-tighter rounded">Encerrado</Badge>
                                                    )}
                                                    <ChevronRight className="size-4 text-primary group-active:translate-x-1 transition-transform" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="players" className="w-full block m-0 outline-none">
                        <PlayerListManager
                            groupId={groupId}
                            isAdmin={userIsAdmin}
                            currentMatchPlayers={latestMatchPlayers}
                        />
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
                <DialogContent className="w-[92%] max-w-[425px] bg-[#1a1a1e] border-white/5 rounded-[2.5rem] shadow-3xl text-white px-8 py-10 outline-none">
                    <DialogHeader className="space-y-3 mb-6">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                            Agendar <span className="text-primary opacity-90">Rodada</span>
                        </DialogTitle>
                        <DialogDescription className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] leading-relaxed">
                            Defina a data oficial para a próxima convocação no clube.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full">
                        <MatchManager
                            groupId={groupId}
                            isAdmin={userIsAdmin}
                            onCreated={() => setIsMatchModalOpen(false)}
                            onCancel={() => setIsMatchModalOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <CreateGroupDialog
                isOpen={isEditDialogOpen}
                groupToEdit={group}
                onClose={() => setIsEditDialogOpen(false)}
                onSuccess={() => {
                    setIsEditDialogOpen(false);
                    fetchData();
                }}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#1a1a1e] border-white/10 rounded-xl w-[92%] p-6 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black italic uppercase text-white">Eliminar Clube?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            Esta ação é irreversível. O clube, rodadas e níveis dos atletas serão apagados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex-row gap-2">
                        <AlertDialogCancel className="flex-1 bg-white/5 border-none text-white text-[9px] font-black h-10">Abortar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="flex-1 bg-red-600 text-white text-[9px] font-black h-10">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}