import {AuthProvider} from "@/contexts/auth-context.tsx";
import Home from "@/page.tsx";

function App() {

  return (
    <AuthProvider>
        <Home />
    </AuthProvider>
  )
}

export default App
