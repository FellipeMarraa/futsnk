import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DrawService = {
    async calculateTeams(groupId: string, confirmedNames: string[]) {
        const q = query(collection(db, "groups", groupId, "players_meta"));
        const snap = await getDocs(q);

        // Mapeamos os dados brutos
        const metaData: any[] = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        // Substitua o trecho da busca (players.map) por este:
        const players = confirmedNames.map(name => {
            const searchName = name.toLowerCase().trim();

            // Procura o doc onde o ID bate ou o campo nomeLista bate
            const data = metaData.find(m => {
                const metaNomeLista = (m.nomeLista || "").toLowerCase().trim();
                const metaId = m.id.toLowerCase().trim();
                const metaUserId = m.userId || "";

                return metaId === searchName ||
                    metaNomeLista === searchName ||
                    metaUserId === "YvfLIEWLr1cf9cj3kVRnMl5TSrk1" ||
                    metaNomeLista.includes(searchName);
            }) || { technique: 70, speed: 70, finishing: 70, defense: 70 };

            return {
                name,
                power: (Number(data.technique) * 1.5) + Number(data.speed)
            };
        });

        // Ordenação por nível técnico
        const sortedPlayers = [...players].sort((a, b) => b.power - a.power);

        const teams: { teamA: any[], teamB: any[], teamC: any[] } = {
            teamA: [],
            teamB: [],
            teamC: []
        };

        const shuffle = (array: any[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // Distribuição equilibrada (Snake Draft adaptado com Shuffle por potes)
        for (let i = 0; i < sortedPlayers.length; i += 3) {
            const trio = sortedPlayers.slice(i, i + 3);
            const shuffledTrio = shuffle([...trio]);

            if (shuffledTrio[0]) teams.teamA.push(shuffledTrio[0]);
            if (shuffledTrio[1]) teams.teamB.push(shuffledTrio[1]);
            if (shuffledTrio[2]) teams.teamC.push(shuffledTrio[2]);
        }

        const calculateScore = (team: any[]) => team.reduce((acc, p) => acc + p.power, 0);

        return {
            teamA: teams.teamA,
            teamB: teams.teamB,
            teamC: teams.teamC,
            scores: {
                a: calculateScore(teams.teamA),
                b: calculateScore(teams.teamB),
                c: calculateScore(teams.teamC)
            }
        };
    }
};