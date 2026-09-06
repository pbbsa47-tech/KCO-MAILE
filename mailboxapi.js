export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, email, id, prefix } = req.query;

  try {
    // 1. Generate new Temp-Mail.io email address
    if (action === 'generate') {
      const response = await fetch('https://api.internal.temp-mail.io/api/v3/email/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_name_length: 8, max_name_length: 12 })
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({ email: data.email, provider: 'temp-mail.io' });
      }

      // Fallback generator if primary endpoint rate-limits
      const fallbackName = prefix || Math.random().toString(36).substring(2, 10);
      return res.status(200).json({ email: `${fallbackName}@1secmail.com`, provider: 'fallback' });
    }

    // 2. Fetch live emails for the current address
    if (action === 'getMessages' && email) {
      if (email.includes('temp-mail.io') || email.includes('email.io')) {
        const response = await fetch(`https://api.internal.temp-mail.io/api/v3/email/${encodeURIComponent(email)}/messages`);
        if (response.ok) {
          const messages = await response.json();
          // Map to uniform Gmail message format
          const formatted = messages.map(m => ({
            id: m.id,
            from: m.from,
            subject: m.subject || '(No Subject)',
            date: m.created_at,
            body: m.body_html || m.body_text || ''
          }));
          return res.status(200).json({ messages: formatted });
        }
      }

      // Secondary multi-domain provider pipeline
      const [login, domain] = email.split('@');
      const apiRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
      if (apiRes.ok) {
        const rawMsgs = await apiRes.json();
        const formatted = rawMsgs.map(m => ({
          id: m.id,
          from: m.from,
          subject: m.subject,
          date: m.date,
          body: null // Will be loaded on click
        }));
        return res.status(200).json({ messages: formatted });
      }

      return res.status(200).json({ messages: [] });
    }

    // 3. Read specific message body
    if (action === 'readMessage' && email && id) {
      const [login, domain] = email.split('@');
      const apiRes = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
      if (apiRes.ok) {
        const msg = await apiRes.json();
        return res.status(200).json({ message: { body: msg.htmlBody || msg.body } });
      }
      return res.status(200).json({ message: { body: 'Content unavailable.' } });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ error: 'Service Sync Failure', details: error.message });
  }
}
