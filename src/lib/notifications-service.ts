import {db} from "@/lib/firebase"
import {addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp} from "firebase/firestore"

export interface SystemNotification {
    id?: string
    target: "global" | "group" | "user"
    targetId?: string
    message: string
    type: "info" | "warning" | "error"
    createdAt: any
}

export const sendSystemNotification = async (notif: Omit<SystemNotification, "createdAt">) => {

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

export const subscribeToNotifications = (callback: (notifs: SystemNotification[]) => void) => {

    const q = query(
        collection(db, "system_notifications"),
        orderBy("createdAt", "desc"),
        limit(1)
    )

    return onSnapshot(q, (snap) => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification))
        callback(notifs)
    }, (error) => {
        console.error("Serviço: Erro no onSnapshot:", error);
    })
}