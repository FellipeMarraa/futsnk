import { db } from "@/lib/firebase"
import {
    addDoc,
    collection,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where
} from "firebase/firestore"

export interface SystemNotification {
    id?: string
    target: "global" | "group" | "user"
    targetId?: string
    message: string
    type: "info" | "warning" | "error" | "success"
    createdAt: any
}

/**
 * Envia uma notificação para o sistema (usado por Webhooks ou Admin)
 */
export const sendSystemNotification = async (notif: Omit<SystemNotification, "createdAt">) => {
    // Garante que o objeto não tenha funções ou campos undefined para o Firestore
    const cleanData = JSON.parse(JSON.stringify(notif));

    try {
        const docRef = await addDoc(collection(db, "system_notifications"), {
            ...cleanData,
            createdAt: serverTimestamp()
        });
        return docRef;
    } catch (error) {
        console.error("Serviço: Erro ao adicionar documento:", error);
        throw error;
    }
}

/**
 * Escuta em tempo real as notificações destinadas APENAS ao usuário logado
 */
export const subscribeToNotifications = (userId: string, callback: (notifs: SystemNotification[]) => void) => {
    // Filtramos para que o Firestore entregue apenas notificações
    // onde o targetId seja o UID do usuário logado
    const q = query(
        collection(db, "system_notifications"),
        where("targetId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(1)
    )

    return onSnapshot(q, (snap) => {
        const notifs = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        } as SystemNotification))

        callback(notifs)
    }, (error) => {
        console.error("Serviço: Erro no onSnapshot:", error);
    })
}