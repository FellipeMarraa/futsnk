import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DrawService = {
    async calculateTeams(groupId: string, confirmedNames: string[]) {
        const q = query(collection(db, "groups", groupId, "players_meta"));
        const snap = await getDocs(q);
        const metaData = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        const players = confirmedNames.map(name => {
            const searchName = name.toLowerCase().trim();
            const data = metaData.find(m =>
                m.id.toLowerCase().trim() === searchName ||
                (m.nomeLista || "").toLowerCase().trim() === searchName ||
                (m.aliases || []).some((a: string) => a.toLowerCase().trim() === searchName)
            ) || { technique: 70, speed: 70 };

            return { name, power: (Number(data.technique) * 1.5) + Number(data.speed) };
        });

        const sortedPlayers = [...players].sort((a, b) => b.power - a.power);
        const teams: { teamA: any[], teamB: any[], teamC: any[] } = { teamA: [], teamB: [], teamC: [] };

        const shuffle = (array: any[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        for (let i = 0; i < sortedPlayers.length; i += 3) {
            const trio = sortedPlayers.slice(i, i + 3);
            const shuffledTrio = shuffle([...trio]);
            if (shuffledTrio[0]) teams.teamA.push(shuffledTrio[0]);
            if (shuffledTrio[1]) teams.teamB.push(shuffledTrio[1]);
            if (shuffledTrio[2]) teams.teamC.push(shuffledTrio[2]);
        }

        return {
            teamA: teams.teamA, teamB: teams.teamB, teamC: teams.teamC,
            scores: {
                a: teams.teamA.reduce((acc, p) => acc + p.power, 0),
                b: teams.teamB.reduce((acc, p) => acc + p.power, 0),
                c: teams.teamC.reduce((acc, p) => acc + p.power, 0)
            }
        };
    }
};