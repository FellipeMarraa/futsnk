import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { GroupService } from "@/lib/firebase-services";
import { Loader2, Trophy } from "lucide-react";

export default function JoinGroup() {
    const { groupId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

    useEffect(() => {
        async function processJoin() {
            if (!user || !groupId) return;

            try {
                const result = await GroupService.joinGroupById(groupId, user.uid, user.email!);
                setStatus('success');
                // Redireciona para o grupo após 2 segundos
                setTimeout(() => navigate(`/groups/${groupId}`), 2000);
            } catch (error) {
                console.error(error);
                setStatus('error');
            }
        }

        if (user) processJoin();
    }, [user, groupId, navigate]);

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <Trophy className="size-12 text-primary mb-4" />
                <h1 className="text-xl font-black uppercase italic text-white">Convite Recebido!</h1>
                <p className="text-white/40 text-sm mt-2 mb-6">Você precisa estar logado para entrar no clube.</p>
                <button onClick={() => navigate('/login')} className="bg-primary px-8 py-3 rounded-xl font-black uppercase italic text-sm">Fazer Login</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            {status === 'loading' && (
                <>
                    <Loader2 className="size-8 animate-spin text-primary mb-4" />
                    <p className="text-white font-black uppercase italic">Validando Convite...</p>
                </>
            )}
            {status === 'success' && (
                <div className="animate-in zoom-in duration-500 text-center">
                    <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="size-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black uppercase italic text-white">Bem-vindo ao Clube!</h1>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2">Sincronizando vestiário...</p>
                </div>
            )}
            {status === 'error' && (
                <p className="text-red-500 font-black uppercase italic">Erro ao entrar no grupo ou link inválido.</p>
            )}
        </div>
    );
}