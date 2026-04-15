import {Button} from "@/components/ui/button"
import {BarChart3, ChevronRight, Trophy, Users} from "lucide-react"

export function LandingPage({ onStart }: { onStart: () => void }) {
    return (
        <div className="min-h-screen bg-[#0c0c0e] text-white selection:bg-primary selection:text-black">
            <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <Trophy className="text-primary size-6" />
                    <span className="font-black italic uppercase tracking-tighter text-xl">FUT<span className="text-primary">MASTER</span></span>
                </div>
                <Button onClick={onStart} variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-primary">
                    Entrar / Cadastrar
                </Button>
            </nav>

            <section className="px-6 pt-20 pb-32 max-w-7xl mx-auto text-center">
                <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8">
                    TRANSFORME SEU <br /> <span className="text-primary">RACHA EM LIGA</span>
                </h1>

                <p className="max-w-xl mx-auto text-white/40 font-medium text-sm md:text-base mb-12 leading-relaxed">
                    Gerencie times equilibrados, acompanhe a evolução dos atletas com atributos reais e defina quem é o verdadeiro MVP da semana.
                </p>

                <Button
                    onClick={onStart}
                    className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase italic tracking-widest transition-all hover:scale-105 shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]"
                >
                    Criar meu Clube Agora <ChevronRight className="ml-2 size-4" />
                </Button>
            </section>

            <section className="px-6 py-20 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                    <FeatureCard
                        icon={<Users className="text-primary" />}
                        title="Sorteio Equilibrado"
                        desc="Nosso algoritmo usa o nível técnico para garantir que ninguém 'mome' no racha."
                    />
                    <FeatureCard
                        icon={<BarChart3 className="text-primary" />}
                        title="Evolução Atleta"
                        desc="Velocidade, Chute e Defesa. Atributos que mudam conforme o desempenho real."
                    />
                    <FeatureCard
                        icon={<Trophy className="text-primary" />}
                        title="Gestão de Mensalistas"
                        desc="Controle o caixa do clube e o limite de atletas de forma profissional."
                    />
                </div>
            </section>
        </div>
    )
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="space-y-4 text-center md:text-left">
            <div className="bg-white/5 size-12 rounded-2xl flex items-center justify-center mx-auto md:mx-0 border border-white/10">
                {icon}
            </div>
            <h3 className="font-black italic uppercase tracking-tight text-lg">{title}</h3>
            <p className="text-white/30 text-xs font-bold leading-relaxed">{desc}</p>
        </div>
    )
}