import { getDashboardSnapshot, getPublicConfig, ingestSensorReading } from '../../server/dashboardService.js';
import { loadEnv } from '../../server/env.js';

const { clientOrigin, ingestApiKey } = loadEnv();

export async function handler(event, context) {
  const path = event.path.replace('/.netlify/functions/api', '') || event.path;
  
  try {
    if (path === '/api/public/config') {
      const config = await getPublicConfig();
      return { statusCode: 200, body: JSON.stringify(config) };
    }
    
    if (path === '/api/health') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, platform: 'netlify' }) };
    }
    
    if (path === '/api/dashboard') {
      const dashboard = await getDashboardSnapshot();
      if (!dashboard) {
        return { statusCode: 404, body: JSON.stringify({ message: "No device data found." }) };
      }
      return { statusCode: 200, body: JSON.stringify(dashboard) };
    }
    
    if (path === '/api/ingest') {
      if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: "Method not allowed" }) };
      }
      const apiKey = event.headers['x-api-key'];
      if (!ingestApiKey || apiKey !== ingestApiKey) {
        return { statusCode: 401, body: JSON.stringify({ message: "Invalid ingest API key." }) };
      }
      const body = JSON.parse(event.body || '{}');
      const result = await ingestSensorReading(body);
      return { statusCode: 201, body: JSON.stringify(result) };
    }
    
    return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
  } catch (error) {
    console.error("API error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
  }
}