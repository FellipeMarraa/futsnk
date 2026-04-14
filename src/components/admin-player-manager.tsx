import {useEffect, useState} from "react";
import {db} from "@/lib/firebase";
import {collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc} from "firebase/firestore";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Crown, Lock, Plus, Search, ShieldCheck, Trash2} from "lucide-react";
import {toast} from "@/hooks/use-toast";
import {useAuth} from "@/contexts/auth-context";

interface PlayerMeta {
    id: string;
    nomeLista: string;
    userId?: string;
    aliases?: string[];
    photoURL?: string;
}

export function AdminPlayerManager({ groupId }: { groupId: string }) {
    const { isSuperAdmin, isPro } = useAuth();
    const [players, setPlayers] = useState<PlayerMeta[]>([]);
    const [newAlias, setNewAlias] = useState<{ [key: string]: string }>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [groupIsPro, setGroupIsPro] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. Verificar se o grupo é PRO para liberar para os membros/admin local
    useEffect(() => {
        const checkGroupStatus = async () => {
            const gDoc = await getDoc(doc(db, "groups", groupId));
            if (gDoc.exists()) {
                setGroupIsPro(gDoc.data().isPro || false);
            }
        };
        checkGroupStatus();
    }, [groupId]);

    useEffect(() => {
        const q = query(collection(db, "groups", groupId, "players_meta"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerMeta));
            setPlayers(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [groupId]);

    const addAlias = async (player: PlayerMeta) => {
        const aliasValue = newAlias[player.id]?.toLowerCase().trim();
        if (!aliasValue) return;

        const currentAliases = player.aliases ?? [];
        if (currentAliases.includes(aliasValue)) {
            toast({ title: "Erro", description: "Este apelido já existe!", variant: "destructive" });
            return;
        }

        const playerRef = doc(db, "groups", groupId, "players_meta", player.id);
        await setDoc(playerRef, {
            aliases: [...currentAliases, aliasValue],
            lastUpdated: serverTimestamp()
        }, { merge: true });

        setNewAlias({ ...newAlias, [player.id]: "" });
        toast({ title: "Sucesso", description: `Apelido "${aliasValue}" vinculado.` });
    };

    const removeAlias = async (player: PlayerMeta, aliasToRemove: string) => {
        const playerRef = doc(db, "groups", groupId, "players_meta", player.id);
        const currentAliases = player.aliases ?? [];
        const updatedAliases = currentAliases.filter(a => a !== aliasToRemove);

        await setDoc(playerRef, { aliases: updatedAliases }, { merge: true });
        toast({ title: "Removido", description: "Apelido removido." });
    };

    const filteredPlayers = players
        .filter(p => p.nomeLista?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.nomeLista.localeCompare(b.nomeLista));

    // TRAVA DE ACESSO: SuperAdmin sempre entra. Admin só entra se o plano dele for PRO ou o grupo for PRO.
    const hasAccess = isSuperAdmin || isPro || groupIsPro;

    if (!hasAccess && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] p-8 text-center bg-zinc-950/30 rounded-[2rem] border border-dashed border-white/10">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <Lock className="size-8 text-primary opacity-50" />
                </div>
                <h2 className="text-lg font-black italic uppercase text-white mb-2">Gestão de Identidade PRO</h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed mb-6 max-w-[250px]">
                    Vincule apelidos e resolva duplicatas automaticamente assinando o plano PRO.
                </p>
                <Button className="bg-primary text-black font-black text-[10px] uppercase italic rounded-full px-8">
                    Assinar Agora
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[70vh] bg-zinc-950/50 rounded-[2rem] overflow-hidden border border-white/5 animate-in fade-in duration-500">
            {/* Header Fixo com Busca */}
            <div className="p-6 border-b border-white/5 bg-zinc-900/50 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-primary size-5" />
                        <h1 className="text-sm font-black italic uppercase tracking-tight text-white">Gestão de Identidade</h1>
                    </div>
                    {(isPro || groupIsPro || isSuperAdmin) && (
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            <Crown className="size-2.5 text-primary" />
                            <span className="text-[7px] font-black text-primary uppercase">PRO</span>
                        </div>
                    )}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                    <Input
                        placeholder="Pesquisar por nome oficial..."
                        className="h-10 bg-black/40 border-white/10 pl-10 text-xs font-bold uppercase italic focus:ring-1 focus:ring-primary/30"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista com Scroll Customizado */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredPlayers.map((player) => (
                    <div key={player.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-10 border border-white/10">
                                <AvatarImage src={player.photoURL} />
                                <AvatarFallback className="bg-zinc-800 text-white text-[10px] font-black uppercase">
                                    {(player.nomeLista || '??').substring(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black italic uppercase text-xs text-white truncate leading-none">
                                    {player.nomeLista || "Sem Nome"}
                                </h3>
                                <p className="text-[9px] text-white/20 mt-1 font-mono truncate">{player.id}</p>
                            </div>
                            {player.userId ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] uppercase font-black tracking-tighter">Oficial</Badge>
                            ) : (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] uppercase font-black tracking-tighter">Fantasma</Badge>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                                {(player.aliases ?? []).map((alias) => (
                                    <Badge key={alias} variant="secondary" className="bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 border-none text-[9px] font-bold uppercase px-2 py-0.5 transition-all group">
                                        {alias}
                                        <button onClick={() => removeAlias(player, alias)} className="ml-1.5 opacity-40 group-hover:opacity-100">
                                            <Trash2 className="size-2.5" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Input
                                placeholder="Vincular apelido..."
                                className="h-8 bg-black/40 border-white/5 text-[10px] uppercase font-bold italic"
                                value={newAlias[player.id] || ""}
                                onChange={(e) => setNewAlias({ ...newAlias, [player.id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && addAlias(player)}
                            />
                            <Button size="sm" onClick={() => addAlias(player)} className="h-8 w-8 p-0 bg-primary hover:bg-primary/80 text-black shadow-lg shadow-primary/10">
                                <Plus className="size-4 stroke-[3px]" />
                            </Button>
                        </div>
                    </div>
                ))}

                {filteredPlayers.length === 0 && !loading && (
                    <div className="py-10 text-center text-white/20 text-[10px] font-bold uppercase italic tracking-widest">
                        Nenhum atleta encontrado
                    </div>
                )}
            </div>
        </div>
    );
}