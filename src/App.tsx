import { AuthProvider } from "@/contexts/auth-context.tsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/page.tsx";
import JoinGroup from "@/components/join-group.tsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Rota principal do App */}
                    <Route path="/" element={<Home />} />

                    {/* Rota para os grupos (caso você use IDs na URL na Home) */}
                    <Route path="/groups/:groupId" element={<Home />} />

                    {/* Rota de Convite */}
                    <Route path="/join/:groupId" element={<JoinGroup />} />

                    {/* Redirecionamento de erro ou 404 (opcional) */}
                    <Route path="*" element={<Home />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;