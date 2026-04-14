import {useEffect, useState} from "react"
import {useAuth} from "@/contexts/auth-context"
import {useNavigate} from "react-router-dom"
import {db} from "@/lib/firebase"
import {collection, getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter} from "firebase/firestore"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {ArrowLeft, ShieldCheck} from "lucide-react"

// Import dos sub-componentes
import {CouponsTab} from "./tabs/coupons-tab"
import {GroupsTab} from "./tabs/groups-tab"
import {NotificationsTab} from "./tabs/notifications-tab"

const PAGE_SIZE = 20;

export function AdminSupremo() {
    const { user, isSuperAdmin, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState("coupons")
    const [loadingData, setLoadingData] = useState(false)

    // Estados Unificados
    const [coupons, setCoupons] = useState<any[]>([])
    const [lastCouponDoc, setLastCouponDoc] = useState<QueryDocumentSnapshot | null>(null)
    const [hasMoreCoupons, setHasMoreCoupons] = useState(true)

    const [allGroups, setAllGroups] = useState<any[]>([])
    const [lastGroupDoc, setLastGroupDoc] = useState<QueryDocumentSnapshot | null>(null)
    const [hasMoreGroups, setHasMoreGroups] = useState(true)

    const fetchCoupons = async (loadMore = false) => {
        setLoadingData(true)
        try {
            let q = query(collection(db, "coupons"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            if (loadMore && lastCouponDoc) {
                q = query(collection(db, "coupons"), orderBy("createdAt", "desc"), startAfter(lastCouponDoc), limit(PAGE_SIZE));
            }
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            setCoupons(prev => loadMore ? [...prev, ...data] : data);
            setLastCouponDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMoreCoupons(snap.docs.length === PAGE_SIZE);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false)
        }
    }

    const fetchAllGroups = async (loadMore = false) => {
        setLoadingData(true)
        try {
            let q = query(collection(db, "groups"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            if (loadMore && lastGroupDoc) {
                q = query(collection(db, "groups"), orderBy("createdAt", "desc"), startAfter(lastGroupDoc), limit(PAGE_SIZE));
            }
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            setAllGroups(prev => loadMore ? [...prev, ...data] : data);
            setLastGroupDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMoreGroups(snap.docs.length === PAGE_SIZE);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false)
        }
    }

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) navigate("/")
    }, [isSuperAdmin, authLoading, navigate])

    useEffect(() => {
        if (isSuperAdmin) {
            if (activeTab === "coupons" && coupons.length === 0) fetchCoupons();
            if (activeTab === "groups" && allGroups.length === 0) fetchAllGroups();
        }
    }, [isSuperAdmin, activeTab, coupons.length, allGroups.length])

    if (authLoading || !isSuperAdmin) return null

    return (
        <div className="min-h-screen bg-[#0c0c0e] text-white flex flex-col font-sans">
            <header className="h-16 border-b border-white/10 bg-[#0c0c0e]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-white/5 rounded-full">
                        <ArrowLeft size={20} className="text-white/40" />
                    </Button>
                    <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                        <ShieldCheck className="text-primary size-5" />
                        <span className="font-black italic uppercase tracking-tighter text-xl leading-none">
                            PAINEL <span className="text-primary">SUPREMO</span>
                        </span>
                    </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 italic font-black text-[9px] px-3 py-1 uppercase tracking-widest">OVERSEER ACTIVE</Badge>
            </header>

            {/* main centralizado com items-center */}
            <main className="max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col items-center">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col items-center">

                    {/* TabsList centralizado usando self-center ou removendo self-start */}
                    <TabsList className="flex w-full max-w-md bg-white/5 border border-white/10 p-1 mb-10 h-12">
                        <TabsTrigger value="coupons" className="flex-1 font-bold uppercase italic text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all">
                            Cupons
                        </TabsTrigger>
                        <TabsTrigger value="groups" className="flex-1 font-bold uppercase italic text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all">
                            Clubes
                        </TabsTrigger>
                        <TabsTrigger value="notifs" className="flex-1 font-bold uppercase italic text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg transition-all">
                            Alertas
                        </TabsTrigger>
                    </TabsList>

                    {/* Conteúdo ocupando a largura total do container pai */}
                    <div className="w-full">
                        <TabsContent value="coupons" className="mt-0 outline-none border-none">
                            <CouponsTab
                                coupons={coupons}
                                loading={loadingData}
                                hasMore={hasMoreCoupons}
                                onFetchMore={() => fetchCoupons(true)}
                                onRefresh={() => fetchCoupons(false)}
                                userUid={user!.uid}
                            />
                        </TabsContent>

                        <TabsContent value="groups" className="mt-0 outline-none border-none">
                            <GroupsTab
                                groups={allGroups}
                                loading={loadingData}
                                hasMore={hasMoreGroups}
                                onFetchMore={() => fetchAllGroups(true)}
                            />
                        </TabsContent>

                        <TabsContent value="notifs" className="mt-0 outline-none border-none">
                            <NotificationsTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </main>
        </div>
    )
}