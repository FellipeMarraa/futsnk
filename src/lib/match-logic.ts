import {db} from "./firebase";
import {collection, doc, getDocs, serverTimestamp, setDoc, updateDoc} from "firebase/firestore";

interface PlayerMeta {
    id: string;
    nomeLista?: string;
    technique?: number;
    speed?: number;
    finishing?: number;
    defense?: number;
    userId?: string;
    aliases?: string[];
}

export const MatchLogic = {
    async finalizeMatch(groupId: string, matchId: string, players: string[]) {
        try {
            const matchRef = doc(db, "groups", groupId, "matches", matchId);
            const ratingsSnap = await getDocs(collection(db, "groups", groupId, "matches", matchId, "technical_ratings"));
            const statsAccumulator: Record<string, any> = {};

            ratingsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const playerRatings = data.ratings;
                if (!playerRatings) return;
                Object.keys(playerRatings).forEach(playerName => {
                    const pKey = playerName.toLowerCase().trim();
                    if (!statsAccumulator[pKey]) statsAccumulator[pKey] = { technique: [], speed: [], finishing: [], defense: [] };
                    const p = playerRatings[playerName];
                    statsAccumulator[pKey].technique.push(p.technique);
                    statsAccumulator[pKey].speed.push(p.speed);
                    statsAccumulator[pKey].finishing.push(p.finishing);
                    statsAccumulator[pKey].defense.push(p.defense);
                });
            });

            const metaQuerySnap = await getDocs(collection(db, "groups", groupId, "players_meta"));
            const existingMetas = metaQuerySnap.docs.map(d => ({ id: d.id, ...d.data() })) as PlayerMeta[];

            let bestRoundPerf = -1;
            let calculatedMvp = "";
            const preMatchStats: any[] = [];

            const MULTIPLICADOR = 25;

            for (const playerName of players) {
                const nameLower = playerName.toLowerCase().trim();

                const foundMeta = existingMetas.find(m =>
                    m.id.toLowerCase().trim() === nameLower ||
                    (m.nomeLista || "").toLowerCase().trim() === nameLower ||
                    (m.aliases || []).some(a => a.toLowerCase().trim() === nameLower)
                );

                const targetDocId = foundMeta ? foundMeta.id : nameLower;
                const metaRef = doc(db, "groups", groupId, "players_meta", targetDocId);

                // --- OTIMIZAÇÃO: Usar os dados que já buscamos acima em vez de getDoc ---
                const current = {
                    technique: Number(foundMeta?.technique) || 70,
                    speed: Number(foundMeta?.speed) || 70,
                    finishing: Number(foundMeta?.finishing) || 70,
                    defense: Number(foundMeta?.defense) || 70
                };

                preMatchStats.push({ playerId: targetDocId, oldStats: { ...current } });
                const acc = statsAccumulator[nameLower];
                const round = { technique: 75, speed: 75, finishing: 75, defense: 75 }; // Default 3 estrelas (75) se não houver votos

                if (acc && acc.technique.length > 0) {
                    const count = acc.technique.length;
                    round.technique = (acc.technique.reduce((a: any, b: any) => a + b, 0) / count) * MULTIPLICADOR;
                    round.speed = (acc.speed.reduce((a: any, b: any) => a + b, 0) / count) * MULTIPLICADOR;
                    round.finishing = (acc.finishing.reduce((a: any, b: any) => a + b, 0) / count) * MULTIPLICADOR;
                    round.defense = (acc.defense.reduce((a: any, b: any) => a + b, 0) / count) * MULTIPLICADOR;

                    const perf = (round.technique * 0.4) + (round.finishing * 0.3) + (round.speed * 0.15) + (round.defense * 0.15);
                    if (perf > bestRoundPerf) {
                        bestRoundPerf = perf;
                        calculatedMvp = foundMeta?.nomeLista || playerName;
                    }
                }

                const calc = (curr: number, rnd: number) => {
                    const PISO_SISTEMA = 70;
                    const TETO_SISTEMA = 99; // Opcional: Garante que não passe de 99

                    // Se a nota da rodada for maior, sobe 10% da diferença
                    if (rnd > curr) {
                        const novoValor = (curr * 0.90) + (rnd * 0.10);
                        return Number(Math.min(novoValor, TETO_SISTEMA).toFixed(2));
                    }

                    // Se for Elite (>= 85) e a nota for menor, cai 5% da diferença
                    if (curr >= 85) {
                        const queda = (curr * 0.95) + (rnd * 0.05);
                        return Number(Math.max(queda, PISO_SISTEMA).toFixed(2));
                    }

                    // Abaixo de 85, a nota nunca cai
                    return curr;
                };

                await setDoc(metaRef, {
                    nomeLista: foundMeta?.nomeLista || playerName,
                    technique: calc(current.technique, round.technique),
                    speed: calc(current.speed, round.speed),
                    finishing: calc(current.finishing, round.finishing),
                    defense: calc(current.defense, round.defense),
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }

            await updateDoc(matchRef, {
                status: "finished",
                mvp: calculatedMvp || "Ninguém",
                preMatchStats,
                updatedAt: serverTimestamp()
            });

            return { success: true };
        } catch (e) { console.error(e); throw e; }
    }
};