import { useEffect, useState } from "react"
import { Users, Calendar, Clock, ChevronRight, LogOut, Loader2, Plus, Pencil, Trash2, Trophy, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/lib/firebase"
import { CreateGroupDialog } from "@/components/create-group-dialog"
import { getUserGroups, isUserAdmin, deleteGroup } from "@/lib/firebase-services.ts";
import { useToast } from "@/hooks/use-toast"

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

    const fetchGroups = async () => {
        if (!user?.email) { setLoading(false); return; }
        try {
            setLoading(true)
            const userGroups = await getUserGroups(user.email)
            setGroups(userGroups)
        } catch (error) { console.error(error) } finally { setLoading(false) }
    }

    useEffect(() => { fetchGroups() }, [user?.email])

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
                            <DropdownMenuTrigger className="outline-none">
                                <Avatar className="size-8 border border-primary/20">
                                    <AvatarImage src={user?.photoURL || ""} />
                                    <AvatarFallback className="text-[10px] bg-zinc-800">FC</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-white/10 text-white p-1 w-44 rounded-xl shadow-2xl">
                                <DropdownMenuItem onClick={() => auth.signOut()} className="text-red-400 font-bold text-[10px] uppercase italic py-2 cursor-pointer">
                                    <LogOut className="size-3.5 mr-2" /> Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 flex flex-col">
                <div className="mb-6 shrink-0">
                    <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-tight">
                        CENTRAL DE <span className="text-primary">CLUBES</span>
                    </h1>
                    <p className="text-primary/40 font-bold text-[8px] uppercase tracking-[0.4em]">Temporada Ativa 2026</p>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-10">
                        <Loader2 className="size-8 animate-spin text-primary opacity-50" />
                    </div>
                ) : groups.length === 0 ? (
                    /* Mensagem Centralizada para falta de grupos */
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-sm w-full">
                            <AlertCircle className="size-12 text-primary mx-auto mb-4 opacity-80" />
                            <h2 className="text-lg font-black italic uppercase tracking-tighter text-white mb-2">
                                Acesso Restrito
                            </h2>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                                Você ainda não faz parte de nenhum clube. <br/>
                                <span className="text-primary/60">Entre em contato com seu administrador para ser adicionado.</span>
                            </p>
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">
                                    Futmatch • Season 2026
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {groups.map((group) => {
                            const userIsAdmin = user?.email ? isUserAdmin(group, user.email) : false
                            return (
                                <Card
                                    key={group.id}
                                    className="relative border-primary/20 bg-white/[0.05] rounded-xl overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-transform"
                                    onClick={() => onSelectGroup(group.id)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-100" />

                                    <CardContent className="p-5 relative z-10">
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="size-10 bg-zinc-900/80 rounded-lg flex items-center justify-center border border-primary/30 shadow-[0_0_10px_rgba(234,255,0,0.1)]">
                                                <Users className="size-5 text-primary" />
                                            </div>
                                            {userIsAdmin && (
                                                <div className="flex gap-1.5">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-white/5 text-white/70" onClick={(e) => { e.stopPropagation(); setGroupToEdit(group); setIsCreateModalOpen(true); }}><Pencil className="size-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-red-500/10 text-red-400" onClick={(e) => { e.stopPropagation(); setGroupIdToDelete(group.id); setIsDeleteDialogOpen(true); }}><Trash2 className="size-3.5" /></Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black italic tracking-tighter uppercase text-primary truncate">
                                                    {group.name}
                                                </h3>
                                                {userIsAdmin && <Badge className="bg-primary text-black font-black text-[7px] uppercase px-1.5 h-4 rounded-xs">FOUNDER</Badge>}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Calendar className="size-3 text-primary" /> {DAYS_MAP[group.day] || group.day}</span>
                                                <span className="flex items-center gap-1.5"><Clock className="size-3 text-primary" /> {group.time}</span>
                                                <span className="flex items-center gap-1.5"><Users className="size-3 text-primary" /> {group.membersEmails?.length || 0}</span>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                                            <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Acessar Clube</span>
                                            <ChevronRight className="size-4 text-primary" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-white/10 rounded-xl w-[92%] p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black italic uppercase text-white">Eliminar Clube?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Ação irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex-row gap-2">
                        <AlertDialogCancel className="flex-1 bg-white/5 border-none text-white text-[9px] font-black h-10">Abortar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (groupIdToDelete) {
                                    deleteGroup(groupIdToDelete)
                                        .then(() => {
                                            fetchGroups(); // Recarrega a lista
                                            setIsDeleteDialogOpen(false);
                                            toast({ title: "CLUBE REMOVIDO", description: "Todos os dados foram apagados." });
                                        })
                                        .catch(() => {
                                            toast({ variant: "destructive", title: "ERRO AO DELETAR" });
                                        });
                                }
                            }}
                            className="flex-1 bg-red-600 text-white text-[9px] font-black h-10"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CreateGroupDialog isOpen={isCreateModalOpen} groupToEdit={groupToEdit} onClose={() => { setIsCreateModalOpen(false); setGroupToEdit(null); }} onSuccess={fetchGroups} />
        </div>
    )
}