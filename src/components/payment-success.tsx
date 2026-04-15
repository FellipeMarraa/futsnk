import {useNavigate} from "react-router-dom"
import {ArrowRight, CheckCircle2} from "lucide-react"
import {Button} from "@/components/ui/button"

export function PaymentSuccess() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#0c0c0e] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <CheckCircle2 className="size-20 text-primary relative z-10 animate-bounce" />
            </div>

            <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter mb-2">
                Pagamento <span className="text-primary">Recebido!</span>
            </h1>

            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] max-w-[280px] leading-relaxed mb-8">
                Sua solicitação está sendo processada. Em instantes as funções PRO serão liberadas no seu perfil.
            </p>

            <div className="grid gap-3 w-full max-w-[300px]">
                <Button
                    onClick={() => navigate("/")}
                    className="bg-primary text-black font-black uppercase italic h-14 rounded-2xl shadow-lg hover:bg-primary/90"
                >
                    Voltar para o App <ArrowRight className="ml-2 size-4" />
                </Button>

                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                    Dúvidas? Chame o suporte no WhatsApp
                </p>
            </div>
        </div>
    )
}