"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ShieldCheck, Star, Ticket, Trophy, Zap } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { redeemCoupon } from "@/lib/coupon-service" // Importando o serviço que criamos

export const UpgradePlanModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { user } = useAuth();

    // Estados
    const [couponInput, setCouponInput] = useState("");
    const [showCouponField, setShowCouponField] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [isRedeeming, setIsRedeeming] = useState(false);

    // Lógica de Pagamento (Mercado Pago)
    const handlePayment = async (planType: 'mensal' | 'anual') => {
        if (!user?.uid) return;
        setLoadingPlan(planType);

        try {
            // Em vez de fetch para a API que está dando 405,
            // mandamos o usuário para o checkout oficial do Mercado Pago.
            // Opcional: Adicionamos o UID do usuário na URL para você saber quem pagou no painel do MP
            const MP_LINK = `https://mpago.la/2As7j9m?external_reference=${user.uid}`;

            // Simulamos um pequeno delay para o loader dar feedback visual
            setTimeout(() => {
                window.location.href = MP_LINK;
            }, 800);

        } catch (error) {
            toast({
                title: "Erro no Checkout",
                description: "Tente novamente em instantes.",
                variant: "destructive"
            });
            setLoadingPlan(null);
        }
    };

    // Lógica de Resgate de Cupom
    const handleRedeem = async () => {
        if (!couponInput.trim() || !user?.uid) return;

        setIsRedeeming(true);
        try {
            const result = await redeemCoupon(user.uid, couponInput.trim());

            toast({
                title: "CUPOM ATIVADO! 🎉",
                description: `Seu plano PRO foi estendido até ${result.newExpiration.toLocaleDateString('pt-BR')}.`
            });

            setCouponInput("");
            onClose(); // Fecha o modal após o sucesso
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "FALHA NO RESGATE",
                description: error.message || "Não foi possível validar o cupom."
            });
        } finally {
            setIsRedeeming(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[400px] rounded-[2rem] border-white/10 shadow-2xl p-6 bg-[#0c0c0e] text-white outline-none">
                <DialogHeader className="items-center text-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
                        <Trophy className="h-8 w-8 text-primary shadow-[0_0_15px_rgba(234,255,0,0.5)]" />
                    </div>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
                        Upgrade <span className="text-primary">PRO</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">
                        Leve a gestão do seu clube para o nível profissional.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Benefícios */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase italic">Sorteio de Times Ilimitado</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase italic">Gestão de Caixa & Finanças</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                            <Star className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase italic">Estatísticas Detalhadas</span>
                        </div>
                    </div>

                    {/* Botão de Compra - Plano Mensal */}
                    <Button
                        className="w-full bg-primary hover:bg-primary/90 text-black h-16 rounded-2xl flex flex-col items-center justify-center gap-0 shadow-[0_0_30px_rgba(234,255,0,0.15)] transition-all active:scale-95"
                        onClick={() => handlePayment('mensal')}
                        disabled={loadingPlan !== null || isRedeeming}
                    >
                        {loadingPlan === 'mensal' ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <>
                                <span className="text-sm font-black uppercase italic">Assinar Clube PRO</span>
                                <span className="text-[10px] font-bold opacity-70">R$ 19,90 / Mês</span>
                            </>
                        )}
                    </Button>

                    {/* Rodapé: Cupons */}
                    <div className="pt-4 border-t border-white/10">
                        {!showCouponField ? (
                            <button
                                onClick={() => setShowCouponField(true)}
                                className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase text-white/30 hover:text-primary transition-colors"
                            >
                                <Ticket className="h-3 w-3" /> Resgatar Cupom de Acesso
                            </button>
                        ) : (
                            <div className="flex gap-2 animate-in slide-in-from-top-1">
                                <Input
                                    placeholder="CÓDIGO SUPREMO"
                                    value={couponInput}
                                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                    className="bg-white/5 border-white/10 h-10 text-[10px] text-center font-black uppercase tracking-widest text-white focus:ring-1 focus:ring-primary/50"
                                />
                                <Button
                                    size="sm"
                                    className="bg-primary text-black font-bold h-10 px-4 hover:bg-primary/80"
                                    onClick={handleRedeem}
                                    disabled={isRedeeming || !couponInput.trim()}
                                >
                                    {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}