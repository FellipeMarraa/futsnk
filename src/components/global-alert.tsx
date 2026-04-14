import {useEffect, useState} from "react"
import {subscribeToNotifications, type SystemNotification} from "@/lib/notifications-service"
import {AlertTriangle, Bell, X} from "lucide-react"
import {AnimatePresence, motion} from "framer-motion"

export function GlobalAlert() {
    const [notif, setNotif] = useState<SystemNotification | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const unsubscribe = subscribeToNotifications((notifs) => {
            if (notifs.length > 0) {
                const latest = notifs[0]
                const hasSeen = localStorage.getItem(`notif_seen_${latest.id}`)

                if (!hasSeen) {
                    setNotif(latest)
                    setIsVisible(true)
                }
            }
        })

        return () => unsubscribe()
    }, [])

    const handleClose = () => {
        if (notif?.id) {
            localStorage.setItem(`notif_seen_${notif.id}`, "true")
        }
        setIsVisible(false)
    }

    // Definir ícone e título baseado no tipo
    const getConfig = (type: string) => {
        switch (type) {
            case 'warning': return { icon: <AlertTriangle size={18} />, title: "Atenção" };
            case 'error': return { icon: <AlertTriangle size={18} />, title: "Urgente" };
            default: return { icon: <Bell size={18} />, title: "Comunicado Oficial" };
        }
    }

    const config = getConfig(notif?.type || 'info');

    return (
        <AnimatePresence>
            {isVisible && notif && (
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