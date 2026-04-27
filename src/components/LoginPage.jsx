import React, { useEffect, useState } from "react";

const featureItems = [
  ["NO/NC Status", "Switch State"],
  ["Telemetry", "ToF Count"],
  ["Alerts", "Thermal Trend"]
];

export function LoginPage({ rememberedEmail, onLogin, uiConfig, theme, onToggleTheme }) {
  const [formData, setFormData] = useState({
    email: rememberedEmail,
    password: "",
    rememberMe: Boolean(rememberedEmail)
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      email: rememberedEmail,
      rememberMe: Boolean(rememberedEmail)
    }));
  }, [rememberedEmail]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = "Enter a valid email address.";
    if (formData.password.trim().length < 6) nextErrors.password = "Password must be at least 6 characters.";

    setErrors(nextErrors);
    setServerError("");
    if (Object.keys(nextErrors).length !== 0) return;

    setIsSubmitting(true);
    try {
      await onLogin(formData);
    } catch (error) {
      setServerError(error.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#eef6ff_0%,#f7fbff_52%,#e4eefb_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-[36px] border border-blue-100 bg-white/78 shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:grid-cols-[1.16fr_0.84fr]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <img src="/cnn-hero.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[72%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,34,63,0.88)_0%,rgba(7,44,86,0.76)_34%,rgba(7,44,86,0.38)_62%,rgba(7,44,86,0.14)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-[56%] bg-[linear-gradient(90deg,rgba(7,34,63,0.30),rgba(7,34,63,0))]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
            <div className="max-w-xl space-y-7">
              <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white/90 backdrop-blur-sm shadow-lg shadow-blue-950/15">
                {uiConfig.loginBadge || "Assembly Line 1"}
              </span>
              <div className="space-y-5">
                <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] text-white xl:text-[4rem]">
                  {uiConfig.loginHeadline || "Monitor your IoT test rig with live data fetched from InfluxDB."}
                </h1>
                <p className="max-w-lg text-base leading-8 text-white/82 xl:text-lg">
                  {uiConfig.loginDescription || "PLC data can be pushed into Sensor_Data through HTTP or Modbus TCP middleware, then visualized here in real time."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {featureItems.map(([label, title]) => (
                <div key={label} className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-md shadow-lg shadow-slate-950/10">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">{label}</p>
                  <p className="mt-5 text-2xl font-semibold text-white">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.94))] p-6 sm:p-10">
          <div className="w-full max-w-[430px] rounded-[32px] border border-blue-100 bg-white/96 p-7 shadow-[0_24px_70px_rgba(30,64,175,0.10)] sm:p-9">
            <div className="mb-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.32em] text-blue-700">{uiConfig.appName || "Primary IoT Test Rig"}</p>
              <h2 className="text-4xl font-semibold text-slate-900">Login</h2>
              <p className="max-w-sm text-base leading-7 text-slate-500">Enter your operator credentials to access the dashboard.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="engineer@testrig.com"
                />
                {errors.email ? <p className="text-sm text-rose-500">{errors.email}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Minimum 6 characters"
                />
                {errors.password ? <p className="text-sm text-rose-500">{errors.password}</p> : null}
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(event) => setFormData((current) => ({ ...current, rememberMe: event.target.checked }))}
                  className="h-4 w-4 rounded border-blue-200 bg-transparent text-blue-600 focus:ring-blue-500"
                />
                Remember Me
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="brand-accent w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>

            {serverError ? <p className="mt-4 text-sm text-rose-600">{serverError}</p> : null}
            <p className="mt-6 text-sm leading-6 text-slate-500">Demo credentials after seeding: admin@test.com / demo123</p>
          </div>
        </section>
      </div>
    </main>
  );
}

