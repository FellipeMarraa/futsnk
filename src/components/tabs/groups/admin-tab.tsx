import {Crown} from "lucide-react"
import {Button} from "@/components/ui/button"
import {AdminPlayerManager} from "../../admin-player-manager"

interface AdminTabProps {
    groupId: string
    isPro: boolean
    isGroupPro: boolean
    onOpenUpgrade: () => void
}

export function AdminTab({ groupId, isPro, isGroupPro, onOpenUpgrade }: AdminTabProps) {
    if (isPro || isGroupPro) {
        return <AdminPlayerManager groupId={groupId} />;
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/5 rounded-3xl text-center px-8">
            <Crown className="size-10 text-primary mb-4 opacity-50" />
            <h3 className="text-sm font-black italic uppercase text-white mb-2">
                Sincronização de Atletas
            </h3>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest max-w-[250px] leading-relaxed mb-6">
                Assine o PRO para gerenciar apelidos (aliases) e garantir que o sorteio identifique todos os jogadores da sua lista.
            </p>
            <Button
                onClick={onOpenUpgrade}
                className="bg-primary text-black font-black text-[9px] uppercase italic rounded-full h-10 px-8"
            >
                Fazer Upgrade
            </Button>
        </div>
    );
}