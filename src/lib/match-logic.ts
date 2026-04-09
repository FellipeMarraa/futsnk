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

            // VARIÁVEIS PARA CÁLCULO AUTOMÁTICO DE MVP
            let bestRoundPerformance = -1;
            let calculatedMvpName = "";

            // 1. Acumular votos técnicos
            ratingsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const playerRatings = data.ratings;
                if (!playerRatings) return;

                Object.keys(playerRatings).forEach(playerName => {
                    if (!statsAccumulator[playerName]) {
                        statsAccumulator[playerName] = { technique: [], speed: [], finishing: [], defense: [] };
                    }
                    const p = playerRatings[playerName];
                    if (p.technique) statsAccumulator[playerName].technique.push(p.technique);
                    if (p.speed) statsAccumulator[playerName].speed.push(p.speed);
                    if (p.finishing) statsAccumulator[playerName].finishing.push(p.finishing);
                    if (p.defense) statsAccumulator[playerName].defense.push(p.defense);
                });
            });

            const preMatchStats: any[] = [];

            const metaQuerySnap = await getDocs(collection(db, "groups", groupId, "players_meta"));
            const existingMetas = metaQuerySnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as PlayerMeta[];

            // 2. Loop sobre TODOS os jogadores da lista
            for (const playerName of players) {
                const nameLower = playerName.toLowerCase().trim();

                const existingMeta = existingMetas.find(m => {
                    const metaNome = (m.nomeLista || "").toLowerCase().trim();
                    return metaNome === nameLower || nameLower.includes(metaNome) || metaNome.includes(nameLower);
                });

                const targetDocId = existingMeta ? existingMeta.id : nameLower;
                const metaRef = doc(db, "groups", groupId, "players_meta", targetDocId);
                const metaDoc = await getDoc(metaRef);

                let currentStats = { technique: 50, speed: 50, finishing: 50, defense: 50 };

                if (metaDoc.exists()) {
                    const d = metaDoc.data();
                    currentStats = {
                        technique: Number(d.technique) || 50,
                        speed: Number(d.speed) || 50,
                        finishing: Number(d.finishing) || 50,
                        defense: Number(d.defense) || 50
                    };
                }

                preMatchStats.push({
                    playerId: targetDocId,
                    oldStats: currentStats
                });

                const acc = statsAccumulator[playerName];
                let finalTech, finalSpeed, finalFin, finalDef;

                if (acc && acc.technique.length > 0) {
                    const count = acc.technique.length;

                    // Médias da RODADA ATUAL (escala 0-100)
                    const roundTech = (acc.technique.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    const roundSpeed = (acc.speed.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    const roundFin = (acc.finishing.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    const roundDef = (acc.defense.reduce((a: any, b: any) => a + b, 0) / count) * 20;

                    // --- LÓGICA MVP AUTOMÁTICO ---
                    // Performance ponderada da rodada (Técnica e Chute pesam mais)
                    const currentPerformance = (roundTech * 0.4) + (roundFin * 0.3) + (roundSpeed * 0.15) + (roundDef * 0.15);

                    if (currentPerformance > bestRoundPerformance) {
                        bestRoundPerformance = currentPerformance;
                        calculatedMvpName = existingMeta?.nomeLista || playerName;
                    }

                    // Suavização 90/10 para o histórico
                    finalTech = (currentStats.technique * 0.9) + (roundTech * 0.1);
                    finalSpeed = (currentStats.speed * 0.9) + (roundSpeed * 0.1);
                    finalFin = (currentStats.finishing * 0.9) + (roundFin * 0.1);
                    finalDef = (currentStats.defense * 0.9) + (roundDef * 0.1);
                } else {
                    finalTech = currentStats.technique;
                    finalSpeed = currentStats.speed;
                    finalFin = currentStats.finishing;
                    finalDef = currentStats.defense;
                }

                await setDoc(metaRef, {
                    nomeLista: existingMeta?.nomeLista || playerName,
                    technique: Math.round(finalTech),
                    speed: Math.round(finalSpeed),
                    finishing: Math.round(finalFin),
                    defense: Math.round(finalDef),
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }

            // 3. Finalizar rodada salvando o MVP calculado
            await updateDoc(matchRef, {
                status: "finished",
                mvp: calculatedMvpName || "Ninguém", // Salva o nome do MVP automático
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