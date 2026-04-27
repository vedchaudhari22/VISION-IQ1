import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { config } from "dotenv";
config();

const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG || "iot-test-ring";
const bucket = process.env.INFLUX_BUCKET || "iot-data1";
const url = process.env.INFLUX_URL || "https://us-east-1-1.aws.cloud2.influxdata.com";

if (!token) {
  console.error("❌ INFLUX_TOKEN not set in .env");
  process.exit(1);
}

const influxDB = new InfluxDB({ url, token });

function nsTimestamp(date) {
  return Math.floor(date.getTime() * 1e6);
}

async function seed() {
  const writeApi = influxDB.getWriteApi(org, bucket, "ns");

  const now = new Date();
  const points = [];

  // device_info - current time
  points.push(
    new Point("device_info")
      .tag("device_id", "RIG-001")
      .stringField("device_name", "IoT Test Rig")
      .stringField("location", "Assembly Line 1")
      .timestamp(nsTimestamp(now))
  );

  // thresholds - current time
  points.push(
    new Point("thresholds")
      .tag("device_id", "RIG-001")
      .floatField("temp_min", 0)
      .floatField("temp_max", 80)
      .floatField("vibration_low", 1.5)
      .floatField("vibration_high", 2.4)
      .timestamp(nsTimestamp(now))
  );

  // sensor_data - spread over last hour (valid timestamps)
  const sensorData = [
    { switch_value: true, distance_mm: 350, part_count: 120, temperature: 36.5, ax: 0.45, ay: 0.32, az: 0.91, minutesAgo: 45 },
    { switch_value: false, distance_mm: 355, part_count: 121, temperature: 37.1, ax: 0.52, ay: 0.29, az: 0.88, minutesAgo: 30 },
    { switch_value: true, distance_mm: 348, part_count: 122, temperature: 36.8, ax: 0.48, ay: 0.31, az: 0.90, minutesAgo: 15 }
  ];

  for (const d of sensorData) {
    const t = new Date(now.getTime() - d.minutesAgo * 60 * 1000);
    points.push(
      new Point("sensor_data")
        .tag("device_id", "RIG-001")
        .booleanField("switch_value", d.switch_value)
        .intField("distance_mm", d.distance_mm)
        .intField("part_count", d.part_count)
        .floatField("temperature", d.temperature)
        .floatField("ax", d.ax)
        .floatField("ay", d.ay)
        .floatField("az", d.az)
        .timestamp(nsTimestamp(t))
    );
  }

  writeApi.writePoints(points);
  await writeApi.flush();
  await writeApi.close();

  console.log("✅ Seeded: device_info, thresholds, 3x sensor_data points with valid timestamps");
}

seed().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});

