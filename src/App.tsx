import { AuthProvider } from "@/contexts/auth-context.tsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/home.tsx";
import JoinGroup from "@/components/join-group.tsx";
import { AdminSupremo } from "@/components/admin-supremo.tsx";
import { GlobalAlert } from "@/components/global-alert.tsx";

function App() {
    return (
        <AuthProvider>
            <GlobalAlert />
            <BrowserRouter>
                <Routes>
                    {/* Rota principal do App */}
                    <Route path="/" element={<Home />} />

                    {/* Rota para os grupos (caso você use IDs na URL na Home) */}
                    <Route path="/groups/:groupId" element={<Home />} />

                    {/* Rota de Convite */}
                    <Route path="/join/:groupId" element={<JoinGroup />} />

                    {/* Rota Admin Supremo */}
                    <Route path="/admin-supremo" element={<AdminSupremo />} />

                    {/* Redirecionamento de erro ou 404 (opcional) */}
                    <Route path="*" element={<Home />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;