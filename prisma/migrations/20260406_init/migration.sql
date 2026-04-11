CREATE TABLE [DashboardConfig] (
  [id] NVARCHAR(1000) NOT NULL,
  [key] NVARCHAR(1000) NOT NULL CONSTRAINT [DashboardConfig_key_df] DEFAULT 'default',
  [appName] NVARCHAR(1000) NOT NULL,
  [loginBadge] NVARCHAR(1000) NOT NULL,
  [loginHeadline] NVARCHAR(1000) NOT NULL,
  [loginDescription] NVARCHAR(1000) NOT NULL,
  [dashboardSubtitle] NVARCHAR(1000) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DashboardConfig_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [DashboardConfig_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [DashboardConfig_key_key] UNIQUE NONCLUSTERED ([key])
);

CREATE TABLE [UserAccount] (
  [id] NVARCHAR(1000) NOT NULL,
  [fullName] NVARCHAR(1000) NOT NULL,
  [email] NVARCHAR(1000) NOT NULL,
  [passwordHash] NVARCHAR(1000) NOT NULL,
  [role] NVARCHAR(1000) NOT NULL CONSTRAINT [UserAccount_role_df] DEFAULT 'operator',
  [isActive] BIT NOT NULL CONSTRAINT [UserAccount_isActive_df] DEFAULT 1,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [UserAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UserAccount_email_key] UNIQUE NONCLUSTERED ([email])
);

CREATE TABLE [TestRig] (
  [id] NVARCHAR(1000) NOT NULL,
  [name] NVARCHAR(1000) NOT NULL,
  [code] NVARCHAR(1000) NOT NULL,
  [location] NVARCHAR(1000),
  [description] NVARCHAR(1000),
  [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TestRig_status_df] DEFAULT 'ONLINE',
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [TestRig_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [TestRig_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [TestRig_code_key] UNIQUE NONCLUSTERED ([code])
);

CREATE TABLE [Sensor] (
  [id] NVARCHAR(1000) NOT NULL,
  [rigId] NVARCHAR(1000) NOT NULL,
  [name] NVARCHAR(1000) NOT NULL,
  [key] NVARCHAR(1000) NOT NULL,
  [sensorType] NVARCHAR(1000) NOT NULL,
  [unit] NVARCHAR(1000),
  [minThreshold] FLOAT(53),
  [maxThreshold] FLOAT(53),
  [warningThreshold] FLOAT(53),
  [criticalThreshold] FLOAT(53),
  [isEnabled] BIT NOT NULL CONSTRAINT [Sensor_isEnabled_df] DEFAULT 1,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [Sensor_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [Sensor_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [Sensor_key_key] UNIQUE NONCLUSTERED ([key]),
  CONSTRAINT [Sensor_rigId_fkey] FOREIGN KEY ([rigId]) REFERENCES [TestRig]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE [SwitchReading] (
  [id] NVARCHAR(1000) NOT NULL,
  [sensorId] NVARCHAR(1000) NOT NULL,
  [value] BIT NOT NULL,
  [recordedAt] DATETIME2 NOT NULL CONSTRAINT [SwitchReading_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [SwitchReading_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [SwitchReading_sensorId_fkey] FOREIGN KEY ([sensorId]) REFERENCES [Sensor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE [TofReading] (
  [id] NVARCHAR(1000) NOT NULL,
  [sensorId] NVARCHAR(1000) NOT NULL,
  [distanceMm] INT NOT NULL,
  [partCount] INT NOT NULL,
  [recordedAt] DATETIME2 NOT NULL CONSTRAINT [TofReading_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [TofReading_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [TofReading_sensorId_fkey] FOREIGN KEY ([sensorId]) REFERENCES [Sensor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE [TemperatureReading] (
  [id] NVARCHAR(1000) NOT NULL,
  [sensorId] NVARCHAR(1000) NOT NULL,
  [temperatureC] FLOAT(53) NOT NULL,
  [recordedAt] DATETIME2 NOT NULL CONSTRAINT [TemperatureReading_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [TemperatureReading_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [TemperatureReading_sensorId_fkey] FOREIGN KEY ([sensorId]) REFERENCES [Sensor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE [AccelerometerReading] (
  [id] NVARCHAR(1000) NOT NULL,
  [sensorId] NVARCHAR(1000) NOT NULL,
  [axisX] FLOAT(53) NOT NULL,
  [axisY] FLOAT(53) NOT NULL,
  [axisZ] FLOAT(53) NOT NULL,
  [magnitude] FLOAT(53) NOT NULL,
  [recordedAt] DATETIME2 NOT NULL CONSTRAINT [AccelerometerReading_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [AccelerometerReading_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [AccelerometerReading_sensorId_fkey] FOREIGN KEY ([sensorId]) REFERENCES [Sensor]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE [AlertEvent] (
  [id] NVARCHAR(1000) NOT NULL,
  [rigId] NVARCHAR(1000) NOT NULL,
  [sensorId] NVARCHAR(1000),
  [title] NVARCHAR(1000) NOT NULL,
  [message] NVARCHAR(1000) NOT NULL,
  [severity] NVARCHAR(1000) NOT NULL,
  [isResolved] BIT NOT NULL CONSTRAINT [AlertEvent_isResolved_df] DEFAULT 0,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [AlertEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [AlertEvent_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [AlertEvent_rigId_fkey] FOREIGN KEY ([rigId]) REFERENCES [TestRig]([id]) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX [SwitchReading_sensorId_recordedAt_idx] ON [SwitchReading]([sensorId], [recordedAt]);
CREATE INDEX [TofReading_sensorId_recordedAt_idx] ON [TofReading]([sensorId], [recordedAt]);
CREATE INDEX [TemperatureReading_sensorId_recordedAt_idx] ON [TemperatureReading]([sensorId], [recordedAt]);
CREATE INDEX [AccelerometerReading_sensorId_recordedAt_idx] ON [AccelerometerReading]([sensorId], [recordedAt]);
