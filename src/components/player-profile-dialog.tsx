import {useEffect, useState} from "react"
import {db} from "@/lib/firebase"
import {collection, doc, getDoc, getDocs, limit, orderBy, query} from "firebase/firestore"
import {Dialog, DialogContent} from "@/components/ui/dialog"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Clock, Shield, Star, Target, TrendingUp, Zap} from "lucide-react"

export function PlayerProfileDialog({ isOpen, onClose, user, groupId }: { isOpen: boolean, onClose: () => void, user: any, groupId?: string }) {
    const [stats, setStats] = useState<any>(null)
    const [recentRatings, setRecentRatings] = useState<any[]>([])
    const [, setLoading] = useState(true)

    useEffect(() => {
        if (!isOpen || !user?.uid) return;

        const fetchPlayerData = async () => {
            setLoading(true)
            try {
                // 1. Buscar Atributos Atuais (OVR)
                // Tentamos buscar no players_meta do grupo atual ou perfil global
                const metaRef = doc(db, "groups", groupId || "global", "players_meta", user.uid);
                const metaSnap = await getDoc(metaRef);

                if (metaSnap.exists()) {
                    setStats(metaSnap.data());
                }

                // 2. Buscar Desempenho Recente (Últimas 5 partidas)
                if (groupId) {
                    const ratingsRef = collection(db, "groups", groupId, "matches");
                    const q = query(ratingsRef, orderBy("updatedAt", "desc"), limit(5));
                    const matchesSnap = await getDocs(q);

                    const history: any[] = [];
                    matchesSnap.docs.forEach(matchDoc => {
                        const data = matchDoc.data();
                        // Aqui você pode filtrar o resumo da partida para este jogador
                        // Note: Não exibimos quem votou, apenas a média final daquela rodada
                        if (data.status === "finished") {
                            history.push({
                                date: data.date,
                                mvp: data.mvp === user.nomeLista
                            });
                        }
                    });
                    setRecentRatings(history);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false)
            }
        }

        fetchPlayerData();
    }, [isOpen, user, groupId]);

    const calculateOVR = (s: any) => {
        if (!s) return 70;
        return Math.round((s.technique * 0.35) + (s.finishing * 0.35) + (s.speed * 0.15) + (s.defense * 0.15));
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0c0c0e] border-white/10 p-0 overflow-hidden max-w-sm rounded-[2.5rem] outline-none">
                <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
                    {/* Background Glow */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                    {/* OVR Badge */}
                    <div className="absolute top-8 left-8 flex flex-col items-center">
                        <span className="text-4xl font-black italic text-white tracking-tighter leading-none">
                            {calculateOVR(stats)}
                        </span>
                        <span className="text-[10px] font-black text-primary uppercase">OVR</span>
                    </div>

                    <Avatar className="size-32 border-4 border-primary/30 shadow-[0_0_40px_rgba(234,255,0,0.15)] mb-4">
                        <AvatarImage src={user?.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-zinc-900 text-3xl font-black italic">{user?.nomeLista?.[0]}</AvatarFallback>
                    </Avatar>

                    <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter text-center">
                        {user?.nomeLista}
                    </h2>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em] mb-8">Estatísticas da Temporada</p>

                    {/* Atributos Estilo FIFA */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                        <AttributeItem label="TEC" value={stats?.technique} icon={<TrendingUp className="size-3" />} />
                        <AttributeItem label="FIN" value={stats?.finishing} icon={<Target className="size-3" />} />
                        <AttributeItem label="VEL" value={stats?.speed} icon={<Zap className="size-3" />} />
                        <AttributeItem label="DEF" value={stats?.defense} icon={<Shield className="size-3" />} />
                    </div>

                    {/* Desempenho Recente */}
                    <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5">
                        <h4 className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <Clock className="size-3" /> Forma Recente
                        </h4>
                        <div className="flex gap-2">
                            {recentRatings.length > 0 ? recentRatings.map((match, i) => (
                                <div key={i} className={`h-6 flex-1 rounded-md flex items-center justify-center border ${match.mvp ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/10'}`}>
                                    {match.mvp ? <Star className="size-3 text-primary fill-primary" /> : <div className="size-1 bg-white/20 rounded-full" />}
                                </div>
                            )) : (
                                <p className="text-[8px] text-white/20 uppercase italic font-bold">Nenhuma partida finalizada</p>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function AttributeItem({ label, value, icon }: any) {
    const val = Math.round(value || 70);
    return (
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
            <div className="flex items-center gap-2">
                <span className="text-primary/60">{icon}</span>
                <span className="text-[10px] font-black text-white/60 uppercase">{label}</span>
            </div>
            <span className="text-sm font-black italic text-white">{val}</span>
        </div>
    )
}