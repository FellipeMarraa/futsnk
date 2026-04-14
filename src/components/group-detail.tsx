import {useEffect, useState} from "react"
import {
    ArrowLeft,
    Calendar,
    ChevronRight,
    CircleDollarSign,
    Crown,
    Fingerprint,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    Settings2,
    ShieldCheck,
    Trash2,
    Trophy,
    Users,
    Wallet,
    Zap
} from "lucide-react"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
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
import {collection, doc, getDoc, onSnapshot, orderBy, query} from "firebase/firestore"
import {db} from "@/lib/firebase.ts"
import {MatchManager} from "./match-manager"
import {MatchDetail} from "./match-detail"
import {PlayerListManager} from "./player-list-manager"
import {AdminPlayerManager} from "./admin-player-manager"
import {CreateGroupDialog} from "@/components/create-group-dialog"
import {useToast} from "@/hooks/use-toast"
import {InviteButton} from "@/components/invite-button.tsx"
import {UpgradePlanModal} from "@/components/upgrade-plan.tsx";

interface GroupDetailProps {
    groupId: string
    onBack: () => void
}

const DAYS_MAP: Record<string, string> = {
    "0": "Dom", "1": "Seg", "2": "Ter", "3": "Qua", "4": "Qui", "5": "Sex", "6": "Sáb"
};

/**
 * COMPONENTE AUXILIAR: Card de Estatística/Info
 */
