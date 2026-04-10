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
            let totalTech = 0, totalSpeed = 0, totalFin = 0, totalDef = 0, totalVotedEntries = 0;

            // 1. ACUMULAR VOTOS (Normalização de nomes para evitar que o jogador caia no 'voto solidário' por erro de digitação)
            ratingsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const playerRatings = data.ratings;
                if (!playerRatings) return;

                Object.keys(playerRatings).forEach(playerName => {
                    // AJUSTE 1: Normalizamos a chave aqui e na busca abaixo
                    const pKey = playerName.toLowerCase().trim();
                    if (!statsAccumulator[pKey]) {
                        statsAccumulator[pKey] = { technique: [], speed: [], finishing: [], defense: [] };
                    }
                    const p = playerRatings[playerName];
                    statsAccumulator[pKey].technique.push(p.technique);
                    statsAccumulator[pKey].speed.push(p.speed);
                    statsAccumulator[pKey].finishing.push(p.finishing);
                    statsAccumulator[pKey].defense.push(p.defense);

                    totalTech += p.technique; totalSpeed += p.speed; totalFin += p.finishing; totalDef += p.defense;
                    totalVotedEntries++;
                });
            });

            const globalAvg = totalVotedEntries > 0 ? {
                technique: (totalTech / totalVotedEntries) * 20,
                speed: (totalSpeed / totalVotedEntries) * 20,
                finishing: (totalFin / totalVotedEntries) * 20,
                defense: (totalDef / totalVotedEntries) * 20
            } : { technique: 70, speed: 70, finishing: 70, defense: 70 };

            const metaQuerySnap = await getDocs(collection(db, "groups", groupId, "players_meta"));
            const existingMetas = metaQuerySnap.docs.map(d => ({ id: d.id, ...d.data() })) as PlayerMeta[];

            let bestRoundPerf = -1;
            let calculatedMvp = "";
            const preMatchStats: any[] = [];

            // 2. PROCESSAR CADA JOGADOR
            for (const playerName of players) {
                const nameLower = playerName.toLowerCase().trim();

                // AJUSTE 2: Busca de meta mais robusta (por UID ou Nome)
                const existingMeta = existingMetas.find(m => (m.nomeLista || "").toLowerCase().trim() === nameLower);
                const targetDocId = existingMeta ? existingMeta.id : nameLower;

                const metaRef = doc(db, "groups", groupId, "players_meta", targetDocId);
                const metaDoc = await getDoc(metaRef);

                let current = { technique: 70, speed: 70, finishing: 70, defense: 70 };
                if (metaDoc.exists()) {
                    const d = metaDoc.data();
                    current = {
                        technique: Number(d.technique) || 70,
                        speed: Number(d.speed) || 70,
                        finishing: Number(d.finishing) || 70,
                        defense: Number(d.defense) || 70
                    };
                }

                // Backup dos status exatos antes do novo cálculo
                preMatchStats.push({ playerId: targetDocId, oldStats: { ...current } });

                const acc = statsAccumulator[nameLower];
                let round = { technique: 0, speed: 0, finishing: 0, defense: 0 };

                if (acc && acc.technique.length > 0) {
                    const count = acc.technique.length;
                    round.technique = (acc.technique.reduce((a:any,b:any)=>a+b,0)/count)*20;
                    round.speed = (acc.speed.reduce((a:any,b:any)=>a+b,0)/count)*20;
                    round.finishing = (acc.finishing.reduce((a:any,b:any)=>a+b,0)/count)*20;
                    round.defense = (acc.defense.reduce((a:any,b:any)=>a+b,0)/count)*20;

                    const perf = (round.technique*0.4)+(round.finishing*0.3)+(round.speed*0.15)+(round.defense*0.15);
                    if (perf > bestRoundPerf) {
                        bestRoundPerf = perf;
                        calculatedMvp = existingMeta?.nomeLista || playerName;
                    }
                } else {
                    round = {
                        technique: globalAvg.technique * 0.9,
                        speed: globalAvg.speed * 0.9,
                        finishing: globalAvg.finishing * 0.9,
                        defense: globalAvg.defense * 0.9
                    };
                }

                // AJUSTE 3: LÓGICA ASSIMÉTRICA COM COMPARAÇÃO INDIVIDUAL
                // Aqui resolvemos o problema de subir menos: cada atributo é comparado isoladamente
                const calc = (curr: number, rnd: number) => {
                    // Se a nota da rodada for maior que a ATUAL daquele atributo específico
                    const isImprovement = rnd > curr;
                    const weight = isImprovement ? 0.10 : 0.02;

                    const newValue = (curr * (1 - weight)) + (rnd * weight);
                    return Math.max(70, newValue);
                };

                await setDoc(metaRef, {
                    nomeLista: existingMeta?.nomeLista || playerName,
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
                preMatchStats: preMatchStats,
                updatedAt: serverTimestamp()
            });

            return { success: true };
        } catch (e) { console.error(e); throw e; }
    }
};