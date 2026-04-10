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

            // 1. Acumular votos dos jogadores avaliados na rodada
            ratingsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const playerRatings = data.ratings;
                if (!playerRatings) return;

                Object.keys(playerRatings).forEach(playerName => {
                    const pKey = playerName.toLowerCase().trim();
                    if (!statsAccumulator[pKey]) {
                        statsAccumulator[pKey] = { technique: [], speed: [], finishing: [], defense: [] };
                    }
                    const p = playerRatings[playerName];
                    statsAccumulator[pKey].technique.push(p.technique);
                    statsAccumulator[pKey].speed.push(p.speed);
                    statsAccumulator[pKey].finishing.push(p.finishing);
                    statsAccumulator[pKey].defense.push(p.defense);
                });
            });

            // 2. Buscar Metas existentes para vincular nomes ao UID correto
            const metaQuerySnap = await getDocs(collection(db, "groups", groupId, "players_meta"));
            const existingMetas = metaQuerySnap.docs.map(d => ({ id: d.id, ...d.data() })) as PlayerMeta[];

            let bestRoundPerf = -1;
            let calculatedMvp = "";
            const preMatchStats: any[] = [];

            // 3. Processar cada jogador da lista de confirmados
            for (const playerName of players) {
                const nameLower = playerName.toLowerCase().trim();

                // Busca robusta para evitar duplicidade (ID longo vs nome curto)
                const foundMeta = existingMetas.find(m => {
                    const metaNomeLista = (m.nomeLista || "").toLowerCase().trim();
                    const metaId = m.id.toLowerCase().trim();
                    return metaNomeLista === nameLower || metaId === nameLower || metaNomeLista.includes(nameLower) || nameLower.includes(metaNomeLista);
                });

                const targetDocId = foundMeta ? foundMeta.id : nameLower;
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

                preMatchStats.push({ playerId: targetDocId, oldStats: { ...current } });

                const acc = statsAccumulator[nameLower];
                let round = { technique: 0, speed: 0, finishing: 0, defense: 0 };

                if (acc && acc.technique.length > 0) {
                    const count = acc.technique.length;
                    round.technique = (acc.technique.reduce((a: number, b: number) => a + b, 0) / count) * 20;
                    round.speed = (acc.speed.reduce((a: number, b: number) => a + b, 0) / count) * 20;
                    round.finishing = (acc.finishing.reduce((a: number, b: number) => a + b, 0) / count) * 20;
                    round.defense = (acc.defense.reduce((a: number, b: number) => a + b, 0) / count) * 20;

                    const currentPerf = (round.technique * 0.4) + (round.finishing * 0.3) + (round.speed * 0.15) + (round.defense * 0.15);
                    if (currentPerf > bestRoundPerf) {
                        bestRoundPerf = currentPerf;
                        calculatedMvp = foundMeta?.nomeLista || playerName;
                    }
                } else {
                    // Se não houve votos, a performance da rodada é igual à atual (sem mudança)
                    round = { ...current };
                }

                /**
                 * LÓGICA DE PROGRESSÃO:
                 * Se a nota da rodada (rnd) for maior que a atual (curr), sobe 5% da diferença.
                 * Se for menor ou igual, mantém o valor atual (nível conquistado não se perde).
                 */
                const calc = (curr: number, rnd: number) => {
                    if (rnd <= curr) return curr;
                    const weight = 0.05;
                    const novoValor = (curr * (1 - weight)) + (rnd * weight);
                    return Number(novoValor.toFixed(2));
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
                preMatchStats: preMatchStats,
                updatedAt: serverTimestamp()
            });

            return { success: true };
        } catch (e) {
            console.error("Erro ao finalizar partida:", e);
            throw e;
        }
    }
};