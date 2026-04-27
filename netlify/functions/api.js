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

  // Hardcoded InfluxDB configuration for Netlify (free tier - no env vars)
  const INFLUX_CONFIG = {
    url: 'https://us-east-1-1.aws.cloud2.influxdata.com',
    token: 'fmF96hUZ3pnym99LdSI42wWZs_wOGcASOHxwKe2Gjdg-IXHqgiRuwC26QMiWn0PpqJB9r9p0oPhOCWITDSu8aw==',
    org: 'iot-test-ring',
    bucket: 'iot-data1'
  };

  const INGEST_API_KEY = 'iot-plc-ingest-key-2026';

  // Helper to query InfluxDB directly
  async function queryInflux(flux) {
    const { InfluxDB } = await import('@influxdata/influxdb-client');
    const client = new InfluxDB({ url: INFLUX_CONFIG.url, token: INFLUX_CONFIG.token });
    const queryApi = client.getQueryApi(INFLUX_CONFIG.org);
    return new Promise((resolve, reject) => {
      const rows = [];
      queryApi.queryRows(flux, {
        next(row, tableMeta) { rows.push(tableMeta.toObject(row)); },
        error(err) { reject(err); },
        complete() { resolve(rows); }
      });
    });
  }

  // Helper to write to InfluxDB
  async function writeInflux(point) {
    const { InfluxDB, Point } = await import('@influxdata/influxdb-client');
    const client = new InfluxDB({ url: INFLUX_CONFIG.url, token: INFLUX_CONFIG.token });
    const writeApi = client.getWriteApi(INFLUX_CONFIG.org, INFLUX_CONFIG.bucket, 'ns');
    writeApi.writePoint(point);
    await writeApi.flush();
    await writeApi.close();
  }

  if (path === '/api/public/config') {
    try {
      const rows = await queryInflux(`
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "device_info")
          |> last()
      `);
      if (rows.length === 0) {
        return { statusCode: 200, body: JSON.stringify({
          appName: "IoT Test Rig Dashboard",
          loginBadge: "InfluxDB Connected",
          loginHeadline: "Monitor your IoT test rig with live data fetched from InfluxDB.",
          loginDescription: "PLC data can be pushed into InfluxDB through HTTP API, then visualized here in real time.",
          dashboardSubtitle: "Industrial Monitoring Overview"
        }), headers };
      }
      const row = rows[0];
      return { statusCode: 200, body: JSON.stringify({
        appName: row.device_name || "IoT Test Rig Dashboard",
        loginBadge: row.location || "InfluxDB Connected",
        loginHeadline: "Monitor your IoT test rig with live data fetched from InfluxDB.",
        loginDescription: "PLC data can be pushed into InfluxDB through HTTP API, then visualized here in real time.",
        dashboardSubtitle: "Industrial Monitoring Overview"
      }), headers };
    } catch (error) {
      console.error("Config API error:", error);
      return { statusCode: 500, body: JSON.stringify({ message: "Unable to load configuration." }), headers };
    }
  }

  if (path === '/api/health') {
    return { statusCode: 200, body: JSON.stringify({ ok: true, platform: 'netlify' }), headers };
  }

  if (path === '/api/dashboard') {
    try {
      // Get device info
      const deviceRows = await queryInflux(`
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "device_info")
          |> last()
      `);
      const device = deviceRows.length > 0 ? {
        id: deviceRows[0].device_id || "RIG-001",
        name: deviceRows[0].device_name || "IoT Test Rig",
        location: deviceRows[0].location || "Unknown"
      } : { id: "RIG-001", name: "IoT Test Rig", location: "Unknown" };

      // Get thresholds
      const thresholdRows = await queryInflux(`
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "thresholds")
          |> last()
      `);
      const thresholds = thresholdRows.length > 0 ? {
        tempMin: Number(thresholdRows[0].temp_min) || 0,
        tempMax: Number(thresholdRows[0].temp_max) || 80,
        vibrationLow: Number(thresholdRows[0].vibration_low) || 1.5,
        vibrationHigh: Number(thresholdRows[0].vibration_high) || 2.4
      } : { tempMin: 0, tempMax: 80, vibrationLow: 1.5, vibrationHigh: 2.4 };

      // Get sensor data (last 50 points within 1h)
      const sensorRows = await queryInflux(`
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "sensor_data" and r.device_id == "${device.id}")
          |> sort(columns: ["_time"], desc: false)
          |> limit(n: 50)
      `);

      const toNumber = (v, fallback = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };

      const latest = sensorRows.length > 0 ? sensorRows[sensorRows.length - 1] : {};

      const buildSeries = (rows, key) => rows
        .filter(r => r[key] !== null && r[key] !== undefined)
        .map(r => ({ time: r._time ? new Date(r._time).toISOString() : '', value: toNumber(r[key]) }));

      const buildAccelSeries = (rows) => rows
        .filter(r => r.ax !== null && r.ax !== undefined && r.ay !== null && r.ay !== undefined && r.az !== null && r.az !== undefined)
        .map(r => ({ label: r._time ? new Date(r._time).toISOString() : '', x: toNumber(r.ax), y: toNumber(r.ay), z: toNumber(r.az) }));

      const temperatureHistory = buildSeries(sensorRows, 'temperature');
      const accelerometerHistory = buildAccelSeries(sensorRows);

      const switchValue = sensorRows.length > 0 ? (latest.switch_value ? 1 : 0) : 0;
      const distanceMm = sensorRows.length > 0 ? toNumber(latest.distance_mm) : 0;
      const partCount = sensorRows.length > 0 ? Math.trunc(toNumber(latest.part_count)) : 0;
      const temperature = sensorRows.length > 0 ? toNumber(latest.temperature) : 0;
      const accelX = sensorRows.length > 0 ? toNumber(latest.ax) : 0;
      const accelY = sensorRows.length > 0 ? toNumber(latest.ay) : 0;
      const accelZ = sensorRows.length > 0 ? toNumber(latest.az) : 0;

      const vibrationMagnitude = Number(Math.sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ).toFixed(2));

      const alerts = [];
      if (temperature > thresholds.tempMax && thresholds.tempMax > 0) {
        alerts.push({ id: 'temp-high', title: 'Temperature Alert', message: `Temperature is ${temperature} C and exceeded the configured maximum of ${thresholds.tempMax} C.`, severity: 'critical' });
      }
      if (vibrationMagnitude > thresholds.vibrationHigh && thresholds.vibrationHigh > 0) {
        alerts.push({ id: 'vibration-high', title: 'High Vibration', message: `Vibration magnitude reached ${vibrationMagnitude} g which is above the high threshold of ${thresholds.vibrationHigh} g.`, severity: 'critical' });
      }

      const deviceId = device.id;

      return {
        statusCode: 200,
        body: JSON.stringify({
          config: { appName: device.name, dashboardSubtitle: 'Industrial Monitoring Overview' },
          rig: { id: deviceId, name: device.name, code: deviceId, status: sensorRows.length > 0 ? 'ONLINE' : 'OFFLINE', location: device.location, description: 'Live device data from InfluxDB' },
          sensorCatalog: [
            { id: `${deviceId}-switch`, key: 'switch', label: 'Switch Sensor', type: 'switch', unit: 'binary' },
            { id: `${deviceId}-tof`, key: 'tof', label: 'Time of Flight Sensor', type: 'time_of_flight', unit: 'mm' },
            { id: `${deviceId}-temperature`, key: 'temperature', label: 'Temperature Sensor', type: 'temperature', unit: 'C' },
            { id: `${deviceId}-accelerometer`, key: 'accelerometer', label: 'Accelerometer Sensor', type: 'accelerometer', unit: 'g' }
          ],
          sensorMeta: {
            switchSensor: { id: `${deviceId}-switch`, name: 'Switch Sensor', key: 'switch', unit: 'binary' },
            tofSensor: { id: `${deviceId}-tof`, name: 'Time of Flight Sensor', key: 'tof', unit: 'mm' },
            temperatureSensor: { id: `${deviceId}-temperature`, name: 'Temperature Sensor', key: 'temperature', unit: 'C' },
            accelerometer: { id: `${deviceId}-accelerometer`, name: 'Accelerometer Sensor', key: 'accelerometer', unit: 'g' }
          },
          thresholds,
          isConnected: sensorRows.length > 0,
          sensorData: {
            switchSensor: { status: switchValue },
            tofSensor: { distanceMm, partCount },
            temperatureSensor: { current: temperature, min: thresholds.tempMin, max: thresholds.tempMax, warning: thresholds.tempMax, critical: thresholds.tempMax, history: temperatureHistory },
            accelerometer: { x: accelX, y: accelY, z: accelZ, history: accelerometerHistory }
          },
          vibrationMagnitude,
          alerts,
          employees: []
        }),
        headers
      };
    } catch (error) {
      console.error("Dashboard API error:", error);
      return { statusCode: 500, body: JSON.stringify({ message: "Unable to load dashboard data." }), headers };
    }
  }

  if (path === '/api/ingest') {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }), headers };
    }
    const apiKey = event.headers['x-api-key'];
    if (apiKey !== INGEST_API_KEY) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Invalid ingest API key.' }), headers };
    }
    try {
      const body = JSON.parse(event.body || '{}');
      const deviceId = String(body.device_id || body.deviceId || 'RIG-001').trim();
      const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
      if (Number.isNaN(timestamp.getTime())) throw new Error('Invalid timestamp');

      const toNumber = (v, fallback = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };

      const { Point } = await import('@influxdata/influxdb-client');
      const point = new Point('sensor_data')
        .tag('device_id', deviceId)
        .timestamp(timestamp)
        .booleanField('switch_value', Boolean(body.switch_value ?? body.switchValue ?? false))
        .intField('distance_mm', toNumber(body.distance_mm ?? body.distanceMm))
        .intField('part_count', Math.trunc(toNumber(body.part_count ?? body.partCount)))
        .floatField('temperature', toNumber(body.temperature))
        .floatField('ax', toNumber(body.accel_x ?? body.accelX))
        .floatField('ay', toNumber(body.accel_y ?? body.accelY))
        .floatField('az', toNumber(body.accel_z ?? body.accelZ));

      await writeInflux(point);
      return { statusCode: 201, body: JSON.stringify({ ok: true, device_id: deviceId, timestamp: timestamp.toISOString() }), headers };
    } catch (error) {
      console.error("Ingest API error:", error);
      return { statusCode: 400, body: JSON.stringify({ message: error.message || "Unable to store sensor reading." }), headers };
    }
  }

  return { statusCode: 404, body: JSON.stringify({ message: 'Not found', path }), headers };
};