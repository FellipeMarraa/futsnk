import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DrawService = {
    async calculateTeams(groupId: string, presentNames: string[], absentNames: string[]) {
        // 1. Busca metas
        const q = query(collection(db, "groups", groupId, "players_meta"));
        const snap = await getDocs(q);
        const metaData = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        const mapPlayer = (name: string) => {
            const searchName = name.toLowerCase().trim();
            const data = metaData.find(m =>
                m.id.toLowerCase().trim() === searchName ||
                (m.nomeLista || "").toLowerCase().trim() === searchName ||
                (m.aliases || []).some((a: string) => a.toLowerCase().trim() === searchName)
            ) || { technique: 70, speed: 70 };
            return { name, power: (Number(data.technique) * 1.5) + Number(data.speed) };
        };

        // 2. Prepara os jogadores presentes (Embaralha e ordena para equilíbrio)
        const presentPlayers = presentNames.map(mapPlayer).sort(() => Math.random() - 0.5);
        const sortedPresent = [...presentPlayers].sort((a, b) => b.power - a.power);

        // 3. Prepara os ausentes (vão direto pro reserva)
        const absentPlayers = absentNames.map(mapPlayer);

        const teams: { teamA: any[], teamB: any[], teamC: any[] } = {
            teamA: [], teamB: [], teamC: []
        };

        // --- LÓGICA DE DISTRIBUIÇÃO CORRIGIDA ---
        // Distribuímos os jogadores de elite (pares de poder) entre A e B
        // até que ambos tenham 4 jogadores.

        sortedPresent.forEach((player, index) => {
            // Se o time A e B já têm 4, o restante vai para o C
            if (teams.teamA.length >= 4 && teams.teamB.length >= 4) {
                teams.teamC.push(player);
            }
            // Distribuição alternada para equilibrar o poder
            else if (index % 2 === 0) {
                if (teams.teamA.length < 4) teams.teamA.push(player);
                else teams.teamB.push(player);
            }
            else {
                if (teams.teamB.length < 4) teams.teamB.push(player);
                else teams.teamA.push(player);
            }
        });

        // 4. Adiciona os ausentes no Time C
        teams.teamC.push(...absentPlayers);

        // 5. Embaralha visualmente os times para não parecer que o primeiro é o melhor
        const finalA = teams.teamA.sort(() => Math.random() - 0.5);
        const finalB = teams.teamB.sort(() => Math.random() - 0.5);
        const finalC = teams.teamC;

        return {
            teamA: finalA,
            teamB: finalB,
            teamC: finalC,
            scores: {
                a: finalA.reduce((acc, p) => acc + p.power, 0),
                b: finalB.reduce((acc, p) => acc + p.power, 0),
                c: finalC.reduce((acc, p) => acc + p.power, 0)
            }
        };
    }
};