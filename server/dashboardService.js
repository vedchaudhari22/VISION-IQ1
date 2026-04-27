import { Point } from "@influxdata/influxdb-client";
import { getQueryApi, getWriteApi } from "./db.js";
import { loadEnv } from "./env.js";

const { influxBucket } = loadEnv();

// Check if we're using InfluxDB or SQL Server based on available config
const isInfluxDB = true;

function computeMagnitude(x, y, z) {
  return Number(Math.sqrt(x * x + y * y + z * z).toFixed(2));
}

function formatHistoryLabel(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function buildSeries(rows, valueKey, labelKey) {
  return rows
    .filter((row) => row[valueKey] !== null && row[valueKey] !== undefined)
    .map((row) => ({
      [labelKey]: formatHistoryLabel(row._time),
      value: toNumber(row[valueKey])
    }));
}

function buildAccelSeries(rows) {
  return rows
    .filter(
      (row) => row.ax !== null && row.ax !== undefined &&
        row.ay !== null && row.ay !== undefined &&
        row.az !== null && row.az !== undefined
    )
    .map((row) => ({
      label: formatHistoryLabel(row._time),
      x: toNumber(row.ax),
      y: toNumber(row.ay),
      z: toNumber(row.az)
    }));
}

function buildAlerts(latestSnapshot, thresholds) {
  const alerts = [];
  const vibrationMagnitude = computeMagnitude(latestSnapshot.accelX, latestSnapshot.accelY, latestSnapshot.accelZ);

  if (latestSnapshot.temperature > thresholds.tempMax && thresholds.tempMax > 0) {
    alerts.push({
      id: "temp-high",
      title: "Temperature Alert",
      message: `Temperature is ${latestSnapshot.temperature} C and exceeded the configured maximum of ${thresholds.tempMax} C.`,
      severity: "critical"
    });
  }

  if (vibrationMagnitude > thresholds.vibrationHigh && thresholds.vibrationHigh > 0) {
    alerts.push({
      id: "vibration-high",
      title: "High Vibration",
      message: `Vibration magnitude reached ${vibrationMagnitude} g which is above the high threshold of ${thresholds.vibrationHigh} g.`,
      severity: "critical"
    });
  }

  return { alerts, vibrationMagnitude };
}

async function queryInflux(fluxQuery) {
  const queryApi = getQueryApi();
  return new Promise((resolve, reject) => {
    const rows = [];
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error(err) {
        reject(err);
      },
      complete() {
        resolve(rows);
      }
    });
  });
}

async function getDeviceInfo() {
  const fluxQuery = `
    from(bucket: "${influxBucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "device_info")
      |> last()
  `;
  
  try {
    const rows = await queryInflux(fluxQuery);
    if (rows.length === 0) {
      return { id: "default", name: "IoT Test Rig", location: "Unknown" };
    }
    const row = rows[0];
    return {
      id: row.device_id || "default",
      name: row.device_name || "IoT Test Rig",
      location: row.location || "Unknown"
    };
  } catch {
    return { id: "default", name: "IoT Test Rig", location: "Unknown" };
  }
}

async function getThresholds() {
  const fluxQuery = `
    from(bucket: "${influxBucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "thresholds")
      |> last()
  `;
  
  try {
    const rows = await queryInflux(fluxQuery);
    if (rows.length === 0) {
      return { tempMin: 0, tempMax: 80, vibrationLow: 1.5, vibrationHigh: 2.4 };
    }
    const row = rows[0];
    return {
      tempMin: toNumber(row.temp_min),
      tempMax: toNumber(row.temp_max),
      vibrationLow: toNumber(row.vibration_low, 1.5),
      vibrationHigh: toNumber(row.vibration_high, 2.4)
    };
  } catch {
    return { tempMin: 0, tempMax: 80, vibrationLow: 1.5, vibrationHigh: 2.4 };
  }
}

async function getSensorData(deviceId, limit = 50) {
  const fluxQuery = `
    from(bucket: "${influxBucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> sort(columns: ["_time"], desc: false)
      |> limit(n: ${limit})
  `;
  
  try {
    return await queryInflux(fluxQuery);
  } catch {
    return [];
  }
}

export async function getPublicConfig() {
  const device = await getDeviceInfo();

  return {
    appName: device.name || "IoT Test Rig Dashboard",
    loginBadge: device.location || "InfluxDB Connected",
    loginHeadline: "Monitor your IoT test rig with live data fetched from InfluxDB.",
    loginDescription: "PLC data can be pushed into InfluxDB through HTTP API, then visualized here in real time.",
    dashboardSubtitle: "Industrial Monitoring Overview"
  };
}

