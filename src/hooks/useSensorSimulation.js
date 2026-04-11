import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../lib/api";

const EMPTY_SENSOR_DATA = {
  switchSensor: { status: 0 },
  tofSensor: { distanceMm: 0, partCount: 0 },
  temperatureSensor: {
    current: 0,
    min: 0,
    max: 0,
    warning: 0,
    critical: 0,
    history: []
  },
  accelerometer: {
    x: 0,
    y: 0,
    z: 0,
    history: []
  }
};

const EMPTY_SENSOR_META = {
  switchSensor: null,
  tofSensor: null,
  temperatureSensor: null,
  accelerometer: null
};

const FAILURE_TOLERANCE = 3;
const POLL_INTERVAL_MS = 3000;

export function useSensorSimulation() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSensor, setSelectedSensor] = useState("all");
  const [sensorData, setSensorData] = useState(EMPTY_SENSOR_DATA);
  const [sensorMeta, setSensorMeta] = useState(EMPTY_SENSOR_META);
  const [sensorCatalog, setSensorCatalog] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vibrationMagnitude, setVibrationMagnitude] = useState(0);
  const [vibrationThresholds, setVibrationThresholds] = useState({ low: 1.5, high: 2.4 });
  const [rig, setRig] = useState(null);
  const [config, setConfig] = useState(null);
  const failureCountRef = useRef(0);
  const timeoutRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadFromApi = async () => {
      if (!isMounted || requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;
      if (isMounted && !hasLoadedOnceRef.current) {
        setIsLoading(true);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache"
          }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || `API responded with ${response.status}`);
        }

        if (!isMounted) return;

        failureCountRef.current = 0;
        hasLoadedOnceRef.current = true;
        setSensorData(payload.sensorData || EMPTY_SENSOR_DATA);
        setSensorMeta(payload.sensorMeta || EMPTY_SENSOR_META);
        setSensorCatalog(Array.isArray(payload.sensorCatalog) ? payload.sensorCatalog : []);
        setRig(payload.rig || null);
        setConfig(payload.config || null);
        setAlerts(Array.isArray(payload.alerts) ? payload.alerts : []);
        setEmployees(Array.isArray(payload.employees) ? payload.employees : []);
        setVibrationMagnitude(Number(payload.vibrationMagnitude || 0));
        setVibrationThresholds({
          low: Number(payload.thresholds?.vibrationLow || 1.5),
          high: Number(payload.thresholds?.vibrationHigh || 2.4)
        });
        setIsConnected(Boolean(payload.isConnected));
        setError(payload.stale ? payload.staleReason || "Showing the last successful snapshot." : "");
      } catch (fetchError) {
        if (!isMounted) return;

        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURE_TOLERANCE) {
          hasLoadedOnceRef.current = true;
          setIsConnected(false);
          setError(fetchError.message || "Unable to load database telemetry.");
        }
      } finally {
        requestInFlightRef.current = false;
        if (isMounted) {
          setIsLoading(false);
          timeoutRef.current = window.setTimeout(loadFromApi, POLL_INTERVAL_MS);
        }
      }
    };

    loadFromApi();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const sensorOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Sensors" }];
    for (const sensor of sensorCatalog) {
      options.push({
        value: sensor.type.toLowerCase(),
        label: sensor.label
      });
    }
    return options;
  }, [sensorCatalog]);

  const temperatureState =
    sensorData.temperatureSensor.current >= sensorData.temperatureSensor.critical && sensorData.temperatureSensor.critical > 0
      ? "critical"
      : sensorData.temperatureSensor.current >= sensorData.temperatureSensor.warning && sensorData.temperatureSensor.warning > 0
        ? "warning"
        : "normal";

  const vibrationLevel =
    vibrationMagnitude > vibrationThresholds.high
      ? "High Vibration"
      : vibrationMagnitude > vibrationThresholds.low
        ? "Medium Vibration"
        : "Low Vibration";

  const exportRows = useMemo(
    () => [
      { sensor: sensorMeta.switchSensor?.name || "Switch Sensor", metric: "State", value: sensorData.switchSensor.status, unit: sensorMeta.switchSensor?.unit || "binary" },
      { sensor: sensorMeta.tofSensor?.name || "ToF Sensor", metric: "Distance", value: sensorData.tofSensor.distanceMm, unit: sensorMeta.tofSensor?.unit || "mm" },
      { sensor: sensorMeta.tofSensor?.name || "ToF Sensor", metric: "Part Count", value: sensorData.tofSensor.partCount, unit: "count" },
      { sensor: sensorMeta.temperatureSensor?.name || "Temperature Sensor", metric: "Current Temperature", value: sensorData.temperatureSensor.current, unit: sensorMeta.temperatureSensor?.unit || "C" },
      { sensor: sensorMeta.accelerometer?.name || "Accelerometer", metric: "Vibration Magnitude", value: vibrationMagnitude, unit: sensorMeta.accelerometer?.unit || "g" }
    ],
    [sensorData, sensorMeta, vibrationMagnitude]
  );

  return {
    alerts,
    employees,
    config,
    error,
    exportRows,
    isConnected,
    isLoading,
    rig,
    selectedSensor,
    sensorCatalog,
    sensorData,
    sensorMeta,
    sensorOptions,
    setSelectedSensor,
    temperatureState,
    vibrationLevel,
    vibrationMagnitude
  };
}

