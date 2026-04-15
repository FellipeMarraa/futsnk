import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from "firebase-admin";

// Inicialização do Firebase Admin (usando as mesmas variáveis do seu checkout)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error: any) {
        console.error("❌ Erro na inicialização Admin:", error.message);
    }
}

const adminDb = admin.firestore();
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || ''
});

// Função para notificar o usuário via sua coleção de notificações (GlobalAlert)
async function sendSystemNotification(userId: string, message: string) {
    try {
        await adminDb.collection("system_notifications").add({
            target: "user",
            targetId: userId,
            message,
            type: "info",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Erro ao enviar notificação:", error);
    }
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { data, type, action } = req.body;

        // O Mercado Pago envia 'payment' no campo type
        if (type === 'payment' || action?.includes('payment')) {
            const paymentId = data?.id || req.body?.data?.id;
            if (!paymentId) return res.status(200).send('OK');

            const payment = new Payment(client);
            const p = await payment.get({ id: Number(paymentId) });

            if (p.status === 'approved') {
                const userId = p.external_reference; // O UID que enviamos no Checkout
                const amount = p.transaction_amount;

                if (!userId) {
                    console.error("❌ external_reference não encontrado.");
                    return res.status(200).send('OK');
                }

                // Lógica de Plano: Se for maior que R$ 100,00 tratamos como anual (exemplo)
                const isAnnual = amount && amount > 100;
                const daysToAdd = isAnnual ? 365 : 30;

                // No FutMatch, salvamos direto no documento do USUÁRIO
                const userRef = adminDb.collection("users").doc(userId);
                const userDoc = await userRef.get();

                let startDate = new Date();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // Se ele já tiver um plano ativo, somamos à data de expiração atual
                    if (userData?.planExpiresAt) {
                        const currentExp = new Date(userData.planExpiresAt);
                        if (currentExp > startDate) startDate = currentExp;
                    }
                }

                const expirationDate = new Date(startDate);
                expirationDate.setDate(expirationDate.getDate() + daysToAdd);

                // Atualizamos o usuário para PRO
                await userRef.set({
                    isPro: true, // Flag principal do FutMatch
                    planType: isAnnual ? 'annual' : 'monthly',
                    planExpiresAt: expirationDate.toISOString(),
                    lastPaymentId: String(paymentId),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                console.log(`✅ Plano PRO ativado para o usuário: ${userId}`);

                // Envia aquela notificação bacana que fizemos no GlobalAlert
                await sendSystemNotification(
                    userId,
                    `Sua assinatura PRO foi ativada! 🎉 Válida até ${expirationDate.toLocaleDateString('pt-BR')}.`
                );

                // --- Lógica de Indicação (Opcional, mantida do seu exemplo) ---
                const referralRef = adminDb.collection("referrals").doc(userId);
                const referralSnap = await referralRef.get();

                if (referralSnap.exists && referralSnap.data()?.status === 'PENDING_PAYMENT') {
                    const refData = referralSnap.data();
                    const referrerEmail = refData?.referrerEmail?.toLowerCase().trim();

                    // Busca quem indicou para dar o bônus de 30 dias
                    const referrerQuery = await adminDb.collection("users")
                        .where("email", "==", referrerEmail)
                        .limit(1)
                        .get();

                    if (!referrerQuery.empty) {
                        const referrerDoc = referrerQuery.docs[0];
                        const rData = referrerDoc.data();

                        let rStartDate = new Date();
                        if (rData?.planExpiresAt) {
                            const rExp = new Date(rData.planExpiresAt);
                            if (rExp > rStartDate) rStartDate = rExp;
                        }

                        const newRExp = new Date(rStartDate);
                        newRExp.setDate(newRExp.getDate() + 30);

                        await referrerDoc.ref.set({
                            isPro: true,
                            planExpiresAt: newRExp.toISOString()
                        }, { merge: true });

                        await referralRef.update({
                            status: 'COMPLETED',
                            completedAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        await sendSystemNotification(
                            referrerDoc.id,
                            "Bônus de Indicação! 🎉 Seu amigo assinou e você ganhou +30 dias de PRO!"
                        );
                    }
                }
            }
        }

        return res.status(200).send('OK');

    } catch (error: any) {
        console.error('❌ Webhook Error:', error.message);
        return res.status(200).send('Erro processado');
    }
}