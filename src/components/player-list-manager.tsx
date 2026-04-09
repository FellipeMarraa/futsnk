import { useEffect, useState } from "react"
import { ChevronRight, Loader2, Medal, Search, Shield, Target, TrendingUp, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, deleteDoc, doc, onSnapshot, query, setDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

interface PlayerMeta {
    id: string;
    nomeLista: string;
    technique: number;
    speed: number;
    defense: number;
    finishing: number;
    userId?: string;
    photoURL?: string;
}

export function PlayerListManager({ groupId }: { groupId: string, isAdmin: boolean, currentMatchPlayers: string[] }) {
    const { user, nomeLista: meuNomeNoPerfil } = useAuth()
    const [playersMetadata, setPlayersMetadata] = useState<PlayerMeta[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        const q = query(collection(db, "groups", groupId, "players_meta"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => {
                const docData = d.data();
                return {
                    id: d.id,
                    nomeLista: docData.nomeLista || "Atleta",
                    technique: Number(docData.technique) || 50,
                    speed: Number(docData.speed) || 50,
                    defense: Number(docData.defense) || 50,
                    finishing: Number(docData.finishing) || 50,
                    userId: docData.userId,
                    photoURL: docData.photoURL
                };
            }) as PlayerMeta[];
            setPlayersMetadata(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [groupId]);

    useEffect(() => {
        const syncOfficialProfile = async () => {
            if (!user || !meuNomeNoPerfil || loading) return;

            const officialId = user.uid;

            const ghostProfile = playersMetadata.find(p =>
                p.nomeLista?.toLowerCase().trim() === meuNomeNoPerfil.toLowerCase().trim() &&
                p.id !== officialId
            );

            if (ghostProfile) {
                try {
                    const officialRef = doc(db, "groups", groupId, "players_meta", officialId);

                    await setDoc(officialRef, {
                        nomeLista: meuNomeNoPerfil,
                        technique: ghostProfile.technique,
                        speed: ghostProfile.speed,
                        defense: ghostProfile.defense,
                        finishing: ghostProfile.finishing,
                        userId: user.uid,
                        photoURL: user.photoURL,
                        updatedAt: new Date()
                    }, { merge: true });

                    await deleteDoc(doc(db, "groups", groupId, "players_meta", ghostProfile.id));
                } catch (e) { console.error(e); }
            }
        };
        syncOfficialProfile();
    }, [user, meuNomeNoPerfil, playersMetadata, groupId, loading]);

    const calculateOVR = (p: PlayerMeta) => {
        const tec = Number(p.technique) || 50;
        const chu = Number(p.finishing) || 50;
        const vel = Number(p.speed) || 50;
        const def = Number(p.defense) || 50;
        return Math.round((tec * 0.35) + (chu * 0.35) + (vel * 0.15) + (def * 0.15));
    };

    const filteredPlayers = playersMetadata
        .filter(p => p.nomeLista?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => calculateOVR(b) - calculateOVR(a));

    if (loading) return (
        <div className="py-20 text-center"><Loader2 className="size-8 animate-spin text-primary opacity-40" /></div>
    )

    return (
        <div className="space-y-4 animate-in fade-in duration-500 flex flex-col h-full">
            <div className="relative px-1 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                <input
                    className="flex h-11 w-full rounded-xl border border-white/5 bg-white/[0.03] px-11 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                    placeholder="BUSCAR ATLETA..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* CONTAINER COM SCROLL AJUSTADO */}
            <div className="grid gap-2 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                {filteredPlayers.map((player, index) => {
                    const isMe = player.userId === user?.uid;
                    const ovr = calculateOVR(player);

                    return (
                        <Dialog key={player.id}>
                            <DialogTrigger asChild>
                                <div className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 transition-all active:scale-[0.98] cursor-pointer ${isMe ? 'bg-primary/10 border-primary/20' : 'bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                                    <div className="flex flex-col items-center justify-center w-8 shrink-0">
                                        <span className={`text-lg font-black italic tracking-tighter leading-none ${ovr >= 70 ? 'text-primary' : 'text-white'}`}>
                                            {ovr}
                                        </span>
                                    </div>

                                    <Avatar className="size-9 border border-white/10 shrink-0">
                                        <AvatarImage src={player.photoURL} />
                                        <AvatarFallback className="bg-zinc-800 text-[10px] font-black italic uppercase">
                                            {player.nomeLista.substring(0, 1)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black italic uppercase text-white truncate tracking-tight">
                                            {player.nomeLista}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {index === 0 && searchTerm === "" && <Medal className="size-3 text-primary" />}
                                        <ChevronRight className="size-4 text-white/20" />
                                    </div>
                                </div>
                            </DialogTrigger>

                            <DialogContent className="w-[85%] max-w-[320px] bg-[#1a1a1e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl outline-none">
                                <VisuallyHidden.Root>
                                    <DialogTitle>Perfil de Atleta: {player.nomeLista}</DialogTitle>
                                    <DialogDescription>Detalhes de atributos e OVR do jogador.</DialogDescription>
                                </VisuallyHidden.Root>

                                <div className={`relative flex flex-col items-center pt-10 pb-8 px-6 border-t-4 ${isMe ? 'border-primary' : 'border-white/10'}`}>
                                    <div className="absolute top-6 left-6 flex flex-col items-center">
                                        <span className="text-4xl font-black italic tracking-tighter text-white leading-none">
                                            {ovr}
                                        </span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">OVR</span>
                                    </div>

                                    <div className="relative mb-6">
                                        <Avatar className="size-32 border-4 border-white/5 shadow-2xl">
                                            <AvatarImage src={player.photoURL} className="object-cover" />
                                            <AvatarFallback className="bg-zinc-800 text-white/5 font-black text-5xl italic uppercase leading-none flex items-center justify-center">
                                                {player.nomeLista.substring(0, 1)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isMe && (
                                            <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-black font-black uppercase italic text-[8px] px-3">
                                                Seu Perfil
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none mb-1">
                                            {player.nomeLista}
                                        </h2>
                                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">Membro Oficial</p>
                                    </div>

                                    <div className="w-full grid grid-cols-2 gap-y-6 border-t border-white/5 pt-8">
                                        <AttributeBox label="Velocidade" value={Number(player.speed) || 50} icon={<Zap className="size-3" />} />
                                        <AttributeBox label="Chute" value={Number(player.finishing) || 50} icon={<Target className="size-3" />} />
                                        <AttributeBox label="Técnica" value={Number(player.technique) || 50} icon={<TrendingUp className="size-3" />} />
                                        <AttributeBox label="Defesa" value={Number(player.defense) || 50} icon={<Shield className="size-3" />} />
                                    </div>
                                </div>
                                <div className={`h-3 w-full ${isMe ? 'bg-primary/40' : 'bg-white/5'}`} />
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </div>
        </div>
    )
}

function AttributeBox({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-white/20">{icon}</span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</span>
            </div>
            <span className={`text-xl font-black italic tracking-tighter ${value >= 75 ? 'text-primary' : 'text-white'}`}>
                {Math.round(value)}
            </span>
        </div>
    )
}