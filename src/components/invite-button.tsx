import {Button} from "@/components/ui/button";
import {Check, Share2} from "lucide-react";
import {useState} from "react";
import {useToast} from "@/hooks/use-toast";

export function InviteButton({ groupId, groupName }: { groupId: string, groupName: string }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleInvite = async () => {
        const inviteUrl = `${window.location.origin}/join/${groupId}`;

        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);

        toast({
            title: "Link Copiado!",
            description: `Envie o link do ${groupName} para os seus atletas.`,
        });

        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            onClick={handleInvite}
            variant="outline"
            className="bg-white/5 border-white/10 text-white font-black uppercase italic text-[10px] h-9 gap-2 hover:bg-white/10"
        >
            {copied ? <Check className="size-3.5 text-primary" /> : <Share2 className="size-3.5" />}
            {copied ? "Copiado" : "Convidar"}
        </Button>
    );
}