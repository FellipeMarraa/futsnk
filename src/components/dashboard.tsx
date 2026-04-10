import {useEffect, useState} from "react"
import {
    AlertCircle,
    Calendar,
    ChevronRight,
    Clock,
    Loader2,
    LogOut,
    Pencil,
    Plus,
    Star,
    Trash2,
    Trophy,
    Users
} from "lucide-react"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {useAuth} from "@/contexts/auth-context"
import {auth, db} from "@/lib/firebase"
import {doc, updateDoc} from "firebase/firestore"
import {CreateGroupDialog} from "@/components/create-group-dialog"
import {deleteGroup, getUserGroups, isUserAdmin} from "@/lib/firebase-services.ts";
import {useToast} from "@/hooks/use-toast"
import {PlayerProfileDialog} from "@/components/player-profile-dialog.tsx";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar.tsx";

const DAYS_MAP: Record<string, string> = { "0": "Dom", "1": "Seg", "2": "Ter", "3": "Qua", "4": "Qui", "5": "Sex", "6": "Sáb" };

export function Dashboard({ onSelectGroup }: { onSelectGroup: (groupId: string) => void }) {
    const { user, isAdmin } = useAuth()
    const { toast } = useToast()
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [groupToEdit, setGroupToEdit] = useState<any>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [groupIdToDelete, setGroupIdToDelete] = useState<string | null>(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const [tempNome, setTempNome] = useState("");
    const [isSavingName, setIsSavingName] = useState(false)

    const fetchGroups = async () => {
        if (!user?.email) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true)
            const userGroups = await getUserGroups(user.email)
            setGroups(userGroups)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Busca grupos apenas se o usuário estiver autenticado e com e-mail disponível
    useEffect(() => {
        if (user?.email) {
            fetchGroups()
        }
    }, [user?.email]);

    // Sincroniza o nome de exibição do Google com o campo de input
    useEffect(() => {
        if (user?.displayName && !tempNome) {
            setTempNome(user.displayName);
        }
    }, [user]);

    const handleSaveName = async () => {
        if (!tempNome.trim() || !user?.uid) return;

        setIsSavingName(true);
        try {
            const userRef = doc(db, 'users', user.uid);

            await updateDoc(userRef, {
                nomeLista: tempNome.trim(),
                displayName: tempNome.trim(),
                lastUpdated: new Date()
            });

            toast({ title: "PERFIL VINCULADO" });
        } catch (e) {
            console.error("Erro ao atualizar nomeLista:", e);
            toast({ variant: "destructive", title: "ERRO AO SALVAR" });
        } finally {
            setIsSavingName(false);
        }
    };

    if (user && !user.nomeLista) {
        return (
            <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-primary/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] size-[400px] bg-blue-500/10 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 w-full max-w-[400px] animate-in zoom-in duration-500">
                    <div className="fc-glass p-8 rounded-[2.5rem] fc-card-glow text-center border border-primary/20">
                        <Trophy className="size-12 text-primary mx-auto mb-6 drop-shadow-[0_0_15px_rgba(234,255,0,0.4)]" />
                        <h2 className="text-2xl font-black italic text-white uppercase leading-tight mb-2">
                            Quase lá, craque!
                        </h2>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-8">
                            Como está seu nome (exatamente) na lista do whatsapp?
                        </p>

                        <div className="space-y-6">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 px-6 text-white font-bold text-center focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-700"
                                value={tempNome}
                                onChange={(e) => setTempNome(e.target.value)}
                                placeholder="Seu apelido ou nome..."
                                autoFocus
                            />

                            <Button
                                onClick={handleSaveName}
                                disabled={isSavingName || !tempNome.trim()}
                                className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black italic uppercase rounded-2xl shadow-[0_0_30px_rgba(234,255,0,0.2)]"
                            >
                                {isSavingName ? <Loader2 className="animate-spin size-6" /> : "Começar Temporada"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Se o usuário já tem nome, mas os dados do dashboard ainda estão sendo buscados
    if (loading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background">
                <Loader2 className="size-8 animate-spin text-primary opacity-50" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col w-full overflow-x-hidden font-sans">
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="size-4 text-primary" />
                        <span className="text-lg font-black italic tracking-tighter uppercase text-white">
                            FUT<span className="text-primary">MATCH</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Button
                                onClick={() => { setGroupToEdit(null); setIsCreateModalOpen(true); }}
                                className="bg-primary text-black font-black text-[9px] uppercase italic h-8 px-3 rounded-md shadow-[0_0_15px_rgba(234,255,0,0.3)]"
                            >
                                <Plus className="size-3 mr-1 stroke-[3px]" /> Novo
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="outline-none"> {/* Usei button asChild para evitar conflitos de ref */}
                                    <Avatar className="size-8 border border-primary/20 hover:opacity-80 transition-opacity">
                                        <AvatarImage src={user?.photoURL || ""} />
                                        <AvatarFallback className="text-[10px] bg-zinc-800">
                                            {user?.nomeLista?.[0] || "FC"}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>

                            {/* O Radix exige que o Content esteja dentro de um Portal ou diretamente no Root */}
                            <DropdownMenuContent align="end" className="bg-[#1a1a1e] border-white/10 text-white p-1 w-44 rounded-xl shadow-2xl z-[100]">
                                <DropdownMenuItem
                                    onClick={() => setIsProfileOpen(true)}
                                    className="font-bold text-[10px] uppercase italic py-2 cursor-pointer hover:bg-white/5 transition-colors focus:bg-white/5 focus:text-white"
                                >
                                    <Star className="size-3.5 mr-2 text-primary fill-primary" /> Meu Perfil
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={() => auth.signOut()}
                                    className="text-red-400 font-bold text-[10px] uppercase italic py-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
                                >
                                    <LogOut className="size-3.5 mr-2" /> Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 flex flex-col">
                <div className="mb-6 shrink-0 text-center sm:text-left">
                    <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-tight">
                        CENTRAL DE <span className="text-primary">CLUBES</span>
                    </h1>
                    <p className="text-primary/40 font-bold text-[8px] uppercase tracking-[0.4em]">Temporada Ativa 2026</p>
                </div>

                {groups.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-sm w-full">
                            <AlertCircle className="size-12 text-primary mx-auto mb-4 opacity-80" />
                            <h2 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
                                Acesso Restrito
                            </h2>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                                Você ainda não faz parte de nenhum clube. <br/>
                                <span className="text-primary/60 text-[10px]">Peça o link de convite ao administrador.</span>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {groups.map((group) => {
                            const userIsAdmin = user?.email ? isUserAdmin(group, user.email) : false
                            return (
                                <Card
                                    key={group.id}
                                    className="group relative border-primary/20 bg-white/[0.05] rounded-xl overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-all cursor-pointer hover:border-primary/40"
                                    onClick={() => onSelectGroup(group.id)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-100 group-hover:opacity-100 transition-opacity" />

                                    <CardContent className="p-5 relative z-10">
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="size-10 bg-zinc-900/80 rounded-lg flex items-center justify-center border border-primary/30 shadow-[0_0_10px_rgba(234,255,0,0.1)]">
                                                <Users className="size-5 text-primary" />
                                            </div>
                                            {userIsAdmin && (
                                                <div className="flex gap-1.5">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-white/5 text-white/70 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setGroupToEdit(group); setIsCreateModalOpen(true); }}><Pencil className="size-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20" onClick={(e) => { e.stopPropagation(); setGroupIdToDelete(group.id); setIsDeleteDialogOpen(true); }}><Trash2 className="size-3.5" /></Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black italic tracking-tighter uppercase text-primary truncate">
                                                    {group.name}
                                                </h3>
                                                {userIsAdmin && <Badge className="bg-primary text-black font-black text-[7px] uppercase px-1.5 h-4 rounded-xs shadow-[0_0_10px_rgba(234,255,0,0.2)]">FOUNDER</Badge>}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Calendar className="size-3 text-primary" /> {DAYS_MAP[group.day] || group.day}</span>
                                                <span className="flex items-center gap-1.5"><Clock className="size-3 text-primary" /> {group.time}</span>
                                                <span className="flex items-center gap-1.5"><Users className="size-3 text-primary" /> {group.membersEmails?.length || 0} Atletas</span>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                                            <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Acessar Clube</span>
                                            <ChevronRight className="size-4 text-primary group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-white/10 rounded-xl w-[92%] max-w-sm p-6 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black italic uppercase text-white">Eliminar Clube?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Esta ação apagará todos os históricos, estatísticas e jogadores deste clube. Esta ação é irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex-row gap-2">
                        <AlertDialogCancel className="flex-1 bg-white/5 border-none text-white text-[9px] font-black h-10">Abortar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (groupIdToDelete) {
                                    deleteGroup(groupIdToDelete)
                                        .then(() => {
                                            fetchGroups();
                                            setIsDeleteDialogOpen(false);
                                            toast({ title: "CLUBE REMOVIDO", description: "Todos os dados foram apagados." });
                                        })
                                        .catch(() => {
                                            toast({ variant: "destructive", title: "ERRO AO DELETAR" });
                                        });
                                }
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black h-10"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <PlayerProfileDialog
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                // Se quiser o perfil global, não passe groupId.
                // Se quiser as notas de um grupo específico, teria que passar o ID ativo.
            />
            <CreateGroupDialog isOpen={isCreateModalOpen} groupToEdit={groupToEdit} onClose={() => { setIsCreateModalOpen(false); setGroupToEdit(null); }} onSuccess={fetchGroups} />
        </div>
    )
}