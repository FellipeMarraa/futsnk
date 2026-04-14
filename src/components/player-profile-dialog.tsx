import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, limit, query, updateDoc } from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, Clock, Shield, Star, Target, TrendingUp, Zap, ChevronUp, Minus, AlertCircle, Ticket, Loader2, Crown, Pencil, Check, X } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { applyCoupon } from "@/lib/firebase-services.ts"
import { useToast } from "@/hooks/use-toast"

export function PlayerProfileDialog({ isOpen, onClose, user, initialGroupId, allGroups }: {
    isOpen: boolean,
    onClose: () => void,
    user: any,
    initialGroupId: string,
    allGroups: any[]
}) {
    const { toast } = useToast()
    const [activeGroupId, setActiveGroupId] = useState(initialGroupId);
    const [stats, setStats] = useState<any>(null)
    const [lastMatchStats, setLastMatchStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // Estados para o Sistema de Cupons
    const [couponCode, setCouponCode] = useState("")
    const [isApplying, setIsApplying] = useState(false)
    const [showCouponInput, setShowCouponInput] = useState(false)

    // Estados para Edição de Nome
    const [isEditingName, setIsEditingName] = useState(false)
    const [newName, setNewName] = useState(user?.nomeLista || "")
    const [isSavingName, setIsSavingName] = useState(false)

    const activeGroup = allGroups.find(g => g.id === activeGroupId);
    const activeGroupName = activeGroup?.name || "Clube";
    const isPro = activeGroup?.isPro || false;

    const showGroupSelector = allGroups.length > 1;

    useEffect(() => {
        if (isOpen) {
            setShowCouponInput(false);
            setCouponCode("");
            setIsEditingName(false);
            setNewName(user?.nomeLista || "");
            if (initialGroupId) setActiveGroupId(initialGroupId);
        }
    }, [isOpen, initialGroupId, user]);

    useEffect(() => {
        if (!isOpen || !user?.uid || !activeGroupId) return;

        const fetchPlayerData = async () => {
            setLoading(true)
            try {
                const metaRef = doc(db, "groups", activeGroupId, "players_meta", user.uid);
                const metaSnap = await getDoc(metaRef);

                let data = null;
                if (metaSnap.exists()) {
                    data = metaSnap.data();
                } else {
                    const nomeBusca = user.nomeLista?.toLowerCase().trim() || "";
                    const ghostRef = doc(db, "groups", activeGroupId, "players_meta", nomeBusca);
                    const ghostSnap = await getDoc(ghostRef);
                    if (ghostSnap.exists()) data = ghostSnap.data();
                }
                setStats(data);

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
                    const myNameNormalized = user.nomeLista?.toLowerCase().trim() || "";

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

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === user.nomeLista) {
            setIsEditingName(false);
            return;
        }

        setIsSavingName(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                nomeLista: newName.trim(),
                displayName: newName.trim()
            });
            toast({ title: "NOME ATUALIZADO" });
            setIsEditingName(false);
        } catch (e) {
            toast({ variant: "destructive", title: "ERRO AO ATUALIZAR" });
        } finally {
            setIsSavingName(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        if (!activeGroupId) {
            toast({ variant: "destructive", title: "ERRO", description: "Selecione um clube para aplicar o cupom." });
            return;
        }

        setIsApplying(true);
        try {
            const result = await applyCoupon(activeGroupId, couponCode, user);
            toast({
                title: "CUPOM APLICADO!",
                description: `+${result.daysAdded} dias de acesso PRO.`
            });
            setCouponCode("");
            setShowCouponInput(false);
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "ERRO NO CUPOM",
                description: e.message || "Código inválido."
            });
        } finally {
            setIsApplying(false);
        }
    };

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
            <DialogContent className="bg-[#0c0c0e] border-white/10 p-0 overflow-hidden max-w-sm rounded-[2.5rem] outline-none shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                <VisuallyHidden.Root>
                    <DialogHeader>
                        <DialogTitle>Perfil</DialogTitle>
                        <DialogDescription>Estatísticas do Atleta</DialogDescription>
                    </DialogHeader>
                </VisuallyHidden.Root>

                <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                    {/* SELETOR DE GRUPO */}
                    <div className="absolute top-8 right-8 z-20">
                        {showGroupSelector ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[9px] font-black uppercase italic text-white hover:bg-white/10 transition-all">
                                        {activeGroupName} <ChevronDown className="size-3 text-primary" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1a1a1e] border-white/10 text-white min-w-[140px] rounded-xl shadow-2xl">
                                    {allGroups.map((group) => (
                                        <DropdownMenuItem
                                            key={group.id}
                                            onClick={() => setActiveGroupId(group.id)}
                                            className="text-[9px] font-black uppercase italic py-2 cursor-pointer focus:bg-primary focus:text-black"
                                        >
                                            {group.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : allGroups.length === 1 && (
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[9px] font-black uppercase italic text-white/40">
                                {activeGroupName}
                            </div>
                        )}
                    </div>

                    {/* OVR DISPLAY */}
                    <div className="absolute top-8 left-8 flex flex-col items-center">
                        <span className="text-4xl font-black italic text-white tracking-tighter leading-none">
                            {calculateOVR(stats)}
                        </span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">OVR</span>
                    </div>

                    <Avatar className="size-32 border-4 border-primary/30 shadow-[0_0_40px_rgba(234,255,0,0.15)] mb-4 bg-zinc-900">
                        <AvatarImage src={user?.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-white font-black text-5xl italic uppercase">
                            {user?.nomeLista?.[0] || "U"}
                        </AvatarFallback>
                    </Avatar>

                    {/* NOME EDITÁVEL */}
                    <div className="flex flex-col items-center w-full px-4 mb-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-white/5 border-primary/30 h-9 text-center font-black italic uppercase text-white rounded-xl focus:ring-1 focus:ring-primary/50"
                                    autoFocus
                                />
                                <button onClick={handleUpdateName} disabled={isSavingName} className="p-2 bg-primary rounded-xl text-black">
                                    {isSavingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 stroke-[3px]" />}
                                </button>
                                <button onClick={() => setIsEditingName(false)} className="p-2 bg-white/5 rounded-xl text-white/40">
                                    <X className="size-4 stroke-[3px]" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">
                                    {user?.nomeLista}
                                </h2>
                                <Pencil className="size-3 text-white/20 group-hover:text-primary transition-colors" />
                            </div>
                        )}
                    </div>

                    <div className="mb-8">
                        {isPro ? (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                <Crown className="size-2.5 text-amber-500 fill-amber-500" />
                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Membro Pro</span>
                            </div>
                        ) : (
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em]">
                                {loading ? "Sincronizando..." : "Estatísticas da Temporada"}
                            </p>
                        )}
                    </div>

                    {/* ATRIBUTOS */}
                    <div className="w-full grid grid-cols-2 gap-2 mb-8">
                        <AttributeItem label="Técnica" value={stats?.technique} lastRoundValue={lastMatchStats?.technique} icon={<TrendingUp className="size-3" />} />
                        <AttributeItem label="Chute" value={stats?.finishing} lastRoundValue={lastMatchStats?.finishing} icon={<Target className="size-3" />} />
                        <AttributeItem label="Velocidade" value={stats?.speed} lastRoundValue={lastMatchStats?.speed} icon={<Zap className="size-3" />} />
                        <AttributeItem label="Defesa" value={stats?.defense} lastRoundValue={lastMatchStats?.defense} icon={<Shield className="size-3" />} />
                    </div>

                    {/* ÚLTIMA ATUAÇÃO */}
                    <div className="w-full bg-white/[0.03] rounded-[2rem] p-5 border border-white/5 shadow-inner mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="size-3 text-primary" /> Última Atuação
                            </h4>
                            {lastMatchStats?.isMvp && (
                                <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
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
                            <div className="flex flex-col items-center py-4 opacity-20 text-center">
                                <AlertCircle className="size-5 mb-2" />
                                <p className="text-[8px] uppercase italic font-bold tracking-widest">Sem dados nesta rodada</p>
                            </div>
                        )}
                    </div>

                    {/* SEÇÃO DE CUPOM - SEMPRE VISÍVEL */}
                    <div className="w-full border-t border-white/5 pt-6 text-center">
                        {!showCouponInput ? (
                            <button
                                onClick={() => setShowCouponInput(true)}
                                className="flex items-center justify-center gap-2 mx-auto text-[9px] font-black text-white/30 uppercase italic tracking-widest hover:text-primary transition-colors py-2"
                            >
                                <Ticket className="size-3" /> Possui um cupom de acesso?
                            </button>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-4 justify-center">
                                    <Ticket className="size-3 text-primary" />
                                    <h4 className="text-[10px] font-black text-white uppercase italic tracking-wider">Resgatar Cupom</h4>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="CÓDIGO"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className="h-10 bg-white/5 border-white/10 rounded-xl text-[10px] font-bold tracking-[0.2em] focus:ring-1 focus:ring-primary/50 uppercase"
                                        autoFocus
                                    />
                                    <Button
                                        onClick={handleApplyCoupon}
                                        disabled={isApplying || !couponCode.trim()}
                                        className="h-10 bg-primary text-black font-black text-[9px] uppercase italic rounded-xl px-4"
                                    >
                                        {isApplying ? <Loader2 className="size-3 animate-spin" /> : "ATIVAR"}
                                    </Button>
                                </div>
                                <button
                                    onClick={() => setShowCouponInput(false)}
                                    className="mt-3 text-[8px] font-black text-white/20 uppercase hover:text-white/40"
                                >
                                    Cancelar
                                </button>
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
                    <Star key={s} size={12} className={s <= Math.round(value) ? "text-primary fill-primary" : "text-white/5"} />
                ))}
            </div>
        </div>
    )
}

function AttributeItem({ label, value, lastRoundValue, icon }: any) {
    const currentVal = Number(value) || 70;
    const trend = lastRoundValue !== undefined ? (lastRoundValue > currentVal ? 'up' : 'neutral') : 'none';
    return (
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-3 border border-white/5 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-primary/60 shrink-0">{icon}</span>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter truncate">{label}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="text-[14px] font-black italic text-white leading-none">{currentVal.toFixed(1)}</span>
                <div className="w-3 flex justify-center">
                    {trend === 'up' && <ChevronUp className="size-3 text-primary" />}
                    {trend === 'neutral' && <Minus className="size-3 text-white/10" />}
                </div>
            </div>
        </div>
    )
}