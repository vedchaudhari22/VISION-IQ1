import React, { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { API_BASE_URL } from "./lib/api";

const EMAIL_STORAGE_KEY = "iot-rig-email";
const THEME_KEY = "iot-rig-theme";
const EMPTY_UI_CONFIG = {
  appName: "",
  loginBadge: "",
  loginHeadline: "",
  loginDescription: "",
  dashboardSubtitle: ""
};

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState("");
  const [authState, setAuthState] = useState(null);
  const [uiConfig, setUiConfig] = useState(EMPTY_UI_CONFIG);
  const [theme, setTheme] = useState(() => {
    const stored = safeGet(localStorage, THEME_KEY) || safeGet(sessionStorage, THEME_KEY);
    if (stored === "dark") return "dark";
    if (stored === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    safeSet(localStorage, THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.add("light");
    setRememberedEmail(safeGet(localStorage, EMAIL_STORAGE_KEY) || "");
    setIsAuthenticated(false);

    fetch(`${API_BASE_URL}/api/public/config`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load UI config.");
        }
        return response.json();
      })
      .then((payload) => setUiConfig(payload))
      .catch(() => setUiConfig(EMPTY_UI_CONFIG));
  }, []);

  const handleLogin = async ({ email, rememberMe }) => {
    if (rememberMe) {
      safeSet(localStorage, EMAIL_STORAGE_KEY, email);
      setRememberedEmail(email);
    } else {
      safeRemove(localStorage, EMAIL_STORAGE_KEY);
      setRememberedEmail("");
    }

    const inferredRole = email.toLowerCase().includes("admin") ? "Admin" : "Operator";
    setAuthState({ user: { email, fullName: email.split("@")[0] || "Operator", role: inferredRole } });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthState(null);
    setIsAuthenticated(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      {isAuthenticated ? (
        <DashboardLayout
          authToken={null}
          authUser={authState?.user}
          uiConfig={uiConfig}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <LoginPage
          rememberedEmail={rememberedEmail}
          onLogin={handleLogin}
          uiConfig={uiConfig}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}
