import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DrawService = {
    async calculateTeams(
        groupId: string,
        presentNames: string[],
        absentNames: string[],
        useSmartDraw: boolean = false // <--- Adicionado o 4º parâmetro com padrão false
    ) {
        // 1. VERIFICAÇÃO DE STATUS
        // Se useSmartDraw for true, confiamos no componente.
        // Se for false, fazemos uma última checagem no banco para garantir segurança (trava blindada).
        let isEffectivelyPro = useSmartDraw;

        if (!isEffectivelyPro) {
            const groupRef = doc(db, "groups", groupId);
            const groupSnap = await getDoc(groupRef);

            if (groupSnap.exists()) {
                const groupData = groupSnap.data();
                const ownerId = groupData.ownerId;

                if (groupData.isPro && ownerId) {
                    const ownerSnap = await getDoc(doc(db, "users", ownerId));
                    if (ownerSnap.exists()) {
                        const ownerData = ownerSnap.data();
                        isEffectivelyPro = ownerData.isPro === true || ownerData.isSuperAdmin === true;
                    }
                }
            }
        }

        // 2. Busca metas (necessário para calcular o Power apenas se for PRO)
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

            return {
                name,
                // Se não for PRO, o power é fixo em 0 para não influenciar em nada
                power: isEffectivelyPro ? (Number(data.technique) * 1.5) + Number(data.speed) : 0
            };
        };

        const teams: { teamA: any[], teamB: any[], teamC: any[] } = {
            teamA: [], teamB: [], teamC: []
        };

        // 3. Processamento dos Jogadores Presentes
        if (isEffectivelyPro) {
            // --- LÓGICA PRO: EQUILÍBRIO POR PODER ---
            const presentPlayers = presentNames.map(mapPlayer).sort(() => Math.random() - 0.5);
            const sortedPresent = [...presentPlayers].sort((a, b) => b.power - a.power);

            sortedPresent.forEach((player, index) => {
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
            // --- LÓGICA FREE: SORTEIO TOTALMENTE ALEATÓRIO ---
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

        // 4. Adiciona os ausentes no Time C
        const absentPlayers = absentNames.map(mapPlayer);
        teams.teamC.push(...absentPlayers);

        // 5. Resultado final
        return {
            teamA: teams.teamA.sort(() => Math.random() - 0.5),
            teamB: teams.teamB.sort(() => Math.random() - 0.5),
            teamC: teams.teamC,
            scores: {
                a: teams.teamA.reduce((acc, p) => acc + p.power, 0),
                b: teams.teamB.reduce((acc, p) => acc + p.power, 0),
                c: teams.teamC.reduce((acc, p) => acc + p.power, 0)
            },
            drawType: isEffectivelyPro ? "pro_balanced" : "free_random"
        };
    }
};