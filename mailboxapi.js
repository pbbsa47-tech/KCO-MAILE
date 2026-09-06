const crypto = require('crypto');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userFingerprint = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 10);

  const { action, email, id, customName, domain } = req.query;

  // সক্রিয় ২০+ পাবলিক ডোমেইনের ব্যাকআপ তালিকা
  const DOMAINS = [
    '1secmail.com', '1secmail.org', '1secmail.net', 'esi2.net', 'wwn.one',
    'icznn.com', 'txcct.com', 'vjuum.com', 'laafd.com', 'ezztt.com',
    'supermmw.online', 'colorixy.com', 'gymzz.com', 'enspinner.com', 'itdbe.com'
  ];

  try {
    if (action === 'getDomains') {
      return res.status(200).json({ domains: DOMAINS, fingerprint: userFingerprint });
    }

    if (action === 'generate') {
      const name = customName ? customName.toLowerCase().replace(/[^a-z0-9]/g, '') : Math.random().toString(36).substring(2, 10);
      const targetDomain = domain && DOMAINS.includes(domain) ? domain : DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      return res.status(200).json({ email: `${name}@${targetDomain}`, login: name, domain: targetDomain });
    }

    if (action === 'getMessages' && email) {
      const [login, dom] = email.split('@');
      
      // ব্যাকআপ API কল হ্যান্ডলিং (Failover)
      let messages = [];
      try {
        const apiRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${dom}`);
        if (apiRes.ok) {
          messages = await apiRes.json();
        }
      } catch (err) {
        console.warn('Primary API failed, returning empty payload to avoid crash');
      }

      return res.status(200).json({ messages: Array.isArray(messages) ? messages : [] });
    }

    if (action === 'readMessage' && email && id) {
      const [login, dom] = email.split('@');
      const apiRes = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${dom}&id=${id}`);
      
      if (!apiRes.ok) {
        return res.status(500).json({ error: 'Unable to read email body' });
      }
      
      const message = await apiRes.json();
      return res.status(200).json({ message });
    }

    if (action === 'downloadAttachment' && email && id) {
      const { filename } = req.query;
      const [login, dom] = email.split('@');
      return res.status(200).json({ 
        downloadUrl: `https://www.1secmail.com/api/v1/?action=download&login=${login}&domain=${dom}&id=${id}&file=${filename}` 
      });
    }

    return res.status(400).json({ error: 'Invalid query action' });
  } catch (error) {
    return res.status(500).json({ error: 'Server connection error', details: error.message });
  }
}const crypto = require('crypto');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userFingerprint = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 10);

  const { action, email, id, customName, domain } = req.query;

  // Pool of 20 active public mail domains
  const DOMAINS = [
    '1secmail.com', '1secmail.org', '1secmail.net', 'esi2.net', 'wwn.one',
    'icznn.com', 'txcct.com', 'vjuum.com', 'laafd.com', 'ezztt.com',
    'supermmw.online', 'colorixy.com', 'tempmail.rest', 'gymzz.com', 'enspinner.com',
    'itdbe.com', 'mymailnow.store', 'snapmail.site', '1sec-mail.com', 'goldpaclk.store'
  ];

  try {
    if (action === 'getDomains') {
      return res.status(200).json({ domains: DOMAINS, fingerprint: userFingerprint });
    }

    if (action === 'generate') {
      const name = customName ? customName.toLowerCase().replace(/[^a-z0-9]/g, '') : Math.random().toString(36).substring(2, 10);
      const targetDomain = domain && DOMAINS.includes(domain) ? domain : DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      return res.status(200).json({ email: `${name}@${targetDomain}`, login: name, domain: targetDomain });
    }

    if (action === 'getMessages' && email) {
      const [login, dom] = email.split('@');
      const apiRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${dom}`);
      if (!apiRes.ok) throw new Error('Failed to fetch from mail cluster');
      const messages = await apiRes.json();
      return res.status(200).json({ messages });
    }

    if (action === 'readMessage' && email && id) {
      const [login, dom] = email.split('@');
      const apiRes = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${dom}&id=${id}`);
      if (!apiRes.ok) throw new Error('Failed to load email');
      const message = await apiRes.json();
      return res.status(200).json({ message });
    }

    if (action === 'downloadAttachment' && email && id) {
      const { filename } = req.query;
      const [login, dom] = email.split('@');
      return res.status(200).json({ 
        downloadUrl: `https://www.1secmail.com/api/v1/?action=download&login=${login}&domain=${dom}&id=${id}&file=${filename}` 
      });
    }

    return res.status(400).json({ error: 'Invalid query action' });
  } catch (error) {
    return res.status(500).json({ error: 'Mail network sync error', details: error.message });
  }
}
