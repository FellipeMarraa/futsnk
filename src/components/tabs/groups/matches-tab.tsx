import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Calendar, ChevronRight, Users} from "lucide-react"

interface MatchesTabProps {
    matches: any[]
    groupTime: string
    isGroupPro: boolean
    onSelectMatch: (match: any) => void
    userIsAdmin: boolean
    isPro: boolean
    onOpenUpgrade: () => void
}

export function MatchesTab({
                               matches,
                               groupTime,
                               isGroupPro,
                               onSelectMatch,
                               userIsAdmin,
                               isPro,
                               onOpenUpgrade
                           }: MatchesTabProps) {

    const isVotingOpen = (matchDate: string, matchTime: string) => {
        if (!matchDate || !matchTime) return false;
        const [hours, minutes] = matchTime.split(':').map(Number);
        const gameTime = new Date(matchDate);
        gameTime.setHours(hours + 1, minutes, 0);
        return new Date() >= gameTime;
    };

    if (matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                <Calendar className="size-10 text-white/10 mb-2" />
                <p className="text-[10px] font-bold text-white/20 uppercase">Nenhuma rodada agendada.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Histórico da Temporada</h3>
                {!isPro && userIsAdmin && (
                    <button onClick={onOpenUpgrade} className="text-[8px] font-black text-primary uppercase animate-pulse">
                        Ver Estatísticas PRO
                    </button>
                )}
            </div>

            <div className="grid gap-3 w-full">
                {matches.map((match, idx) => {
                    const votingOpen = isVotingOpen(match.date, groupTime);
                    const matchNumber = matches.length - idx;

                    const getStatusConfig = (status: string) => {
                        switch (status) {
                            case 'finished': return { label: 'Encerrada', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
                            case 'voting_open': return { label: 'Votação Aberta', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' };
                            case 'drawn': return { label: 'Sorteada', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
                            default: return { label: 'Iniciada', color: 'bg-primary/10 text-primary border-primary/20' };
                        }
                    };

                    const matchStatus = getStatusConfig(match.status);

                    return (
                        <Card
                            key={match.id}
                            className={`w-full cursor-pointer border-none bg-white/[0.03] active:bg-white/[0.08] transition-all rounded-[1.5rem] group overflow-hidden shadow-lg ${isGroupPro ? 'hover:bg-primary/[0.05]' : ''}`}
                            onClick={() => onSelectMatch(match)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`size-11 rounded-xl bg-zinc-900 border flex flex-col items-center justify-center shrink-0 shadow-inner text-white ${isGroupPro ? 'border-primary/20' : 'border-white/5'}`}>
                                        <span className="text-[10px] font-black text-primary leading-none uppercase">
                                            {new Date(match.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                                        </span>
                                        <span className="text-[7px] text-white/40 uppercase font-bold">
                                            {new Date(match.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                        </span>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black italic text-sm text-white uppercase tracking-tight truncate">
                                                Rodada #{matchNumber}
                                            </p>
                                            {match.status === 'drawn' && votingOpen && (
                                                <div className="size-2 bg-amber-500 rounded-full animate-pulse shrink-0" />
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black text-white/40 uppercase flex items-center gap-1.5 mt-0.5">
                                            <Users className="size-3 text-primary" /> {match.confirmedPlayers?.length || 0} Atletas
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <Badge className={`${matchStatus.color} border text-[8px] font-black uppercase italic tracking-tighter rounded px-2`}>
                                        {matchStatus.label}
                                    </Badge>
                                    <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}