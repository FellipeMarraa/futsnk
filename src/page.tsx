import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { LoginForm } from '@/components/login-form'
import { Dashboard } from '@/components/dashboard'
import { GroupDetail } from '@/components/group-detail'
import { Loader2 } from 'lucide-react'

export default function Home() {
    const { user, loading } = useAuth()
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm font-medium animate-pulse">Carregando Arena...</span>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginForm />
    }

    if (selectedGroupId) {
        return (
            <GroupDetail
                groupId={selectedGroupId}
                onBack={() => setSelectedGroupId(null)}
            />
        )
    }

    return <Dashboard onSelectGroup={(id) => setSelectedGroupId(id)} />
}