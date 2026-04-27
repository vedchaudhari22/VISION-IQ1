import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useSensorSimulation } from "../hooks/useSensorSimulation";

const tempStateStyles = {
  normal: "bg-emerald-400/12 text-emerald-700 ring-emerald-400/25",
  warning: "bg-amber-400/12 text-amber-700 ring-amber-300/25",
  critical: "bg-rose-500/12 text-rose-700 ring-rose-300/25"
};

const toneStyles = {
  default: "surface-muted text-slate-800",
  success: "bg-emerald-400/12 text-emerald-700",
  warning: "bg-amber-400/12 text-amber-700",
  danger: "bg-rose-500/12 text-rose-700"
};

const vibrationStyles = {
  "Low Vibration": "text-emerald-600",
  "Medium Vibration": "text-amber-600",
  "High Vibration": "text-rose-600"
};

const pageMeta = {
  home: { label: "Home", title: "Management Overview", accent: "from-sky-500 to-blue-600", glyph: "HM" },
  overview: { label: "Overview", title: "Live rig telemetry and sensor detail", accent: "from-blue-600 to-sky-500", glyph: "OV" },
  alerts: { label: "Alerts", title: "Emergency, warning, and information notices", accent: "from-rose-500 to-orange-400", glyph: "AL" },
  reports: { label: "Reports", title: "OEE, performance, availability, and quality", accent: "from-violet-500 to-blue-600", glyph: "RP" },
  admin: { label: "Admin", title: "Employee directory and access control", accent: "from-slate-700 to-slate-900", glyph: "AD" }
};

