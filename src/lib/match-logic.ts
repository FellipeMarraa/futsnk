import { db } from "./firebase";
import {
    collection,
    doc,
    getDocs,
    updateDoc,
    getDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

interface PlayerMeta {
    id: string;
    nomeLista?: string;
    technique?: number;
    speed?: number;
    finishing?: number;
    defense?: number;
}

export const MatchLogic = {
    async finalizeMatch(groupId: string, matchId: string, players: string[]) {
        try {
            const matchRef = doc(db, "groups", groupId, "matches", matchId);
            const ratingsSnap = await getDocs(collection(db, "groups", groupId, "matches", matchId, "technical_ratings"));

            const statsAccumulator: Record<string, any> = {};

            // --- 1. ACUMULAR VOTOS E CALCULAR MÉDIA GLOBAL DA RODADA ---
            let totalTech = 0, totalSpeed = 0, totalFin = 0, totalDef = 0, totalVotedEntries = 0;

            ratingsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const playerRatings = data.ratings;
                if (!playerRatings) return;

                Object.keys(playerRatings).forEach(playerName => {
                    if (!statsAccumulator[playerName]) {
                        statsAccumulator[playerName] = { technique: [], speed: [], finishing: [], defense: [] };
                    }
                    const p = playerRatings[playerName];

                    statsAccumulator[playerName].technique.push(p.technique);
                    statsAccumulator[playerName].speed.push(p.speed);
                    statsAccumulator[playerName].finishing.push(p.finishing);
                    statsAccumulator[playerName].defense.push(p.defense);

                    totalTech += p.technique;
                    totalSpeed += p.speed;
                    totalFin += p.finishing;
                    totalDef += p.defense;
                    totalVotedEntries++;
                });
            });

            const globalRoundAverage = totalVotedEntries > 0 ? {
                technique: (totalTech / totalVotedEntries) * 20,
                speed: (totalSpeed / totalVotedEntries) * 20,
                finishing: (totalFin / totalVotedEntries) * 20,
                defense: (totalDef / totalVotedEntries) * 20
            } : { technique: 75, speed: 75, finishing: 75, defense: 75 };

            const metaQuerySnap = await getDocs(collection(db, "groups", groupId, "players_meta"));
            const existingMetas = metaQuerySnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as PlayerMeta[];

            let bestRoundPerformance = -1;
            let calculatedMvpName = "";
            const preMatchStats: any[] = [];

            // --- 2. LOOP DE PROCESSAMENTO POR JOGADOR ---
            for (const playerName of players) {
                const nameLower = playerName.toLowerCase().trim();

                const existingMeta = existingMetas.find(m => {
                    const metaNome = (m.nomeLista || "").toLowerCase().trim();
                    return metaNome === nameLower || nameLower.includes(metaNome) || metaNome.includes(nameLower);
                });

                const targetDocId = existingMeta ? existingMeta.id : nameLower;
                const metaRef = doc(db, "groups", groupId, "players_meta", targetDocId);
                const metaDoc = await getDoc(metaRef);

                let currentStats = { technique: 70, speed: 70, finishing: 70, defense: 70 };

                if (metaDoc.exists()) {
                    const d = metaDoc.data();
                    currentStats = {
                        technique: Number(d.technique) || 70,
                        speed: Number(d.speed) || 70,
                        finishing: Number(d.finishing) || 70,
                        defense: Number(d.defense) || 70
                    };
                }

                preMatchStats.push({
                    playerId: targetDocId,
                    oldStats: currentStats
                });

                const acc = statsAccumulator[playerName];
                let roundTech, roundSpeed, roundFin, roundDef;

                if (acc && acc.technique.length > 0) {
                    const count = acc.technique.length;
                    roundTech = (acc.technique.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    roundSpeed = (acc.speed.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    roundFin = (acc.finishing.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    roundDef = (acc.defense.reduce((a: any, b: any) => a + b, 0) / count) * 20;

                    const currentPerformance = (roundTech * 0.4) + (roundFin * 0.3) + (roundSpeed * 0.15) + (roundDef * 0.15);
                    if (currentPerformance > bestRoundPerformance) {
                        bestRoundPerformance = currentPerformance;
                        calculatedMvpName = existingMeta?.nomeLista || playerName;
                    }
                } else {
                    roundTech = globalRoundAverage.technique * 0.9;
                    roundSpeed = globalRoundAverage.speed * 0.9;
                    roundFin = globalRoundAverage.finishing * 0.9;
                    roundDef = globalRoundAverage.defense * 0.9;
                }

                /**
                 * LÓGICA DE EVOLUÇÃO ASSIMÉTRICA:
                 * Subir é fácil (10% de impacto), descer é difícil (apenas 2% de impacto).
                 * Isso valoriza o bom desempenho e protege o histórico de um jogo ruim.
                 */
                const calculateAsymmetricStat = (current: number, round: number) => {
                    const isImprovement = round > current;
                    const weight = isImprovement ? 0.10 : 0.02; // 10% para subir, 2% para descer
                    const newValue = (current * (1 - weight)) + (round * weight);
                    return Math.max(70, newValue); // Piso de 70 garantido
                };

                const finalTech = calculateAsymmetricStat(currentStats.technique, roundTech);
                const finalSpeed = calculateAsymmetricStat(currentStats.speed, roundSpeed);
                const finalFin = calculateAsymmetricStat(currentStats.finishing, roundFin);
                const finalDef = calculateAsymmetricStat(currentStats.defense, roundDef);

                await setDoc(metaRef, {
                    nomeLista: existingMeta?.nomeLista || playerName,
                    technique: finalTech,
                    speed: finalSpeed,
                    finishing: finalFin,
                    defense: finalDef,
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }

            await updateDoc(matchRef, {
                status: "finished",
                mvp: calculatedMvpName || "Ninguém",
                preMatchStats: preMatchStats,
                updatedAt: serverTimestamp()
            });

            return { success: true };
        } catch (e) {
            console.error("Erro ao finalizar rodada:", e);
            throw e;
        }
    }
};