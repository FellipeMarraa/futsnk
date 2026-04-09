import { useAuth } from '@/contexts/auth-context'
import { LoginForm } from '@/components/login-form'
import { Dashboard } from '@/components/dashboard'
import { GroupDetail } from '@/components/group-detail'
import { Loader2 } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'

export default function Home() {
    const { user, loading } = useAuth()
    const { groupId } = useParams() // O groupId já é a nossa "fonte da verdade"
    const navigate = useNavigate()

    // Funções de navegação que alteram a URL
    const handleSelectGroup = (id: string) => {
        navigate(`/groups/${id}`)
    }

    const handleBack = () => {
        navigate('/')
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-[10px] font-black uppercase italic tracking-[0.2em] animate-pulse text-white/40">
                        Carregando Arena...
                    </span>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginForm />
    }

    // Se houver um groupId na URL, renderizamos o detalhe
    if (groupId) {
        return (
            <GroupDetail
                groupId={groupId}
                onBack={handleBack}
            />
        )
    }

    // Caso contrário, renderizamos o Dashboard
    return <Dashboard onSelectGroup={handleSelectGroup} />
}