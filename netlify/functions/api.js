exports.handler = async function(event, context) {
  const path = event.path;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  
  if (path === '/api/public/config') {
    const { getPublicConfig } = await import('../../server/dashboardService.js');
    const config = await getPublicConfig();
    return { statusCode: 200, body: JSON.stringify(config), headers };
  }
  
  if (path === '/api/health') {
    return { statusCode: 200, body: JSON.stringify({ ok: true, platform: 'netlify' }), headers };
  }
  
  if (path === '/api/dashboard') {
    const { getDashboardSnapshot } = await import('../../server/dashboardService.js');
    const dashboard = await getDashboardSnapshot();
    if (!dashboard) {
      return { statusCode: 404, body: JSON.stringify({ message: 'No device data found.' }), headers };
    }
    return { statusCode: 200, body: JSON.stringify(dashboard), headers };
  }
  
  if (path === '/api/ingest') {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }), headers };
    }
    const { loadEnv } = await import('../../server/env.js');
    const { ingestApiKey } = loadEnv();
    const apiKey = event.headers['x-api-key'];
    if (!ingestApiKey || apiKey !== ingestApiKey) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Invalid ingest API key.' }), headers };
    }
    const { ingestSensorReading } = await import('../../server/dashboardService.js');
    const body = JSON.parse(event.body || '{}');
    const result = await ingestSensorReading(body);
    return { statusCode: 201, body: JSON.stringify(result), headers };
  }
  
  return { statusCode: 404, body: JSON.stringify({ message: 'Not found', path }), headers };
};