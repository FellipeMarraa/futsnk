import {useEffect, useState} from "react"
import {
    ArrowLeft,
    Calendar,
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
import {useAuth} from "@/contexts/auth-context"
import {deleteGroup, getGroupById, isUserAdmin} from "@/lib/firebase-services.ts"
import {collection, doc, getDoc, onSnapshot, orderBy, query} from "firebase/firestore"
import {db} from "@/lib/firebase.ts"
import {useToast} from "@/hooks/use-toast"

// UI & Layout
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

// Sub-componentes
import {MatchManager} from "./match-manager"
import {MatchDetail} from "./match-detail"
import {PlayerListManager} from "./player-list-manager"
import {CreateGroupDialog} from "@/components/create-group-dialog"
import {InviteButton} from "@/components/invite-button.tsx"
import {UpgradePlanModal} from "@/components/upgrade-plan.tsx"

// Novas Tabs Componentizadas
import {MatchesTab} from "@/components/tabs/groups/matches-tab"
import {AdminTab} from "@/components/tabs/groups/admin-tab"

interface GroupDetailProps {
    groupId: string
    onBack: () => void
}

const DAYS_MAP: Record<string, string> = {
    "0": "Dom", "1": "Seg", "2": "Ter", "3": "Qua", "4": "Qui", "5": "Sex", "6": "Sáb"
};

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
            <p className="text-xs font-black text-white italic truncate uppercase">{value}</p>
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

    const userIsAdmin = group ? isUserAdmin(group, user) : false;
    const isGroupPro = (group?.isPro && ownerData?.isPro) || isSuperAdmin;
    const latestMatchPlayers = matches.length > 0 ? matches[0].confirmedPlayers || [] : [];

    useEffect(() => {
        if (!groupId) return;
        const q = query(collection(db, "groups", groupId, "matches"), orderBy("date", "desc"), orderBy("createdAt", "desc"));
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
            setLoading(true);
            setError(null);
            const data = await getGroupById(groupId) as any;
            if (!data) { setError("Grupo não encontrado"); return; }
            setGroup(data);
            if (data.ownerId) {
                const ownerSnap = await getDoc(doc(db, "users", data.ownerId));
                if (ownerSnap.exists()) { setOwnerData(ownerSnap.data()); }
            }
        } catch (err) { setError("Erro ao carregar dados"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData() }, [groupId])

    const handleDeleteGroup = async () => {
        try {
            await deleteGroup(groupId)
            toast({ title: "Clube removido" })
            onBack()
        } catch (error) { toast({ variant: "destructive", title: "Erro ao excluir" }) }
    }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Sincronizando...</p>
        </div>
    )

    if (error || !group) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <p className="text-red-500 font-bold mb-4">{error}</p>
            <Button onClick={onBack} variant="outline">Voltar</Button>
        </div>
    )

    if (selectedMatch) {
        return (
            <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto">
                <MatchDetail groupId={groupId} match={selectedMatch} isAdmin={userIsAdmin} onBack={() => setSelectedMatch(null)} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col w-full overflow-x-hidden font-sans">
            {isSuperAdmin && (
                <div className="bg-primary/10 border-b border-primary/20 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500">
                    <ShieldCheck className="size-3 text-primary" />
                    <span className="text-[8px] font-black uppercase italic text-primary tracking-[0.2em]">Modo Overseer Ativo • Acesso Total</span>
                </div>
            )}

            <header className={`sticky top-0 z-40 backdrop-blur-md border-b border-white/5 transition-all ${isGroupPro ? 'bg-primary/[0.03]' : 'bg-background/60'}`}>
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full shrink-0 outline-none"><ArrowLeft className="size-5 text-white" /></button>
                        <div className="min-w-0 flex items-center gap-1.5">
                            <div className="min-w-0">
                                <h1 className="text-sm sm:text-lg font-black italic uppercase tracking-tighter text-white leading-none flex items-center gap-2">
                                    <span className="truncate">{group.name}</span>
                                    {isGroupPro && <Zap className="size-3 text-primary fill-primary shrink-0" />}
                                </h1>
                                <p className="text-[7px] sm:text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1 truncate">
                                    {isGroupPro ? <><Crown className="size-2 inline mr-1" /> Clube Elite</> : "Status: Ativo"}
                                </p>
                            </div>
                            {userIsAdmin && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1 text-white/20 hover:text-white shrink-0 outline-none"><Settings2 className="size-3.5" /></button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-[#1a1a1e] border-white/10 text-white p-1 rounded-xl shadow-2xl">
                                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="text-[10px] font-bold uppercase italic py-2 cursor-pointer gap-2"><Pencil className="size-3 text-primary" /> Editar Clube</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-[10px] font-bold uppercase italic py-2 cursor-pointer gap-2 text-red-400"><Trash2 className="size-3" /> Excluir Clube</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <InviteButton groupId={groupId} groupName={group.name} />
                        <Button onClick={() => setIsMatchModalOpen(true)} className="bg-primary hover:bg-primary/90 text-black font-black text-[9px] uppercase italic h-8 sm:h-9 px-2 sm:px-4 rounded-lg shadow-lg">
                            <Plus className="size-3 sm:mr-1 stroke-[3px]" /><span className="hidden sm:inline">Agendar</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <InfoCard label="Agenda" value={`${DAYS_MAP[group.day]} às ${group.time}`} icon={Calendar} />
                    <InfoCard label="Local" value={group.location || "Arena"} icon={MapPin} />
                    <InfoCard label="Quadra" value={`R$ ${group.courtValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={CircleDollarSign} variant="primary" />
                    <InfoCard label="Caixa" value={`R$ ${group.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Wallet} variant="success" />
                </div>

                <Tabs defaultValue="matches" className="w-full block">
                    <TabsList className={`grid w-full ${userIsAdmin ? 'grid-cols-3' : 'grid-cols-2'} h-11 bg-white/5 border border-white/10 p-1 rounded-xl mb-6`}>
                        <TabsTrigger value="matches" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg outline-none"><Trophy className="size-3.5" /> Rodadas</TabsTrigger>
                        <TabsTrigger value="players" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg outline-none"><Users className="size-3.5" /> Níveis</TabsTrigger>
                        {userIsAdmin && (
                            <TabsTrigger value="admin" className="gap-2 font-black italic text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg outline-none"><Fingerprint className="size-3.5" /> Gestão</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="matches" className="w-full block m-0 outline-none space-y-4">
                        <MatchesTab
                            matches={matches} groupTime={group.time} isGroupPro={isGroupPro}
                            userIsAdmin={userIsAdmin} isPro={isPro}
                            onSelectMatch={setSelectedMatch} onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
                        />
                    </TabsContent>

                    <TabsContent value="players" className="w-full block m-0 outline-none">
                        <PlayerListManager groupId={groupId} currentMatchPlayers={latestMatchPlayers} />
                    </TabsContent>

                    <TabsContent value="admin" className="w-full block m-0 outline-none">
                        <AdminTab
                            groupId={groupId} isPro={isPro} isGroupPro={isGroupPro}
                            onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
                        />
                    </TabsContent>
                </Tabs>
            </main>

            <UpgradePlanModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
            <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
                <DialogContent className="w-[92%] max-w-[425px] bg-[#1a1a1e] border-white/5 rounded-[2.5rem] shadow-3xl text-white px-8 py-10 outline-none">
                    <DialogHeader className="space-y-3 mb-6">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">Agendar <span className="text-primary opacity-90">Rodada</span></DialogTitle>
                        <DialogDescription className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">Defina a data oficial para a próxima convocação no clube.</DialogDescription>
                    </DialogHeader>
                    <MatchManager groupId={groupId} onCreated={() => setIsMatchModalOpen(false)} onCancel={() => setIsMatchModalOpen(false)} />
                </DialogContent>
            </Dialog>

            <CreateGroupDialog isOpen={isEditDialogOpen} groupToEdit={group} onClose={() => setIsEditDialogOpen(false)} onSuccess={() => { setIsEditDialogOpen(false); fetchData(); }} />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#1a1a1e] border-white/10 rounded-xl w-[92%] p-6 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black italic uppercase text-white">Eliminar Clube?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Esta ação é irreversível.</AlertDialogDescription>
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