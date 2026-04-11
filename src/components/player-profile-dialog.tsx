import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, Clock, Shield, Star, Target, TrendingUp, Zap, ChevronUp, Minus, AlertCircle } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function PlayerProfileDialog({ isOpen, onClose, user, initialGroupId, allGroups }: {
    isOpen: boolean,
    onClose: () => void,
    user: any,
    initialGroupId: string,
    allGroups: any[]
}) {
    const [activeGroupId, setActiveGroupId] = useState(initialGroupId);
    const [stats, setStats] = useState<any>(null)
    const [lastMatchStats, setLastMatchStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const activeGroupName = allGroups.find(g => g.id === activeGroupId)?.name || "Clube";

    useEffect(() => {
        if (!isOpen || !user?.uid || !activeGroupId) return;

        const fetchPlayerData = async () => {
            setLoading(true)
            try {
                // PRIORIDADE 1: Buscar pelo UID
                const metaRef = doc(db, "groups", activeGroupId, "players_meta", user.uid);
                const metaSnap = await getDoc(metaRef);

                let data = null;
                if (metaSnap.exists()) {
                    data = metaSnap.data();
                } else {
                    // PRIORIDADE 2: Fallback para o nome
                    const nomeBusca = user.nomeLista?.toLowerCase().trim() || "";
                    const ghostRef = doc(db, "groups", activeGroupId, "players_meta", nomeBusca);
                    const ghostSnap = await getDoc(ghostRef);
                    if (ghostSnap.exists()) data = ghostSnap.data();
                }
                setStats(data);

                // 2. Buscar Médias da Última Partida
                const matchesRef = collection(db, "groups", activeGroupId, "matches");
                const matchesSnap = await getDocs(query(matchesRef, limit(20)));

                const finishedMatches = matchesSnap.docs
                    .map(d => ({ id: d.id, ...d.data() as any }))
                    .filter(m => m.status === "finished")
                    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

                if (finishedMatches.length > 0) {
                    const lastMatch = finishedMatches[0];
                    const ratingsCol = collection(db, "groups", activeGroupId, "matches", lastMatch.id, "technical_ratings");
                    const ratingsSnap = await getDocs(ratingsCol);

                    const sums = { technique: 0, speed: 0, finishing: 0, defense: 0, count: 0 };
                    const myNameNormalized = user.nomeLista.toLowerCase().trim();

                    ratingsSnap.forEach(rDoc => {
                        const rData = rDoc.data().ratings;
                        if (!rData) return;

                        Object.keys(rData).forEach(pName => {
                            const pNameNormalized = pName.toLowerCase().trim();
                            if (pNameNormalized === myNameNormalized ||
                                myNameNormalized.includes(pNameNormalized) ||
                                pNameNormalized.includes(myNameNormalized)) {
                                sums.technique += rData[pName].technique || 0;
                                sums.speed += rData[pName].speed || 0;
                                sums.finishing += rData[pName].finishing || 0;
                                sums.defense += rData[pName].defense || 0;
                                sums.count++;
                            }
                        });
                    });

                    if (sums.count > 0) {
                        setLastMatchStats({
                            // Convertendo para escala 0-100 para comparação de tendência
                            technique: (sums.technique / sums.count) * 20,
                            speed: (sums.speed / sums.count) * 20,
                            finishing: (sums.finishing / sums.count) * 20,
                            defense: (sums.defense / sums.count) * 20,
                            isMvp: lastMatch.mvp?.toLowerCase().trim() === myNameNormalized
                        });
                    } else {
                        setLastMatchStats(null);
                    }
                } else {
                    setLastMatchStats(null);
                }
            } catch (e) {
                console.error("Erro ao carregar perfil:", e);
            } finally {
                setLoading(false)
            }
        }

        fetchPlayerData();
    }, [isOpen, user, activeGroupId]);

    const calculateOVR = (s: any) => {
        if (!s) return "70.0";
        const t = Number(s.technique) || 70;
        const f = Number(s.finishing) || 70;
        const v = Number(s.speed) || 70;
        const d = Number(s.defense) || 70;

        const ovr = (t * 0.35) + (f * 0.35) + (v * 0.15) + (d * 0.15);
        return ovr.toFixed(1);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0c0c0e] border-white/10 p-0 overflow-hidden max-w-sm rounded-[2.5rem] outline-none shadow-2xl">
                <VisuallyHidden.Root>
                    <DialogHeader>
                        <DialogTitle>Perfil de Atleta</DialogTitle>
                        <DialogDescription>Dados de performance por grupo</DialogDescription>
                    </DialogHeader>
                </VisuallyHidden.Root>

                <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                    <div className="absolute top-8 right-8 z-20">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[9px] font-black uppercase italic text-white hover:bg-white/10 transition-all shadow-xl active:scale-95">
                                    {activeGroupName} <ChevronDown className="size-3 text-primary" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1a1e] border-white/10 text-white min-w-[140px] rounded-xl shadow-2xl">
                                {allGroups.map((group) => (
                                    <DropdownMenuItem
                                        key={group.id}
                                        onClick={() => setActiveGroupId(group.id)}
                                        className="text-[9px] font-black uppercase italic py-2 cursor-pointer focus:bg-primary focus:text-black transition-colors"
                                    >
                                        {group.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="absolute top-8 left-8 flex flex-col items-center">
                        <span className="text-4xl font-black italic text-white tracking-tighter leading-none">
                            {calculateOVR(stats)}
                        </span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">OVR</span>
                    </div>

                    <Avatar className="size-32 border-4 border-primary/30 shadow-[0_0_40px_rgba(234,255,0,0.15)] mb-4 bg-zinc-900">
                        <AvatarImage src={user?.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-white font-black text-5xl italic uppercase">
                            {user?.nomeLista?.[0]}
                        </AvatarFallback>
                    </Avatar>

                    <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter text-center leading-none mb-1">
                        {user?.nomeLista}
                    </h2>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em] mb-8">
                        {loading ? "Sincronizando..." : "Estatísticas da Temporada"}
                    </p>

                    <div className="w-full grid grid-cols-2 gap-3 mb-8">
                        <AttributeItem
                            label="Técnica"
                            value={stats?.technique}
                            lastRoundValue={lastMatchStats?.technique}
                            icon={<TrendingUp className="size-3" />}
                        />
                        <AttributeItem
                            label="Chute"
                            value={stats?.finishing}
                            lastRoundValue={lastMatchStats?.finishing}
                            icon={<Target className="size-3" />}
                        />
                        <AttributeItem
                            label="Velocidade"
                            value={stats?.speed}
                            lastRoundValue={lastMatchStats?.speed}
                            icon={<Zap className="size-3" />}
                        />
                        <AttributeItem
                            label="Defesa"
                            value={stats?.defense}
                            lastRoundValue={lastMatchStats?.defense}
                            icon={<Shield className="size-3" />}
                        />
                    </div>

                    <div className="w-full bg-white/[0.03] rounded-[2rem] p-5 border border-white/5 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="size-3 text-primary" /> Última Atuação
                            </h4>
                            {lastMatchStats?.isMvp && (
                                <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30 animate-in zoom-in duration-300">
                                    <Star className="size-2.5 text-primary fill-primary" />
                                    <span className="text-[8px] font-black text-primary uppercase italic">MVP</span>
                                </div>
                            )}
                        </div>

                        {lastMatchStats ? (
                            <div className="space-y-3">
                                <RatingRow label="Técnica" value={lastMatchStats.technique / 20} />
                                <RatingRow label="Velocidade" value={lastMatchStats.speed / 20} />
                                <RatingRow label="Chute" value={lastMatchStats.finishing / 20} />
                                <RatingRow label="Defesa" value={lastMatchStats.defense / 20} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-4 opacity-20">
                                <AlertCircle className="size-5 mb-2" />
                                <p className="text-[8px] uppercase italic font-bold tracking-widest text-center">
                                    Dados não disponíveis para esta rodada
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="h-2 w-full bg-primary/20" />
            </DialogContent>
        </Dialog>
    )
}

function RatingRow({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">{label}</span>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                        key={s}
                        size={12}
                        className={s <= Math.round(value) ? "text-primary fill-primary" : "text-white/5"}
                    />
                ))}
            </div>
        </div>
    )
}

function AttributeItem({ label, value, lastRoundValue, icon }: any) {
    const currentVal = Number(value) || 70;

    // Tendência minimalista: Se a nota da última rodada foi maior que o nível atual
    const trend = lastRoundValue !== undefined
        ? (lastRoundValue > currentVal ? 'up' : 'neutral')
        : 'none';

    return (
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5 hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-2">
                <span className="text-primary/60">{icon}</span>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter">
                    {label}
                </span>
            </div>

            <div className="flex items-center gap-1.5">
                {/* Exibição com decimal para ver progresso real */}
                <span className="text-base font-black italic text-white tracking-tighter">
                    {currentVal.toFixed(1)}
                </span>

                {/* Indicadores minimalistas ao lado do valor */}
                {trend === 'up' && (
                    <ChevronUp className="size-3 text-primary" />
                )}
                {trend === 'neutral' && (
                    <Minus className="size-3 text-white/10" />
                )}
            </div>
        </div>
    )
}