function SectionCard({ title, subtitle, action, children }) {
  return (
    <article className="glass-panel rounded-[26px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function StatChip({ label, value, tone = "default" }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${toneStyles[tone] || toneStyles.default}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, tone = "default", helper }) {
  return (
    <div className={`rounded-[24px] border border-blue-100 p-5 ${toneStyles[tone] || toneStyles.default}`}>
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function HomeTile({ item, onOpen, locked = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-[30px] border border-blue-100 bg-white/90 p-6 text-left shadow-lg shadow-blue-900/5 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-lg font-semibold tracking-[0.16em] text-white`}>
          {item.glyph}
        </div>
        {locked ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Admin only</span> : null}
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-slate-900">{item.label}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{item.title}</p>
    </button>
  );
}

function EmptyNotice({ title, description, tone = "slate" }) {
  const palette = tone === "emerald"
    ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-700"
    : tone === "amber"
      ? "border-amber-300/30 bg-amber-400/10 text-amber-700"
      : tone === "rose"
        ? "border-rose-300/30 bg-rose-500/10 text-rose-700"
        : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-2xl border p-4 ${palette}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function exportCsv(rows) {
  const headers = Object.keys(rows[0] || {});
  if (headers.length === 0) return;

  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => row[header]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = `iot-test-rig-export-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function DashboardLayout({ authUser, uiConfig, onLogout }) {
  const [activePage, setActivePage] = useState("home");
  const {
    alerts,
    config,
    employees,
    error,
    exportRows,
    isConnected,
    isLoading,
    rig,
    selectedSensor,
    sensorData,
    sensorMeta,
    sensorOptions,
    setSelectedSensor,
    temperatureState,
    vibrationLevel,
    vibrationMagnitude
  } = useSensorSimulation();

  const effectiveConfig = config || uiConfig;
  const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";
  const hasSnapshot = Boolean(rig && (sensorData.tofSensor.partCount > 0 || sensorData.tofSensor.distanceMm > 0 || sensorData.temperatureSensor.current > 0 || sensorData.switchSensor.status === 1));

  const statusSummary = useMemo(() => {
    if (isLoading && !hasSnapshot) {
      return { tone: "amber", label: "Loading", message: "Loading telemetry from InfluxDB." };
    }
    if (error && hasSnapshot) {
      return { tone: "amber", label: "Cached Data", message: error };
    }
    if (isConnected) {
      return { tone: "emerald", label: rig?.status || "Online", message: `Live data for ${rig?.name || "the active rig"}.` };
    }
    return { tone: "rose", label: hasSnapshot ? "Unavailable" : "No Data", message: error || "Database telemetry is currently unavailable." };
  }, [error, hasSnapshot, isConnected, isLoading, rig]);

  const visibleOverviewCards = useMemo(() => {
    const allCards = [
      {
        id: "switch",
        element: (
          <SectionCard
            title={sensorMeta.switchSensor?.name || "Switch Sensor"}
            subtitle="Live digital input state from the latest stored reading."
            action={<span className={`rounded-full px-3 py-1 text-xs font-medium ${sensorData.switchSensor.status === 1 ? "bg-emerald-400/12 text-emerald-700" : "bg-rose-500/12 text-rose-700"}`}>{sensorData.switchSensor.status === 1 ? "ON (1)" : "OFF (0)"}</span>}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className={`relative h-16 w-32 rounded-full border transition ${sensorData.switchSensor.status === 1 ? "border-emerald-300/50 bg-emerald-400/20" : "border-rose-300/40 bg-rose-500/12"}`}>
                  <div className={`absolute top-2 h-12 w-12 rounded-full bg-white shadow-lg transition-all duration-500 ${sensorData.switchSensor.status === 1 ? "left-[4.2rem]" : "left-2"}`} />
                </div>
                <p className="mt-4 text-sm text-slate-500">The latest switch status is read directly from the database.</p>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <StatChip label="Sensor Key" value={sensorMeta.switchSensor?.key || "N/A"} />
                <StatChip label="Signal State" value={sensorData.switchSensor.status === 1 ? "Active" : "Inactive"} tone={sensorData.switchSensor.status === 1 ? "success" : "danger"} />
              </div>
            </div>
          </SectionCard>
        )
      },
      {
        id: "time_of_flight",
        element: (
          <SectionCard
            title={sensorMeta.tofSensor?.name || "Time of Flight Sensor"}
            subtitle="Distance measurement and part count from stored rig readings."
            action={<button onClick={() => exportCsv(exportRows)} className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs text-blue-700">Export CSV</button>}
          >
            <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatChip label="Distance" value={`${sensorData.tofSensor.distanceMm} mm`} />
                <StatChip label="Part Count" value={sensorData.tofSensor.partCount} tone="success" />
                <div className="surface-muted rounded-2xl p-4 sm:col-span-2">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Distance Band</span>
                    <span className="text-slate-800">{Math.round(sensorData.tofSensor.distanceMm / 10)} cm</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-700" style={{ width: `${Math.min((sensorData.tofSensor.distanceMm / 900) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 p-6 text-center text-white shadow-lg shadow-blue-900/10">
                <p className="text-sm text-blue-100">Capture Gauge</p>
                <div className="mt-6 flex h-44 items-center justify-center">
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-8 border-white/20 bg-white/10">
                    <div className="absolute inset-3 rounded-full border border-white/20" />
                    <div className="text-center">
                      <p className="text-4xl font-semibold">{sensorData.tofSensor.distanceMm}</p>
                      <p className="mt-1 text-sm text-blue-100">{sensorMeta.tofSensor?.unit || "mm"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        )
      },
      {
        id: "temperature",
        element: (
          <SectionCard title={sensorMeta.temperatureSensor?.name || "Temperature Sensor"} subtitle="Thermal performance against stored warning and critical thresholds." action={<span className={`rounded-full px-3 py-1 text-xs ring-1 ${tempStateStyles[temperatureState]}`}>{temperatureState.toUpperCase()}</span>}>
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4">
                <StatChip label="Current" value={`${sensorData.temperatureSensor.current} ${sensorMeta.temperatureSensor?.unit || "C"}`} tone={temperatureState === "critical" ? "danger" : temperatureState === "warning" ? "warning" : "success"} />
                <StatChip label="Minimum Threshold" value={`${sensorData.temperatureSensor.min} ${sensorMeta.temperatureSensor?.unit || "C"}`} />
                <StatChip label="Maximum Threshold" value={`${sensorData.temperatureSensor.max} ${sensorMeta.temperatureSensor?.unit || "C"}`} />
              </div>
              <div className="surface-muted h-72 rounded-2xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensorData.temperatureSensor.history.map((item) => ({ label: item.time, value: item.value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="label" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SectionCard>
        )
      },
      {
        id: "accelerometer",
        element: (
          <SectionCard title={sensorMeta.accelerometer?.name || "Accelerometer Sensor"} subtitle="Three-axis vibration trend from stored accelerometer readings." action={<span className={`text-sm font-medium ${vibrationStyles[vibrationLevel]}`}>{vibrationLevel}</span>}>
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="grid gap-4">
                <StatChip label="Axis X" value={`${sensorData.accelerometer.x} ${sensorMeta.accelerometer?.unit || "g"}`} />
                <StatChip label="Axis Y" value={`${sensorData.accelerometer.y} ${sensorMeta.accelerometer?.unit || "g"}`} />
                <StatChip label="Axis Z" value={`${sensorData.accelerometer.z} ${sensorMeta.accelerometer?.unit || "g"}`} />
                <StatChip label="Magnitude" value={`${vibrationMagnitude} ${sensorMeta.accelerometer?.unit || "g"}`} tone={vibrationLevel === "High Vibration" ? "danger" : vibrationLevel === "Medium Vibration" ? "warning" : "success"} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="surface-muted h-64 rounded-2xl p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensorData.accelerometer.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="label" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Line type="monotone" dataKey="x" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="y" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="z" stroke="#fb7185" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="surface-muted h-64 rounded-2xl p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ axis: "X", value: sensorData.accelerometer.x }, { axis: "Y", value: sensorData.accelerometer.y }, { axis: "Z", value: sensorData.accelerometer.z }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="axis" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </SectionCard>
        )
      }
    ];
    return selectedSensor === "all" ? allCards : allCards.filter((card) => card.id === selectedSensor);
  }, [exportRows, selectedSensor, sensorData, sensorMeta, temperatureState, vibrationLevel, vibrationMagnitude]);

  const derivedInformationAlerts = useMemo(() => ([
    { id: "info-rig", title: "Rig Status", message: `${rig?.name || "Active rig"} is currently ${statusSummary.label.toLowerCase()}.`, severity: "information" },
    { id: "info-throughput", title: "Production Throughput", message: `${sensorData.tofSensor.partCount} parts have been counted in the latest reading window.`, severity: "information" },
    { id: "info-temperature", title: "Thermal Snapshot", message: `Current temperature is ${sensorData.temperatureSensor.current} ${sensorMeta.temperatureSensor?.unit || "C"}.`, severity: "information" }
  ]), [rig, sensorData, sensorMeta, statusSummary.label]);

  const groupedAlerts = useMemo(() => ({
    emergency: alerts.filter((item) => String(item.severity).toLowerCase() === "critical"),
    warning: alerts.filter((item) => String(item.severity).toLowerCase() === "warning"),
    information: [...alerts.filter((item) => !["critical", "warning"].includes(String(item.severity).toLowerCase())), ...derivedInformationAlerts]
  }), [alerts, derivedInformationAlerts]);

  const reportMetrics = useMemo(() => {
    const baseAvailability = sensorData.temperatureSensor.history.length > 0 ? Math.min((sensorData.temperatureSensor.history.length / 12) * 100, 100) : 0;
    const availability = Number((isConnected ? baseAvailability : Math.max(baseAvailability - 8, 0)).toFixed(1));
    const performance = Number(Math.min((sensorData.tofSensor.partCount / 150) * 100 + (sensorData.tofSensor.distanceMm > 0 ? 8 : 0), 100).toFixed(1));
    let qualityPenalty = 0;
    if (temperatureState === "warning") qualityPenalty += 8;
    if (temperatureState === "critical") qualityPenalty += 18;
    if (vibrationLevel === "Medium Vibration") qualityPenalty += 6;
    if (vibrationLevel === "High Vibration") qualityPenalty += 14;
    const quality = Number(Math.max(100 - qualityPenalty, 0).toFixed(1));
    const oee = Number(((availability / 100) * (performance / 100) * (quality / 100) * 100).toFixed(1));
    return { availability, performance, quality, oee };
  }, [isConnected, sensorData, temperatureState, vibrationLevel]);

  const pageCards = [
    { key: "overview", ...pageMeta.overview, locked: false },
    { key: "alerts", ...pageMeta.alerts, locked: false },
    { key: "reports", ...pageMeta.reports, locked: false },
    { key: "admin", ...pageMeta.admin, locked: !isAdmin }
  ];

  const renderHomePage = () => (
    <section className="space-y-6">
      <div className="glass-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-700">Welcome</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Choose a dashboard area</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">Click a card to open Overview, Alerts & Notifications, Reports, or Admin. This is the first page shown after login.</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-lg shadow-blue-900/5">
            <span className="font-medium text-slate-800">Active rig:</span> {rig?.name || effectiveConfig?.appName || "Primary IoT Test Rig"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
        {pageCards.map((card) => (
          <HomeTile key={card.key} item={card} locked={card.locked} onOpen={() => setActivePage(card.key)} />
        ))}
      </div>
    </section>
  );

  const renderOverviewPage = () => (
    <section className="space-y-6">
      {error && !isLoading ? <section className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800">{error}</section> : null}
      <section className="grid gap-4 xl:grid-cols-4">
        <StatChip label={sensorMeta.switchSensor?.name || "Switch"} value={sensorData.switchSensor.status === 1 ? "ON" : "OFF"} tone={sensorData.switchSensor.status === 1 ? "success" : "danger"} />
        <StatChip label={sensorMeta.tofSensor?.name || "Distance"} value={`${sensorData.tofSensor.distanceMm} mm`} />
        <StatChip label={sensorMeta.temperatureSensor?.name || "Temperature"} value={`${sensorData.temperatureSensor.current} ${sensorMeta.temperatureSensor?.unit || "C"}`} tone={temperatureState === "critical" ? "danger" : temperatureState === "warning" ? "warning" : "success"} />
        <StatChip label={sensorMeta.accelerometer?.name || "Vibration"} value={vibrationLevel} tone={vibrationLevel === "High Vibration" ? "danger" : vibrationLevel === "Medium Vibration" ? "warning" : "success"} />
      </section>
      <section className="grid gap-6 2xl:grid-cols-[1.6fr_0.8fr]">
        <div className="grid gap-6">{visibleOverviewCards.map((card) => <div key={card.id}>{card.element}</div>)}</div>
        <div className="space-y-6">
          <SectionCard title="Alerts & Insights" subtitle="Active notifications stored in the database.">
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert) => (
                <div key={alert.id} className={`rounded-2xl border p-4 ${alert.severity === "critical" ? "border-rose-300/30 bg-rose-500/10" : alert.severity === "warning" ? "border-amber-300/30 bg-amber-400/10" : "border-blue-200 bg-blue-50"}`}>
                  <p className="font-semibold text-slate-900">{alert.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p>
                </div>
              )) : <EmptyNotice title="System Stable" description="No unresolved alert records are currently stored for this rig." tone="emerald" />}
            </div>
          </SectionCard>
          <SectionCard title="Operational Summary" subtitle="Quick health indicators for the active test cycle.">
            <div className="grid gap-3">
              <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Rig</p><p className="mt-2 text-lg font-semibold text-slate-900">{rig?.name || "Unavailable"}</p></div>
              <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Mechanical Health</p><p className={`mt-2 text-lg font-semibold ${vibrationStyles[vibrationLevel]}`}>{vibrationLevel}</p></div>
              <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Throughput</p><p className="mt-2 text-lg font-semibold text-slate-900">{sensorData.tofSensor.partCount} parts processed</p></div>
            </div>
          </SectionCard>
        </div>
      </section>
    </section>
  );

  const renderAlertsPage = () => (
    <section className="grid gap-6 xl:grid-cols-3">
      <SectionCard title="Emergency" subtitle="Critical machine conditions that need immediate action.">
        <div className="space-y-3">
          {groupedAlerts.emergency.length > 0 ? groupedAlerts.emergency.map((alert) => <div key={alert.id} className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4"><p className="font-semibold text-rose-700">{alert.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p></div>) : <EmptyNotice title="No emergency alerts" description="No critical alerts are active for this rig right now." tone="emerald" />}
        </div>
      </SectionCard>
      <SectionCard title="Warning" subtitle="Conditions that should be monitored and corrected soon.">
        <div className="space-y-3">
          {groupedAlerts.warning.length > 0 ? groupedAlerts.warning.map((alert) => <div key={alert.id} className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4"><p className="font-semibold text-amber-700">{alert.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p></div>) : <EmptyNotice title="No warning alerts" description="No warning-level events are currently stored." tone="emerald" />}
        </div>
      </SectionCard>
      <SectionCard title="Information" subtitle="Operational and status messages for the line team.">
        <div className="space-y-3">
          {groupedAlerts.information.length > 0 ? groupedAlerts.information.map((alert) => <div key={alert.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="font-semibold text-blue-700">{alert.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p></div>) : <EmptyNotice title="No informational notices" description="This section will show machine information updates." />}
        </div>
      </SectionCard>
    </section>
  );

  const renderReportsPage = () => (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-4">
        <MetricCard label="OEE" value={`${reportMetrics.oee}%`} tone="success" helper="Overall equipment effectiveness" />
        <MetricCard label="Performance" value={`${reportMetrics.performance}%`} helper="Derived from current throughput and cycle progress" />
        <MetricCard label="Availability" value={`${reportMetrics.availability}%`} helper="Based on active history coverage and connection state" />
        <MetricCard label="Quality" value={`${reportMetrics.quality}%`} tone={reportMetrics.quality < 80 ? "warning" : "success"} helper="Adjusted using temperature and vibration conditions" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Report Trends" subtitle="Quick production effectiveness trend based on live telemetry.">
          <div className="surface-muted h-80 rounded-2xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData.temperatureSensor.history.map((item, index) => ({ label: item.time, oee: Math.max(reportMetrics.oee - (sensorData.temperatureSensor.history.length - index) * 1.2, 0), performance: Math.max(reportMetrics.performance - (sensorData.temperatureSensor.history.length - index) * 0.8, 0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="oee" stroke="#2563eb" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="performance" stroke="#0ea5e9" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Report Summary" subtitle="Calculated KPIs for the active line.">
          <div className="grid gap-3">
            <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Parts Counted</p><p className="mt-2 text-2xl font-semibold text-slate-900">{sensorData.tofSensor.partCount}</p></div>
            <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Current Distance</p><p className="mt-2 text-2xl font-semibold text-slate-900">{sensorData.tofSensor.distanceMm} mm</p></div>
            <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Current Temperature</p><p className="mt-2 text-2xl font-semibold text-slate-900">{sensorData.temperatureSensor.current} C</p></div>
            <div className="surface-muted rounded-2xl p-4"><p className="text-sm text-slate-500">Vibration Magnitude</p><p className={`mt-2 text-2xl font-semibold ${vibrationStyles[vibrationLevel]}`}>{vibrationMagnitude} g</p></div>
          </div>
        </SectionCard>
      </div>
    </section>
  );

  const renderAdminPage = () => {
    if (!isAdmin) {
      return <SectionCard title="Admin Access" subtitle="This page is restricted to admin users."><EmptyNotice title="Access restricted" description="Only admin users can open the employee directory page." tone="amber" /></SectionCard>;
    }
    return (
      <SectionCard title="Employee Directory" subtitle="Company employee records available to admin users.">
        {employees.length > 0 ? (
          <div className="overflow-hidden rounded-[24px] border border-blue-100">
            <table className="min-w-full divide-y divide-blue-100 bg-white/90 text-sm">
              <thead className="bg-blue-50/80 text-slate-600"><tr><th className="px-4 py-3 text-left font-medium">Employee</th><th className="px-4 py-3 text-left font-medium">Email</th><th className="px-4 py-3 text-left font-medium">Role</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-left font-medium">Joined</th></tr></thead>
              <tbody className="divide-y divide-blue-50 text-slate-700">
                {employees.map((employee) => <tr key={employee.id}><td className="px-4 py-3 font-medium text-slate-900">{employee.fullName}</td><td className="px-4 py-3">{employee.email}</td><td className="px-4 py-3 capitalize">{employee.role}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${employee.isActive ? "bg-emerald-400/12 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{employee.isActive ? "Active" : "Inactive"}</span></td><td className="px-4 py-3">{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "-"}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <EmptyNotice title="No employee records found" description="No rows were returned from the UserAccount table for this environment." />}
      </SectionCard>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return renderOverviewPage();
      case "alerts":
        return renderAlertsPage();
      case "reports":
        return renderReportsPage();
      case "admin":
        return renderAdminPage();
      default:
        return renderHomePage();
    }
  };

  return (
    <div className="min-h-screen px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
      <div className="relative mx-auto max-w-[1700px] overflow-hidden rounded-[32px] border border-blue-100 bg-white/80 shadow-2xl shadow-blue-900/10 backdrop-blur-2xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.96)), url('/cnn-hero.jpg')",
            backgroundPosition: "right top",
            backgroundRepeat: "no-repeat",
            backgroundSize: "min(46vw, 680px) auto"
          }}
        />

        <header className="relative border-b border-blue-100 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-lg shadow-blue-900/5">
                <img src="/cnn-logo.png" alt="Dashboard logo" className="max-h-full w-auto object-contain" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-blue-700">Rig Control</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">{effectiveConfig?.appName || rig?.name || "Dashboard"}</h1>
                <p className="mt-2 text-sm text-slate-500">{pageMeta[activePage]?.title || effectiveConfig?.dashboardSubtitle || "Industrial Monitoring Overview"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 text-sm shadow-lg shadow-blue-900/5">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${statusSummary.tone === "emerald" ? "bg-emerald-500" : statusSummary.tone === "amber" ? "bg-amber-500" : "bg-rose-500"}`} />
                  <span className="font-medium text-slate-800">{statusSummary.label}</span>
                </div>
                <p className="mt-2 text-slate-500">{statusSummary.message}</p>
              </div>

              <select value={selectedSensor} onChange={(event) => setSelectedSensor(event.target.value)} className="rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 text-sm text-slate-800 outline-none shadow-lg shadow-blue-900/5">
                {sensorOptions.map((sensor) => <option key={sensor.value} value={sensor.value}>{sensor.label}</option>)}
              </select>

              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 shadow-lg shadow-blue-900/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">{(authUser?.fullName || "User").slice(0, 1).toUpperCase()}</div>
                <div className="text-sm">
                  <p className="text-slate-800">{authUser?.fullName || "User Profile"}</p>
                  <p className="text-slate-500">{authUser?.role || "Operator"}</p>
                </div>
              </div>

              <button type="button" onClick={onLogout} className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-400">Logout</button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {Object.entries(pageMeta).map(([key, meta]) => {
              if (key === "admin" && !isAdmin) return null;
              return (
                <button key={key} type="button" onClick={() => setActivePage(key)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${activePage === key ? "bg-blue-600 text-white shadow-lg shadow-blue-900/15" : "border border-blue-100 bg-white/90 text-slate-600 hover:border-blue-200"}`}>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </header>

        <main className="relative space-y-6 p-5 sm:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

