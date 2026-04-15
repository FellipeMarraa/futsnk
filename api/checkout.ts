import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || ''
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { userId, planType, price } = req.body;

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: planType,
                        title: `FutMatch - Plano ${planType}`,
                        quantity: 1,
                        unit_price: Number(price),
                        currency_id: 'BRL'
                    }
                ],
                external_reference: userId,
                // AQUI ESTÁ O SEGREDO: URLs específicas para o FutMatch
                notification_url: "https://fut-match.vercel.app/api/webhook",
                back_urls: {
                    success: "https://fut-match.vercel.app/?status=success",
                    failure: "https://fut-match.vercel.app/",
                    pending: "https://fut-match.vercel.app/"
                },
                auto_return: "approved",
            }
        });

        // Retorna o link que o modal vai abrir
        return res.status(200).json({ init_point: result.init_point });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}