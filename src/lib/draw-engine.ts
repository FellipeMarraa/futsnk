import type {Player} from "@/lib/types.ts";

export function generateBalancedTeams(players: Player[], teamsCount: number = 2) {
    const getScore = (p: Player) => (p.technique * 0.6) + (p.speed * 0.4);

    const sorted = [...players].sort((a, b) => getScore(b) - getScore(a));

    const teams: Player[][] = Array.from({ length: teamsCount }, () => []);

    sorted.forEach((player, index) => {
        const round = Math.floor(index / teamsCount);
        const isForward = round % 2 === 0;
        const teamIndex = isForward ? (index % teamsCount) : (teamsCount - 1 - (index % teamsCount));

        teams[teamIndex].push(player);
    });

    return teams;
}