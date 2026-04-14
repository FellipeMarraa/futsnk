import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, ShieldAlert, Users, Star, Zap, Info, AlertTriangle, ShieldX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { sendSystemNotification } from "@/lib/notifications-service"

export function NotificationsTab() {
    const { toast } = useToast()
    const [target, setTarget] = useState<any>("global")
    const [targetId, setTargetId] = useState("")
    const [type, setType] = useState<"info" | "warning" | "error">("info")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSend = async () => {
        if (!message.trim()) return;

        setLoading(true);
        try {
            const payload: any = {
                target: target,
                message: message.trim(),
                type: type // Agora usa o estado dinâmico
            };

            if (target !== "global" && targetId.trim()) {
                payload.targetId = targetId.trim();
            }

            await sendSystemNotification(payload);

            toast({
                title: "BROADCAST DISPARADO",
                description: `Alerta tipo ${type.toUpperCase()} enviado com sucesso.`
            });

            setMessage("");
            setTargetId("");
            setType("info"); // Reseta para o padrão
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "FALHA NO ENVIO",
                description: error.message || "Erro ao acessar o banco."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-white/[0.03] border-white/10 text-white max-w-2xl mx-auto overflow-hidden animate-in fade-in duration-500">
            <CardHeader className="bg-white/5 border-b border-white/5 p-0">
                <div className="px-8 py-4 text-white">
                    <CardTitle className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <ShieldAlert size={14} className="text-red-500" /> Broadcast de Sistema
                    </CardTitle>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
                {/* 1. SELEÇÃO DE ALVO */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-1 tracking-widest">Alvo do Alerta</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                            { id: 'global', label: 'Geral', icon: <Zap size={12}/> },
                            { id: 'group', label: 'Por Clube', icon: <Users size={12}/> },
                            { id: 'user', label: 'Por Atleta', icon: <Star size={12}/> }
                        ].map(t => (
                            <Button
                                key={t.id}
                                onClick={() => setTarget(t.id)}
                                className={`h-12 font-black uppercase text-[9px] italic rounded-xl border transition-all gap-2 ${
                                    target === t.id
                                        ? 'bg-primary text-black border-primary'
                                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                }`}
                            >
                                {t.icon} {t.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* 2. SELEÇÃO DE TIPO (SEVERIDADE) */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-1 tracking-widest">Severidade da Mensagem</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                            onClick={() => setType("info")}
                            className={`h-12 font-black uppercase text-[9px] italic rounded-xl border transition-all gap-2 ${
                                type === "info" ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                            }`}
                        >
                            <Info size={12}/> Informativo
                        </Button>
                        <Button
                            onClick={() => setType("warning")}
                            className={`h-12 font-black uppercase text-[9px] italic rounded-xl border transition-all gap-2 ${
                                type === "warning" ? 'bg-orange-500 text-white border-orange-400' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                            }`}
                        >
                            <AlertTriangle size={12}/> Aviso
                        </Button>
                        <Button
                            onClick={() => setType("error")}
                            className={`h-12 font-black uppercase text-[9px] italic rounded-xl border transition-all gap-2 ${
                                type === "error" ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                            }`}
                        >
                            <ShieldX size={12}/> Crítico
                        </Button>
                    </div>
                </div>

                {target !== 'global' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black uppercase text-white/20 ml-1 tracking-widest">ID de Referência</label>
                        <Input
                            placeholder="Insira o UUID..."
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl font-mono text-xs text-white"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/20 ml-1 tracking-widest">Texto da Notificação</label>
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-bold min-h-[160px] outline-none focus:border-primary/50 transition-all resize-none text-white"
                        placeholder="Ex: Teremos uma manutenção programada..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    />
                </div>

                <Button
                    className="w-full h-16 bg-primary text-black font-black uppercase italic gap-4 rounded-2xl text-xs shadow-[0_0_30px_rgba(234,255,0,0.1)] hover:bg-primary/90 transition-all"
                    onClick={handleSend}
                    disabled={loading || !message.trim()}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                    Disparar Mensagem Suprema
                </Button>
            </CardContent>
        </Card>
    )
}