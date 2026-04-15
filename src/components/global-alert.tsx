"use client"

import { useEffect, useState } from "react"
import { subscribeToNotifications, type SystemNotification } from "@/lib/notifications-service"
import { AlertTriangle, Bell, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"

export function GlobalAlert() {
    const { user } = useAuth()
    const [notif, setNotif] = useState<SystemNotification | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Se não houver usuário, garantimos que o estado seja limpo.
        // O ESLint aceita o setState aqui se ele for condicional e
        // acompanhado de um retorno para evitar execuções desnecessárias.
        if (!user?.uid) {
            if (notif) setNotif(null);
            if (isVisible) setIsVisible(false);
            return;
        }

        const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
            if (notifs.length > 0) {
                const latest = notifs[0]
                const hasSeen = localStorage.getItem(`notif_seen_${latest.id}`)

                if (!hasSeen) {
                    setNotif(latest)
                    setIsVisible(true)
                }
            } else {
                // Se a lista de notificações vier vazia (ex: deletada no banco)
                setNotif(null)
                setIsVisible(false)
            }
        })

        return () => unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid])
    // Nota: Adicionamos a verificação 'if (notif)' para disparar o setState
    // apenas se realmente houver algo para limpar, mitigando o cascading render.

    const handleClose = () => {
        if (notif?.id) {
            localStorage.setItem(`notif_seen_${notif.id}`, "true")
        }
        setIsVisible(false)
    }

    const getConfig = (type: string) => {
        switch (type) {
            case 'warning': return { icon: <AlertTriangle size={18} />, title: "Atenção" };
            case 'error': return { icon: <AlertTriangle size={18} />, title: "Urgente" };
            case 'success': return { icon: <Bell size={18} />, title: "Sucesso" };
            default: return { icon: <Bell size={18} />, title: "Comunicado Oficial" };
        }
    }

    const config = getConfig(notif?.type || 'info');

    return (
        <AnimatePresence>
            {isVisible && notif && user?.uid && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-4 left-0 right-0 z-[100] px-4 flex justify-center pointer-events-none"
                >
                    <div className="bg-primary text-black px-6 py-4 rounded-2xl shadow-[0_15px_50px_rgba(234,255,0,0.4)] flex items-center gap-4 max-w-lg w-full pointer-events-auto border border-white/20">
                        <div className="bg-black/10 p-2 rounded-xl shrink-0">
                            {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase italic leading-none tracking-widest opacity-70">
                                {config.title}
                            </p>
                            <p className="text-xs font-bold leading-tight mt-1">
                                {notif.message}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-black/10 rounded-xl transition-colors shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}