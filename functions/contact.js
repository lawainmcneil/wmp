export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const fd = await request.formData();

    const name    = (fd.get('name')    || '').trim();
    const email   = (fd.get('email')   || '').trim();
    const phone   = (fd.get('phone')   || '').trim() || 'Not provided';
    const service = (fd.get('service') || '').trim() || 'Not specified';
    const message = (fd.get('message') || '').trim();
    const honey   = (fd.get('website') || '').trim(); // honeypot

    // Reject bots
    if (honey) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // Basic validation
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Name and email are required.' }),
        { status: 400, headers }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address.' }),
        { status: 400, headers }
      );
    }

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WMP Contact Form <form@wmpfinancialgroup.com>',
        to: ['info@wmpfinancialgroup.com'],
        reply_to: email,
        subject: `New inquiry: ${service} — ${name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#143347">
            <div style="background:#1d475b;padding:24px 32px">
              <img src="https://wmpfinancialgroup.com/wmp-financial-group-logo.svg"
                   alt="WMP Financial Group" style="height:40px">
            </div>
            <div style="padding:32px;background:#fbfaf5">
              <h2 style="margin:0 0 24px;color:#1d475b">New Contact Form Submission</h2>
              <table style="width:100%;border-collapse:collapse;font-size:15px">
                <tr style="border-bottom:1px solid #d8d0c2">
                  <td style="padding:12px 0;font-weight:bold;width:130px;color:#1d475b">Name</td>
                  <td style="padding:12px 0">${escHtml(name)}</td>
                </tr>
                <tr style="border-bottom:1px solid #d8d0c2">
                  <td style="padding:12px 0;font-weight:bold;color:#1d475b">Email</td>
                  <td style="padding:12px 0">
                    <a href="mailto:${escHtml(email)}" style="color:#1d475b">${escHtml(email)}</a>
                  </td>
                </tr>
                <tr style="border-bottom:1px solid #d8d0c2">
                  <td style="padding:12px 0;font-weight:bold;color:#1d475b">Phone</td>
                  <td style="padding:12px 0">${escHtml(phone)}</td>
                </tr>
                <tr style="border-bottom:${message ? '1px solid #d8d0c2' : 'none'}">
                  <td style="padding:12px 0;font-weight:bold;color:#1d475b">Topic</td>
                  <td style="padding:12px 0">${escHtml(service)}</td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding:12px 0;font-weight:bold;color:#1d475b;vertical-align:top">Message</td>
                  <td style="padding:12px 0">${escHtml(message).replace(/\n/g, '<br>')}</td>
                </tr>` : ''}
              </table>
              <div style="margin-top:32px;padding:16px;background:#f1eadc;border-radius:4px">
                <a href="mailto:${escHtml(email)}"
                   style="display:inline-block;padding:12px 24px;background:#d9b45a;color:#21313d;
                          font-weight:900;text-decoration:none;border-radius:4px;font-size:14px;
                          letter-spacing:0.05em;text-transform:uppercase">
                  Reply to ${escHtml(name)}
                </a>
              </div>
            </div>
            <div style="padding:16px 32px;background:#0f2d3d;color:rgba(255,255,255,0.6);font-size:12px">
              Sent from wmpfinancialgroup.com contact form
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Resend error:', JSON.stringify(err));
      return new Response(
        JSON.stringify({ error: 'Failed to send. Please call us directly.' }),
        { status: 500, headers }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('Function error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Unexpected error. Please try again.' }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