export async function getDashboardSnapshot() {
  const device = await getDeviceInfo();
  const thresholds = await getThresholds();
  const sensorRows = await getSensorData(device.id, 50);

  const latestSnapshot = {
    switchValue: sensorRows.length > 0 ? (sensorRows[sensorRows.length - 1].switch_value ? 1 : 0) : 0,
    distanceMm: sensorRows.length > 0 ? toNumber(sensorRows[sensorRows.length - 1].distance_mm) : 0,
    partCount: sensorRows.length > 0 ? Math.trunc(toNumber(sensorRows[sensorRows.length - 1].part_count)) : 0,
    temperature: sensorRows.length > 0 ? toNumber(sensorRows[sensorRows.length - 1].temperature) : 0,
    accelX: sensorRows.length > 0 ? toNumber(sensorRows[sensorRows.length - 1].ax) : 0,
    accelY: sensorRows.length > 0 ? toNumber(sensorRows[sensorRows.length - 1].ay) : 0,
    accelZ: sensorRows.length > 0 ? toNumber(sensorRows[sensorRows.length - 1].az) : 0
  };

  const temperatureHistory = buildSeries(sensorRows, "temperature", "time");
  const accelerometerHistory = buildAccelSeries(sensorRows);
  const { alerts, vibrationMagnitude } = buildAlerts(latestSnapshot, thresholds);

  const deviceId = device.id;

  return {
    config: {
      appName: device.name || "IoT Test Rig Dashboard",
      dashboardSubtitle: "Industrial Monitoring Overview"
    },
    rig: {
      id: deviceId,
      name: device.name || deviceId,
      code: deviceId,
      status: sensorRows.length > 0 ? "ONLINE" : "OFFLINE",
      location: device.location || "",
      description: "Live device data from InfluxDB"
    },
    sensorCatalog: [
      { id: `${deviceId}-switch`, key: "switch", label: "Switch Sensor", type: "switch", unit: "binary" },
      { id: `${deviceId}-tof`, key: "tof", label: "Time of Flight Sensor", type: "time_of_flight", unit: "mm" },
      { id: `${deviceId}-temperature`, key: "temperature", label: "Temperature Sensor", type: "temperature", unit: "C" },
      { id: `${deviceId}-accelerometer`, key: "accelerometer", label: "Accelerometer Sensor", type: "accelerometer", unit: "g" }
    ],
    sensorMeta: {
      switchSensor: { id: `${deviceId}-switch`, name: "Switch Sensor", key: "switch", unit: "binary" },
      tofSensor: { id: `${deviceId}-tof`, name: "Time of Flight Sensor", key: "tof", unit: "mm" },
      temperatureSensor: { id: `${deviceId}-temperature`, name: "Temperature Sensor", key: "temperature", unit: "C" },
      accelerometer: { id: `${deviceId}-accelerometer`, name: "Accelerometer Sensor", key: "accelerometer", unit: "g" }
    },
    thresholds,
    isConnected: sensorRows.length > 0,
    sensorData: {
      switchSensor: {
        status: latestSnapshot.switchValue
      },
      tofSensor: {
        distanceMm: latestSnapshot.distanceMm,
        partCount: latestSnapshot.partCount
      },
      temperatureSensor: {
        current: latestSnapshot.temperature,
        min: thresholds.tempMin,
        max: thresholds.tempMax,
        warning: thresholds.tempMax,
        critical: thresholds.tempMax,
        history: temperatureHistory
      },
      accelerometer: {
        x: latestSnapshot.accelX,
        y: latestSnapshot.accelY,
        z: latestSnapshot.accelZ,
        history: accelerometerHistory
      }
    },
    vibrationMagnitude,
    alerts,
    employees: []
  };
}

export async function ingestSensorReading(payload) {
  const deviceId = String(payload.device_id || payload.deviceId || "default").trim();
  if (!deviceId) {
    throw new Error("device_id is required.");
  }

  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("timestamp is invalid.");
  }

  const switchValue = payload.switch_value ?? payload.switchValue ?? false;
  const distanceMm = toNumber(payload.distance_mm ?? payload.distanceMm);
  const partCount = Math.trunc(toNumber(payload.part_count ?? payload.partCount));
  const temperature = toNumber(payload.temperature);
  const accelX = toNumber(payload.accel_x ?? payload.accelX);
  const accelY = toNumber(payload.accel_y ?? payload.accelY);
  const accelZ = toNumber(payload.accel_z ?? payload.accelZ);

  const writeApi = getWriteApi();

  const point = new Point("sensor_data")
    .tag("device_id", deviceId)
    .timestamp(timestamp)
    .boolField("switch_value", Boolean(switchValue))
    .intField("distance_mm", distanceMm)
    .intField("part_count", partCount)
    .floatField("temperature", temperature)
    .floatField("ax", accelX)
    .floatField("ay", accelY)
    .floatField("az", accelZ);

  writeApi.writePoint(point);
  await writeApi.flush();

  return {
    ok: true,
    device_id: deviceId,
    timestamp: timestamp.toISOString()
  };
}