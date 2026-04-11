import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "../server/env.js";

const { dbConfig } = loadEnv();

const adapter = new PrismaMssql({
  server: dbConfig.server,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
});

const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"]
});

async function main() {
  const deviceId = process.env.SEED_DEVICE_ID || "RIG-001";
  const deviceName = process.env.SEED_DEVICE_NAME || "Primary IoT Test Rig";
  const location = process.env.SEED_DEVICE_LOCATION || "Assembly Line 1";

  await prisma.$executeRawUnsafe(
    `
    IF NOT EXISTS (SELECT 1 FROM dbo.Devices WHERE device_id = @P1)
    BEGIN
      INSERT INTO dbo.Devices (device_id, device_name, location, created_at)
      VALUES (@P1, @P2, @P3, GETDATE())
    END
    ELSE
    BEGIN
      UPDATE dbo.Devices
      SET device_name = @P2,
          location = @P3
      WHERE device_id = @P1
    END
  `,
    deviceId,
    deviceName,
    location
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM dbo.Sensor_Thresholds WHERE device_id = @P1`,
    deviceId
  );

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO dbo.Sensor_Thresholds (device_id, temp_min, temp_max, vibration_low, vibration_high)
    VALUES (@P1, @P2, @P3, @P4, @P5)
  `,
    deviceId,
    18,
    50,
    1.5,
    2.4
  );

  await prisma.$executeRawUnsafe(`DELETE FROM dbo.Sensor_Data WHERE device_id = @P1`, deviceId);

  const now = Date.now();
  for (let index = 0; index < 12; index += 1) {
    const timestamp = new Date(now - (11 - index) * 5000);
    const switchValue = index % 3 !== 0;
    const distanceMm = 280 + index * 14;
    const partCount = 120 + index;
    const temperature = Number((31.5 + Math.sin(index / 2) * 3.2).toFixed(2));
    const accelX = Number((0.42 + index * 0.03).toFixed(2));
    const accelY = Number((0.34 + index * 0.02).toFixed(2));
    const accelZ = Number((0.88 + index * 0.04).toFixed(2));

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO dbo.Sensor_Data (
        device_id,
        [timestamp],
        switch_value,
        distance_mm,
        part_count,
        temperature,
        accel_x,
        accel_y,
        accel_z
      ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)
    `,
      deviceId,
      timestamp,
      switchValue,
      distanceMm,
      partCount,
      temperature,
      accelX,
      accelY,
      accelZ
    );
  }

  console.log("Existing Azure SQL schema seeded successfully.");
  console.log(`Seeded device_id: ${deviceId}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
