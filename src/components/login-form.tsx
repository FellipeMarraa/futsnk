import { useState } from "react"
import { Loader2, LoaderPinwheel, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useToast } from "@/hooks/use-toast"
import {useNavigate} from "react-router-dom";

interface LoginFormProps {
    onBack?: () => void;
}

export function LoginForm({ onBack }: LoginFormProps) {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isFinalizing, setIsFinalizing] = useState(false)
    const [needsProfile, setNeedsProfile] = useState<{ uid: string, email: string, photoURL: string, displayName: string } | null>(null)
    const [nomeEscolhido, setNomeEscolhido] = useState("")
    const { toast } = useToast()
    const navigate = useNavigate();

    const handleSuccessfulAuth = () => {
        const redirectTo = sessionStorage.getItem('redirectAfterLogin');
        if (redirectTo) {
            sessionStorage.removeItem('redirectAfterLogin');
            navigate(redirectTo);
        } else {
            navigate('/');
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true)
        const provider = new GoogleAuthProvider()
        try {
            const result = await signInWithPopup(auth, provider)
            const user = result.user

            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)

            if (!userSnap.exists()) {
                setNeedsProfile({
                    uid: user.uid,
                    email: user.email || "",
                    displayName: user.displayName || "",
                    photoURL: user.photoURL || ""
                })
            } else {
                await setDoc(userRef, {
                    lastLogin: serverTimestamp(),
                    photoURL: user.photoURL
                }, { merge: true })
                toast({ title: "AUTORIZADO", description: "Bem-vindo de volta ao clube!" });

                handleSuccessfulAuth();
            }
        } catch (error) {
            toast({ variant: "destructive", title: "ERRO", description: "Falha na conexão com o Google." });
            console.log(error);
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const finalizeProfile = async () => {
        if (!needsProfile || !nomeEscolhido.trim()) {
            toast({ variant: "destructive", title: "NOME INVÁLIDO", description: "Escreve aí como a galera te chama!" });
            return;
        }

        setIsFinalizing(true)
        try {
            const userRef = doc(db, 'users', needsProfile.uid)
            await setDoc(userRef, {
                uid: needsProfile.uid,
                email: needsProfile.email,
                displayName: needsProfile.displayName,
                nomeLista: nomeEscolhido.trim(),
                photoURL: needsProfile.photoURL,
                isAdmin: false,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            })

            toast({ title: "PERFIL CRIADO", description: "Sua conta foi vinculada com sucesso!" })
            setNeedsProfile(null)
            handleSuccessfulAuth();
        } catch (error) {
            console.error(error)
            toast({ variant: "destructive", title: "ERRO", description: "Não conseguimos salvar seu nome." });
        } finally {
            setIsFinalizing(false)
        }
    }

    if (needsProfile) {
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-6 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-primary/10 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 w-full max-w-[420px] animate-in zoom-in duration-500">
                    <div className="fc-glass p-8 rounded-[2.5rem] fc-card-glow text-center border border-primary/20">
                        <div className="mb-6 inline-flex h-16 w-16 bg-card border border-white/10 rounded-2xl items-center justify-center shadow-2xl">
                            <Trophy className="size-8 text-primary" />
                        </div>

                        <h2 className="text-2xl font-black italic text-white uppercase leading-tight mb-2">
                            Como te chamam no racha?
                        </h2>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-8">
                            Este nome será usado para vincular seu nível e estatísticas.
                        </p>

                        <div className="space-y-6">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 px-6 text-white font-bold text-center focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-white/10"
                                value={nomeEscolhido}
                                onChange={(e) => setNomeEscolhido(e.target.value)}
                                placeholder="Seu apelido ou nome na lista..."
                                autoFocus
                            />

                            <Button
                                onClick={finalizeProfile}
                                disabled={isFinalizing}
                                className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black italic uppercase rounded-2xl shadow-[0_0_30px_rgba(234,255,0,0.2)]"
                            >
                                {isFinalizing ? <Loader2 className="size-6 animate-spin" /> : "Entrar na Arena"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // --- RENDERIZAÇÃO ORIGINAL DO LOGIN ---
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-6 overflow-hidden">
            {/* Formas abstratas de luz ao fundo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] size-[400px] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* BOTÃO VOLTAR NO TOPO */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.2em] text-white/20 hover:text-primary transition-all group"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        Voltar para o início
                    </button>
                )}

                {/* Cabeçalho */}
                <div className="mb-10 text-center">
                    <div className="inline-flex mb-6 relative">
                        <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
                        <div className="relative h-16 w-16 bg-card border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                            <Trophy className="size-8 text-primary" />
                        </div>
                    </div>

                    <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                        FUT<span className="text-primary">MATCH</span>
                    </h1>
                </div>

                {/* Card de Login Estilo Vidro */}
                <div className="fc-glass p-8 rounded-[2.5rem] fc-card-glow relative overflow-hidden group border border-white/5">
                    {/* Linha de brilho superior */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-white italic uppercase tracking-tight">Login de Atleta</h2>
                        <p className="text-xs text-muted-foreground mt-1">Conecte sua conta para iniciar a temporada.</p>
                    </div>

                    <Button
                        type="button"
                        className="cursor-pointer w-full h-16 bg-primary hover:bg-primary/90 text-black font-black rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_0_30px_rgba(234,255,0,0.2)]"
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="size-6 animate-spin" />
                        ) : (
                            <>
                                <div className="bg-black/10 p-2 rounded-lg">
                                    <svg className="size-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </div>
                                <span className="uppercase italic tracking-wider text-sm">Entrar com Google</span>
                            </>
                        )}
                    </Button>

                    <div className="mt-8 flex items-center justify-center gap-2 text-zinc-500">
                        <LoaderPinwheel className="size-4 text-primary/50" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">BORA PRO RACHA</span>
                    </div>
                </div>
            </div>
        </div>
    )
}