import {useEffect, useState} from "react"
import {ChevronRight, Crown, Loader2, Lock, Search, Shield, Target, TrendingUp, Zap} from "lucide-react"
import {db} from "@/lib/firebase"
import {collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc} from "firebase/firestore"
import {useAuth} from "@/contexts/auth-context"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {toast} from "@/hooks/use-toast"

interface PlayerMeta {
    id: string;
    nomeLista: string;
    technique: number;
    speed: number;
    defense: number;
    finishing: number;
    userId?: string;
    photoURL?: string;
    aliases?: string[];
}

export function PlayerListManager({ groupId }: { groupId: string, currentMatchPlayers: string[] }) {
    const { user, isSuperAdmin, isPro } = useAuth()
    const [playersMetadata, setPlayersMetadata] = useState<PlayerMeta[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [groupIsPro, setGroupIsPro] = useState(false)

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
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as any;
            setPlayersMetadata(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [groupId]);

    useEffect(() => {
        const syncOfficialProfile = async () => {
            if (!user || !user.nomeLista || loading) return;

            const officialId = user.uid;
            const myOfficialDoc = playersMetadata.find(p => p.id === officialId);
            const meuNomeOficial: string = user.nomeLista.toLowerCase().trim();

            if (!myOfficialDoc) {
                const ghostMatch = playersMetadata.find(p => {
                    const nomeDoc = (p.nomeLista || "").toLowerCase().trim();
                    const idDoc = p.id.toLowerCase().trim();
                    return meuNomeOficial.includes(nomeDoc) || nomeDoc.includes(meuNomeOficial) ||
                        idDoc.includes(meuNomeOficial) || meuNomeOficial.includes(idDoc);
                });

                if (!ghostMatch) {
                    const officialRef = doc(db, "groups", groupId, "players_meta", officialId);
                    await setDoc(officialRef, {
                        nomeLista: user.nomeLista,
                        userId: officialId,
                        photoURL: user.photoURL || "",
                        technique: 70, speed: 70, defense: 70, finishing: 70,
                        aliases: [meuNomeOficial],
                        lastUpdated: serverTimestamp()
                    });
                    return;
                }
            }

            const ghostProfile = playersMetadata.find(p => {
                if (p.id === officialId) return false;
                const nomeDocFantasma = (p.nomeLista || "").toLowerCase().trim();
                const idDocFantasma = p.id.toLowerCase().trim();
                return meuNomeOficial.includes(nomeDocFantasma) ||
                    nomeDocFantasma.includes(meuNomeOficial) ||
                    idDocFantasma.includes(meuNomeOficial) ||
                    meuNomeOficial.includes(idDocFantasma);
            });

            if (ghostProfile) {
                try {
                    const officialRef = doc(db, "groups", groupId, "players_meta", officialId);
                    const nomeFantasmaFormatado = ghostProfile.nomeLista.toLowerCase().trim();

                    if (!myOfficialDoc) {
                        await setDoc(officialRef, {
                            ...ghostProfile,
                            userId: officialId,
                            photoURL: user.photoURL || "",
                            nomeLista: user.nomeLista,
                            aliases: [meuNomeOficial, nomeFantasmaFormatado],
                            lastUpdated: serverTimestamp()
                        });
                    } else {
                        const currentAliases = myOfficialDoc.aliases || [];
                        const newAliases = Array.from(new Set([...currentAliases, nomeFantasmaFormatado, meuNomeOficial]));

                        await setDoc(officialRef, {
                            technique: ghostProfile.technique > 70 ? ghostProfile.technique : myOfficialDoc.technique,
                            speed: ghostProfile.speed > 70 ? ghostProfile.speed : myOfficialDoc.speed,
                            defense: ghostProfile.defense > 70 ? ghostProfile.defense : myOfficialDoc.defense,
                            finishing: ghostProfile.finishing > 70 ? ghostProfile.finishing : myOfficialDoc.finishing,
                            aliases: newAliases,
                            lastUpdated: serverTimestamp()
                        }, { merge: true });
                    }

                    await deleteDoc(doc(db, "groups", groupId, "players_meta", ghostProfile.id));

                    toast({
                        title: "PERFIL SINCRONIZADO",
                        description: `O apelido "${ghostProfile.nomeLista}" agora está vinculado à sua conta.`
                    });
                } catch (e) {
                    console.error("Erro na unificação:", e);
                }
            }
        };

        syncOfficialProfile();
    }, [user, playersMetadata, groupId, loading]);

    const calculateOVR = (p: PlayerMeta) => {
        const tec = Number(p.technique) || 70;
        const chu = Number(p.finishing) || 70;
        const vel = Number(p.speed) || 70;
        const def = Number(p.defense) || 70;
        return Math.round((tec * 0.35) + (chu * 0.35) + (vel * 0.15) + (def * 0.15));
    };

    const filteredPlayers = playersMetadata
        .filter(p => p.nomeLista?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => calculateOVR(b) - calculateOVR(a));

    if (loading) return <div className="py-20 text-center"><Loader2 className="size-8 animate-spin text-primary opacity-40" /></div>

    return (
        <div className="space-y-4 flex flex-col h-full text-left">
            <div className="relative px-1 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                <input
                    className="flex h-11 w-full rounded-xl border border-white/5 bg-white/[0.03] px-11 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                    placeholder="BUSCAR ATLETA..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="grid gap-2 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                {filteredPlayers.map((player) => {
                    const isMe = player.id === user?.uid;
                    const ovr = calculateOVR(player);

                    // Lógica visual: Se for PRO ou Overseer, o card brilha mais
                    const showPremiumVisual = groupIsPro || isPro || isSuperAdmin;

                    return (
                        <Dialog key={player.id}>
                            <DialogTrigger asChild>
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                                    isMe
                                        ? 'bg-primary/10 border-primary/30'
                                        : showPremiumVisual
                                            ? 'bg-white/[0.04] border-primary/10 hover:border-primary/30'
                                            : 'bg-white/[0.02] border-white/5'
                                }`}>
                                    <div className="w-8 shrink-0 text-center relative">
                                        <span className={`text-lg font-black italic ${ovr >= 80 ? 'text-primary' : 'text-white'}`}>{ovr}</span>
                                        {showPremiumVisual && ovr >= 80 && (
                                            <Crown className="size-2 text-primary absolute -top-2 -left-1 -rotate-12" />
                                        )}
                                    </div>
                                    <Avatar className="size-9 border border-white/10 shrink-0">
                                        <AvatarImage src={player.photoURL} className="object-cover" />
                                        <AvatarFallback className="bg-zinc-800 text-[10px] font-black">{player.nomeLista.substring(0, 1)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black uppercase text-white truncate">{player.nomeLista}</p>
                                    </div>
                                    <ChevronRight className="size-4 text-white/20" />
                                </div>
                            </DialogTrigger>
                            <DialogContent className="w-[85%] max-w-[320px] bg-[#1a1a1e] border-none rounded-[2.5rem] p-0 overflow-hidden outline-none">
                                <VisuallyHidden.Root><DialogTitle>Perfil</DialogTitle><DialogDescription>Atributos</DialogDescription></VisuallyHidden.Root>

                                <div className={`relative flex flex-col items-center pt-10 pb-8 px-6 border-t-4 ${isMe ? 'border-primary' : showPremiumVisual ? 'border-primary/40' : 'border-white/10'}`}>

                                    {/* CABEÇALHO DO CARD */}
                                    <div className="absolute top-6 left-6 flex flex-col items-center">
                                        <span className="text-4xl font-black italic text-white leading-none">{ovr}</span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">OVR</span>
                                    </div>

                                    {showPremiumVisual && (
                                        <div className="absolute top-6 right-6">
                                            <Zap className="size-5 text-primary fill-primary animate-pulse" />
                                        </div>
                                    )}

                                    <Avatar className="size-32 border-4 border-white/5 shadow-2xl bg-zinc-900 mb-6">
                                        <AvatarImage src={player.photoURL} className="object-cover" />
                                        <AvatarFallback className="bg-zinc-800 text-white font-black text-5xl italic uppercase flex items-center justify-center">{player.nomeLista.substring(0,1)}</AvatarFallback>
                                    </Avatar>

                                    <h2 className="text-2xl font-black italic uppercase text-white mb-8">{player.nomeLista}</h2>

                                    {/* GRID DE ATRIBUTOS COM TRAVA PRO */}
                                    <div className="w-full grid grid-cols-2 gap-y-6 border-t border-white/5 pt-8 relative">
                                        {/* Overlay de bloqueio para usuários FREE que não são o próprio jogador */}
                                        {!showPremiumVisual && !isMe && !isSuperAdmin && (
                                            <div className="absolute inset-0 z-10 bg-[#1a1a1e]/60 backdrop-blur-[4px] flex flex-col items-center justify-center rounded-xl pt-8">
                                                <Lock className="size-4 text-primary mb-2" />
                                                <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Atributos Visíveis apenas em Clubes PRO</span>
                                            </div>
                                        )}

                                        <AttributeBox label="Velocidade" value={player.speed} icon={<Zap className="size-3" />} />
                                        <AttributeBox label="Chute" value={player.finishing} icon={<Target className="size-3" />} />
                                        <AttributeBox label="Técnica" value={player.technique} icon={<TrendingUp className="size-3" />} />
                                        <AttributeBox label="Defesa" value={player.defense} icon={<Shield className="size-3" />} />
                                    </div>
                                </div>
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
        <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-white/20">{icon}</span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</span>
            </div>
            <span className={`text-xl font-black italic ${value >= 75 ? 'text-primary' : 'text-white'}`}>{Math.round(value)}</span>
        </div>
    )
}