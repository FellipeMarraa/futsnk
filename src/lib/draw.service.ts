import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DrawService = {
    async calculateTeams(groupId: string, presentNames: string[], absentNames: string[]) {
        // 1. Verificar se o grupo é PRO para decidir a lógica de sorteio
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);
        const isGroupPro = groupSnap.exists() && (groupSnap.data().isPro || false);

        // 2. Busca metas (players_meta)
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

            // Mantendo seu cálculo de poder original
            return {
                name,
                power: (Number(data.technique) * 1.5) + Number(data.speed)
            };
        };

        const teams: { teamA: any[], teamB: any[], teamC: any[] } = {
            teamA: [], teamB: [], teamC: []
        };

        // 3. Processamento dos Jogadores Presentes
        if (isGroupPro) {
            // --- LÓGICA PRO: EQUILÍBRIO POR PODER ---
            const presentPlayers = presentNames.map(mapPlayer).sort(() => Math.random() - 0.5);
            const sortedPresent = [...presentPlayers].sort((a, b) => b.power - a.power);

            sortedPresent.forEach((player, index) => {
                // Mantendo sua trava de 4 jogadores por time (A e B)
                if (teams.teamA.length >= 4 && teams.teamB.length >= 4) {
                    teams.teamC.push(player);
                }
                else if (index % 2 === 0) {
                    if (teams.teamA.length < 4) teams.teamA.push(player);
                    else teams.teamB.push(player);
                }
                else {
                    if (teams.teamB.length < 4) teams.teamB.push(player);
                    else teams.teamA.push(player);
                }
            });
        } else {
            // --- LÓGICA FREE: SORTEIO ALEATÓRIO (IGNORA POWER) ---
            const presentPlayers = presentNames.map(name => ({ name, power: 0 }));
            const shuffled = [...presentPlayers].sort(() => Math.random() - 0.5);

            shuffled.forEach((player) => {
                if (teams.teamA.length < 4) {
                    teams.teamA.push(player);
                } else if (teams.teamB.length < 4) {
                    teams.teamB.push(player);
                } else {
                    teams.teamC.push(player);
                }
            });
        }

        // 4. Prepara e adiciona os ausentes no Time C
        const absentPlayers = absentNames.map(mapPlayer);
        teams.teamC.push(...absentPlayers);

        // 5. Embaralha visualmente para o resultado final
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
            },
            drawType: isGroupPro ? "pro_balanced" : "free_random"
        };
    }
};