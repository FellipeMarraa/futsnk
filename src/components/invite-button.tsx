import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function InviteButton({ groupId, groupName }: { groupId: string, groupName: string }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleInvite = async () => {
        // Gera a URL baseada no domínio atual
        const inviteUrl = `${window.location.origin}/join/${groupId}`;

        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast({
                title: "LINK COPIADO!",
                description: `Mande para os atletas do ${groupName}.`,
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({ variant: "destructive", title: "ERRO AO COPIAR" });
        }
    };

    return (
        <Button
            onClick={handleInvite}
            variant="outline"
            className="bg-white/5 border-white/10 text-white font-black uppercase italic text-[9px] h-9 gap-2 hover:bg-white/10 transition-all active:scale-95"
        >
            {copied ? <Check className="size-3.5 text-primary" /> : <Share2 className="size-3.5" />}
            {copied ? "COPIADO" : "CONVIDAR"}
        </Button>
    );
}