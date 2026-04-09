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

export const MatchLogic = {
    async finalizeMatch(groupId: string, matchId: string, players: string[]) {
        try {
            const matchRef = doc(db, "groups", groupId, "matches", matchId);
            const ratingsSnap = await getDocs(collection(db, "groups", groupId, "matches", matchId, "technical_ratings"));

            const statsAccumulator: Record<string, any> = {};

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

            // 2. Loop sobre TODOS os jogadores da lista (Garante que o MVP e outros apareçam)
            for (const playerName of players) {
                const docId = playerName.toLowerCase().trim();
                const metaRef = doc(db, "groups", groupId, "players_meta", docId);
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

                // Salva snapshot para rollback
                preMatchStats.push({
                    playerId: docId,
                    oldStats: currentStats
                });

                // Verifica se este jogador recebeu votos técnicos
                const acc = statsAccumulator[playerName];

                let finalTech, finalSpeed, finalFin, finalDef;

                if (acc && acc.technique.length > 0) {
                    // Se teve votos, calcula a média
                    const count = acc.technique.length;
                    const roundTech = (acc.technique.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    const roundSpeed = (acc.speed.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    const roundFin = (acc.finishing.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    const roundDef = (acc.defense.reduce((a: any, b: any) => a + b, 0) / count) * 20;

                    // Suavização 90/10
                    finalTech = (currentStats.technique * 0.9) + (roundTech * 0.1);
                    finalSpeed = (currentStats.speed * 0.9) + (roundSpeed * 0.1);
                    finalFin = (currentStats.finishing * 0.9) + (roundFin * 0.1);
                    finalDef = (currentStats.defense * 0.9) + (roundDef * 0.1);
                } else {
                    // Se não recebeu votos técnicos, mantém a nota que já tinha (ou 50 se for novo)
                    finalTech = currentStats.technique;
                    finalSpeed = currentStats.speed;
                    finalFin = currentStats.finishing;
                    finalDef = currentStats.defense;
                }

                // Salva no players_meta (Isso garante que o jogador NOVO apareça na aba Níveis)
                await setDoc(metaRef, {
                    nomeLista: playerName,
                    technique: Math.round(finalTech),
                    speed: Math.round(finalSpeed),
                    finishing: Math.round(finalFin),
                    defense: Math.round(finalDef),
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }

            // 3. Finalizar rodada
            await updateDoc(matchRef, {
                status: "finished",
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