import {db} from "@/lib/firebase";
import {doc, increment, runTransaction, serverTimestamp} from "firebase/firestore";

export const redeemCoupon = async (userId: string, couponCode: string) => {
    const couponRef = doc(db, "coupons", couponCode.toUpperCase());
    const userCouponRef = doc(db, `users/${userId}/used_coupons`, couponCode.toUpperCase());
    const userRef = doc(db, "users", userId);

    try {
        return await runTransaction(db, async (transaction) => {
            // 1. Verificar se o cupom existe
            const couponSnap = await transaction.get(couponRef);
            if (!couponSnap.exists()) {
                throw new Error("Cupom inválido ou inexistente.");
            }

            const couponData = couponSnap.data();

            // 2. Verificar validade e uso global
            if (couponData.usedCount >= couponData.maxUses) {
                throw new Error("Este cupom já atingiu o limite de usos.");
            }

            // 3. Verificar se o usuário já usou este cupom específico
            const userCouponSnap = await transaction.get(userCouponRef);
            if (userCouponSnap.exists()) {
                throw new Error("Você já utilizou este cupom.");
            }

            // 4. Buscar dados atuais do usuário para o "Empilhamento"
            const userSnap = await transaction.get(userRef);
            const userData = userSnap.data();

            let startDate = new Date();
            // Se o usuário já é PRO e o plano ainda não venceu, começamos a somar a partir do vencimento
            if (userData?.isPro && userData?.planExpiresAt) {
                const currentExpiration = new Date(userData.planExpiresAt);
                if (currentExpiration > startDate) {
                    startDate = currentExpiration;
                }
            }

            // 5. Calcular nova data (Data Base + Dias do Cupom)
            const daysToAdd = couponData.days;
            const newExpirationDate = new Date(startDate);
            newExpirationDate.setDate(newExpirationDate.getDate() + daysToAdd);

            // 6. Ações Atômicas:
            // a) Incrementar contador do cupom
            transaction.update(couponRef, { usedCount: increment(1) });

            // b) Registrar que o usuário usou o cupom
            transaction.set(userCouponRef, {
                redeemedAt: serverTimestamp(),
                daysAdded: daysToAdd
            });

            // c) Atualizar status do usuário
            transaction.update(userRef, {
                isPro: true,
                planExpiresAt: newExpirationDate.toISOString(),
                lastUpdated: serverTimestamp()
            });

            return { success: true, newExpiration: newExpirationDate };
        });
    } catch (error: any) {
        console.error("Erro ao resgatar cupom:", error);
        throw error;
    }
};