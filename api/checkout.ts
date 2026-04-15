import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuração do cliente com o seu Access Token
// Lembre-se de configurar essa variável no seu arquivo .env
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || ''
});

export default async function handler(req: any, res: any) {
    // Garantir que apenas requisições POST sejam aceitas
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    try {
        const { userId, planType, price } = req.body;

        // Validação básica
        if (!userId || !planType) {
            return res.status(400).json({ message: 'Dados insuficientes (userId ou planType faltando)' });
        }

        const preference = new Preference(client);

        // Criação da preferência de pagamento
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: planType,
                        title: `FUTMATCH - Plano ${planType.toUpperCase()}`,
                        quantity: 1,
                        unit_price: Number(price),
                        currency_id: 'BRL',
                        description: 'Acesso completo aos recursos de gestão de clubes e estatísticas.'
                    }
                ],
                // O external_reference é crucial: ele é o UID do usuário no Firebase
                // Usaremos ele no Webhook para saber qual usuário ativar
                external_reference: userId,

                // URLs de retorno para o seu domínio (ajuste para o seu domínio oficial se não for vercel)
                notification_url: "https://fut-match.vercel.app/api/webhook",

                back_urls: {
                    success: "https://fut-match.vercel.app/dashboard?status=success",
                    failure: "https://fut-match.vercel.app/dashboard?status=error",
                    pending: "https://fut-match.vercel.app/dashboard?status=pending"
                },

                // Retorna automaticamente para o app após aprovação
                auto_return: "approved",

                // Configurações de pagamento permitidas (opcional)
                payment_methods: {
                    excluded_payment_types: [
                        { id: "ticket" } // Exemplo: excluir boleto se quiser apenas PIX/Cartão para ativação imediata
                    ],
                    installments: 1 // Limita parcelas
                }
            }
        });

        // Retorna o link que o usuário deve acessar para pagar
        return res.status(200).json({ init_point: result.init_point });

    } catch (error: any) {
        console.error("Erro ao criar preferência MP:", error);
        return res.status(500).json({
            error: "Erro ao gerar checkout",
            message: error.message
        });
    }
}