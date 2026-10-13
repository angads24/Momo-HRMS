const http = require('http');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3006', 10);
const SECRET = process.env.FACE_JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-face-secret-key-change-in-prod';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createToken(employeeId) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      jti: crypto.randomUUID(),
      sub: employeeId,
      type: 'FACE_VERIFICATION',
      confidence: 0.985,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
    })
  );
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${header}.${payload}.${signature}`;
}

const server = http.createServer((req, res) => {
  const url = req.url || '';
  res.setHeader('Content-Type', 'application/json');

  if (url === '/health' || url === '/api/v1/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'healthy', service: 'face-ai-service', database: 'up' }));
  }

  if (url.includes('/api/v1/face/challenge')) {
    res.writeHead(200);
    return res.end(JSON.stringify({ challenge_id: crypto.randomUUID(), action: 'BLINK', ttl_seconds: 180 }));
  }

  if (url.includes('/api/v1/face/detect-neutral') || url.includes('/api/v1/face/detect-action')) {
    res.writeHead(200);
    return res.end(JSON.stringify({ detected: true, action_verified: true, confidence: 0.98 }));
  }

  if (url.includes('/api/v1/face/verify-token')) {
    res.writeHead(200);
    return res.end(JSON.stringify({ valid: true, confidence: 0.99, message: 'Token verified successfully' }));
  }

  if (url.includes('/api/v1/face/verify') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let empId = 'EMP-001';
      try {
        const parsed = JSON.parse(body);
        empId = parsed.employee_id || empId;
      } catch {}
      const token = createToken(empId);
      res.writeHead(200);
      res.end(JSON.stringify({ verified: true, confidence: 0.985, token, message: 'Face verified successfully' }));
    });
    return;
  }

  if (url.includes('/api/v1/face/status/')) {
    res.writeHead(200);
    return res.end(JSON.stringify({ enrolled: true, model_version: 'v1.0' }));
  }

  if (url.includes('/api/v1/face/enroll')) {
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, message: 'Face biometric template enrolled' }));
  }

  res.writeHead(200);
  res.end(JSON.stringify({ success: true, service: 'face-ai-service' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Face AI Service listening on port ${PORT}`);
});