function InfoCard({ label, value, icon: Icon, variant = "default" }: any) {
    const variants: any = {
        default: "bg-white/5 border-white/5 text-white/40",
        primary: "bg-primary/10 border-primary/20 text-primary/80",
        success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500/80"
    };

    return (
        <div className={`${variants[variant]} border p-3 rounded-xl shadow-inner transition-all hover:scale-[1.02]`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="size-3 opacity-60" />
                <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-xs font-black text-white italic truncate uppercase">
                {value}
            </p>
        </div>
    );
}

export function GroupDetail({ groupId, onBack }: GroupDetailProps) {
    const { user, isSuperAdmin, isPro } = useAuth()
    const { toast } = useToast()
    const [group, setGroup] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [matches, setMatches] = useState<any[]>([])
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [ownerData, setOwnerData] = useState<any>(null);

    // Permissão unificada (Dono ou Admin Supremo)
    const userIsAdmin = isUserAdmin(group, user);
    const isGroupPro = (group?.isPro && ownerData?.isPro) || isSuperAdmin;

    const latestMatchPlayers = matches.length > 0 ? matches[0].confirmedPlayers || [] : [];

    useEffect(() => {
        if (!groupId) return;

        const q = query(
            collection(db, "groups", groupId, "matches"),
            orderBy("date", "desc"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
            const sorted = [...docs].sort((a: any, b: any) => {
                if (a.date !== b.date) return 0;
                const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || Date.now();
                const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || Date.now();
                return timeB - timeA;
            });
            setMatches(sorted);
        });
        return () => unsubscribe();
    }, [groupId]);

    const fetchData = async () => {
        try {
            setLoading(true)
            const data = await getGroupById(groupId) as any;
            if (!data) {
                setError("Grupo não encontrado")
            } else {
                setGroup(data)

                if (data.ownerId) {
                    const ownerSnap = await getDoc(doc(db, "users", data.ownerId));
                    if (ownerSnap.exists()) {
                        setOwnerData(ownerSnap.data());
                    }
                }
            }
        } catch (err) {
            setError("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
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

    if (error || !group) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <p className="text-red-500 font-bold mb-4">{error || "Erro ao carregar grupo"}</p>
            <Button onClick={onBack} variant="outline">Voltar</Button>
        </div>
    )

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
        <div className="min-h-screen bg-background text-foreground flex flex-col w-full overflow-x-hidden font-sans">

            {/* BARRA DE MODO OVERSEER */}
            {isSuperAdmin && (
                <div className="bg-primary/10 border-b border-primary/20 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500">
                    <ShieldCheck className="size-3 text-primary" />
                    <span className="text-[8px] font-black uppercase italic text-primary tracking-[0.2em]">
                        Modo Overseer Ativo • Acesso Total
                    </span>
                </div>
            )}

            <header className={`sticky top-0 z-40 backdrop-blur-md border-b border-white/5 transition-all ${isGroupPro ? 'bg-primary/[0.03]' : 'bg-background/60'}`}>
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0 outline-none">
                            <ArrowLeft className="size-5 text-white" />
                        </button>
                        <div className="min-w-0 flex items-center gap-2">
                            <div>
                                <h1 className="text-lg font-black italic uppercase tracking-tighter truncate text-white leading-none flex items-center gap-2">
                                    {group.name}
                                    {isGroupPro && <Zap className="size-3 text-primary fill-primary shadow-[0_0_10px_rgba(234,255,0,1)]" />}
                                </h1>
                                <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                                    {isGroupPro ? (
                                        <><Crown className="size-2" /> Clube Elite</>
                                    ) : (
                                        "Status: Ativo"
                                    )}
                                </p>
                            </div>

                            {userIsAdmin && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1 text-white/20 hover:text-white transition-colors outline-none">
                                            <Settings2 className="size-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-[#1a1a1e] border-white/10 text-white p-1 rounded-xl shadow-2xl">
                                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="text-[10px] font-bold uppercase italic py-2 cursor-pointer gap-2">
                                            <Pencil className="size-3 text-primary" /> Editar Clube
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-[10px] font-bold uppercase italic py-2 cursor-pointer gap-2 text-red-400">
                                            <Trash2 className="size-3" /> Excluir Clube
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {userIsAdmin && (
                        <div className="flex items-center gap-2">
                            <InviteButton groupId={groupId} groupName={group.name} />
                            <Button
                                onClick={() => setIsMatchModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-black font-black text-[9px] uppercase italic h-9 px-4 rounded-lg shadow-lg"
                            >
                                <Plus className="size-3.5 mr-1 stroke-[3px]" /> Agendar
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* GRID DE INFORMAÇÕES COMPONENTIZADA */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <InfoCard
                        label="Agenda"
                        value={`${DAYS_MAP[group.day]} às ${group.time}`}
                        icon={Calendar}
                    />
                    <InfoCard
                        label="Local"
                        value={group.location || "Arena"}
                        icon={MapPin}
                    />
                    <InfoCard
                        label="Quadra"
                        value={`R$ ${group.courtValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        icon={CircleDollarSign}
                        variant="primary"
                    />
                    <InfoCard
                        label="Caixa"
                        value={`R$ ${group.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        icon={Wallet}
                        variant="success"
                    />
                </div>

                <Tabs defaultValue="matches" className="w-full block">
                    <TabsList className={`grid w-full ${userIsAdmin ? 'grid-cols-3' : 'grid-cols-2'} h-11 bg-white/5 border border-white/10 p-1 rounded-xl mb-6`}>
                        <TabsTrigger value="matches" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all outline-none">
                            <Trophy className="size-3.5" /> Rodadas
                        </TabsTrigger>
                        <TabsTrigger value="players" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all outline-none">
                            <Users className="size-3.5" /> Níveis
                        </TabsTrigger>
                        {userIsAdmin && (
                            <TabsTrigger value="admin" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all outline-none">
                                <Fingerprint className="size-3.5" /> Gestão
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="matches" className="w-full block m-0 outline-none space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Histórico da Temporada</h3>
                            {!isPro && userIsAdmin && (
                                <button
                                    onClick={() => setIsUpgradeModalOpen(true)}
                                    className="text-[8px] font-black text-primary uppercase animate-pulse"
                                >
                                    Ver Estatísticas PRO
                                </button>
                            )}
                        </div>

                        {matches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                <Calendar className="size-10 text-white/10 mb-2" />
                                <p className="text-[10px] font-bold text-white/20 uppercase">Nenhuma rodada agendada.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 w-full">
                                {matches.map((match, idx) => {
                                    const votingOpen = isVotingOpen(match.date, group.time);
                                    const matchNumber = matches.length - idx;

                                    const getStatusConfig = (status: string) => {
                                        switch (status) {
                                            case 'finished': return { label: 'Encerrada', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
                                            case 'voting_open': return { label: 'Votação Aberta', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
                                            case 'drawn': return { label: 'Sorteada', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
                                            default: return { label: 'Iniciada', color: 'bg-primary/10 text-primary border-primary/20' };
                                        }
                                    };

                                    const matchStatus = getStatusConfig(match.status);

                                    return (
                                        <Card
                                            key={match.id}
                                            className={`w-full cursor-pointer border-none bg-white/[0.03] active:bg-white/[0.08] transition-all rounded-[1.5rem] group overflow-hidden shadow-lg ${isGroupPro ? 'hover:bg-primary/[0.05]' : ''}`}
                                            onClick={() => setSelectedMatch(match)}
                                        >
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`size-11 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center shrink-0 shadow-inner text-white ${isGroupPro ? 'border-primary/20' : 'border-white/5'}`}>
                                                        <span className="text-[10px] font-black text-primary leading-none uppercase">
                                                            {new Date(match.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                                                        </span>
                                                        <span className="text-[7px] text-white/40 uppercase font-bold">
                                                            {new Date(match.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black italic text-sm text-white uppercase tracking-tight truncate">
                                                                Rodada #{matchNumber}
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
                                                    <Badge className={`${matchStatus.color} border text-[8px] font-black uppercase italic tracking-tighter rounded px-2`}>
                                                        {matchStatus.label}
                                                    </Badge>
                                                    <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="players" className="w-full block m-0 outline-none">
                        <PlayerListManager
                            groupId={groupId}
                            currentMatchPlayers={latestMatchPlayers}
                        />
                    </TabsContent>

                    {userIsAdmin && (
                        <TabsContent value="admin" className="w-full block m-0 outline-none">
                            {/* TRAVA DE GESTÃO PRO */}
                            {isPro || isGroupPro ? (
                                <AdminPlayerManager groupId={groupId} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/5 rounded-3xl text-center px-8">
                                    <Crown className="size-10 text-primary mb-4 opacity-50" />
                                    <h3 className="text-sm font-black italic uppercase text-white mb-2">Painel de Gestão Avançada</h3>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest max-w-[200px] leading-relaxed mb-6">
                                        Assine o PRO para gerenciar atletas, editar OVR e equilibrar seu racha.
                                    </p>
                                    <Button
                                        onClick={() => setIsUpgradeModalOpen(true)}
                                        className="bg-primary text-black font-black text-[9px] uppercase italic rounded-full h-10 px-8"
                                    >
                                        Fazer Upgrade
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            <UpgradePlanModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
            />

            {/* DIALOGS E MODALS FINAIS */}
            <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
                <DialogContent className="w-[92%] max-w-[425px] bg-[#1a1a1e] border-white/5 rounded-[2.5rem] shadow-3xl text-white px-8 py-10 outline-none">
                    <DialogHeader className="space-y-3 mb-6 text-white">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                            Agendar <span className="text-primary opacity-90">Rodada</span>
                        </DialogTitle>
                        <DialogDescription className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] leading-relaxed">
                            Defina a data oficial para a próxima convocação no clube.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full">
                        <MatchManager
                            groupId={groupId}
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
                        <AlertDialogCancel className="flex-1 bg-white/5 border-none text-white text-[9px] font-black h-10 hover:bg-white/10 transition-colors">Abortar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="flex-1 bg-red-600 text-white text-[9px] font-black h-10 hover:bg-red-700 transition-colors">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}