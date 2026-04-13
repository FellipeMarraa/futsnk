import { db } from "./firebase";
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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

            for (const playerName of players) {
                const nameLower = playerName.toLowerCase().trim();

                // BUSCA MESTRE: ID, Nome ou Alias
                const foundMeta = existingMetas.find(m =>
                    m.id.toLowerCase().trim() === nameLower ||
                    (m.nomeLista || "").toLowerCase().trim() === nameLower ||
                    (m.aliases || []).some(a => a.toLowerCase().trim() === nameLower)
                );

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
                    round.technique = (acc.technique.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    round.speed = (acc.speed.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    round.finishing = (acc.finishing.reduce((a: any, b: any) => a + b, 0) / count) * 20;
                    round.defense = (acc.defense.reduce((a: any, b: any) => a + b, 0) / count) * 20;

                    const perf = (round.technique * 0.4) + (round.finishing * 0.3) + (round.speed * 0.15) + (round.defense * 0.15);
                    if (perf > bestRoundPerf) {
                        bestRoundPerf = perf;
                        calculatedMvp = foundMeta?.nomeLista || playerName;
                    }
                } else {
                    const NOTA_PADRAO = 60;
                    round = {
                        technique: NOTA_PADRAO,
                        speed: NOTA_PADRAO,
                        finishing: NOTA_PADRAO,
                        defense: NOTA_PADRAO
                    };
                }

                const calc = (curr: number, rnd: number) => rnd <= curr ? curr : Number(((curr * 0.90) + (rnd * 0.10)).toFixed(2));
                await setDoc(metaRef, {
                    nomeLista: foundMeta?.nomeLista || playerName,
                    technique: calc(current.technique, round.technique),
                    speed: calc(current.speed, round.speed),
                    finishing: calc(current.finishing, round.finishing),
                    defense: calc(current.defense, round.defense),
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }

            await updateDoc(matchRef, { status: "finished", mvp: calculatedMvp || "Ninguém", preMatchStats, updatedAt: serverTimestamp() });
            return { success: true };
        } catch (e) { console.error(e); throw e; }
    }
};