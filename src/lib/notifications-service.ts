import { db } from "./firebase";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from "firebase/firestore";

export interface SystemNotification {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    target: string;
    targetId: string;
    createdAt: any;
}

/**
 * Inscreve o usuário logado para receber apenas suas notificações privadas.
 */
export function subscribeToNotifications(userId: string, callback: (notifs: SystemNotification[]) => void) {
    // Referência da coleção
    const notificationsRef = collection(db, "system_notifications");

    // Query blindada: Filtra apenas notificações destinadas ao UID do usuário logado
    const q = query(
        notificationsRef,
        where("targetId", "==", userId), // <-- Trava de segurança
        orderBy("createdAt", "desc"),
        limit(1)
    );

    // Escuta em tempo real
    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as SystemNotification[];

        callback(notifs);
    }, (error) => {
        console.error("Erro ao ouvir notificações:", error);
    });
}