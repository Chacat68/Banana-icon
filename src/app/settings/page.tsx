"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Eye, EyeOff, Save, Loader2, CheckCircle2, Key, Link, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      // API URL from server DB
      const res = await fetch("/api/settings");
      const data = (await res.json()) as Record<string, string>;
      setApiUrl(data.nano_banana_api_url || "");
      // API Key from localStorage only
      setApiKey(localStorage.getItem("nano_banana_api_key") || "");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Save API URL to server DB
      if (apiUrl.trim()) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nano_banana_api_url: apiUrl.trim() }),
        });
      }
      // Save API Key to localStorage only — never sent to server
      if (apiKey.trim()) {
        localStorage.setItem("nano_banana_api_key", apiKey.trim());
      } else {
        localStorage.removeItem("nano_banana_api_key");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [apiKey, apiUrl]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    setTestOk(false);
    try {
      const key = apiKey.trim() || localStorage.getItem("nano_banana_api_key") || "";
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: key ? { "X-Api-Key": key } : {},
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; latency?: number };
      if (data.ok) {
        setTestOk(true);
        setTestResult(`连接成功${data.latency ? ` (${data.latency}ms)` : ""}`);
      } else {
        setTestResult(data.error || "连接失败");
      }
    } catch {
      setTestResult("网络错误，无法测试");
    } finally {
      setTesting(false);
    }
  }, [apiKey]);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-yellow-400" />
          设置
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Section */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4 text-yellow-400" />
                Nano Banana API 配置
              </h2>

              {/* API URL */}
              <div className="mb-4">
                <label className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Link className="h-3 w-3" />
                  API URL
                </label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-yellow-500"
                  placeholder="https://api.nano-banana.example.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  Nano Banana API 的基础 URL
                </p>
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Key className="h-3 w-3" />
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm outline-none focus:border-yellow-500"
                    placeholder="输入你的 API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">
                  用于认证 Nano Banana API 请求
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    saved
                      ? "bg-green-500/20 text-green-400"
                      : saving
                        ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
                        : "bg-yellow-500 text-black hover:bg-yellow-400"
                  )}
                >
                  {saved ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      已保存
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      保存配置
                    </>
                  )}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  测试连接
                </button>
              </div>
              {testResult && (
                <p className={cn("mt-2 text-xs", testOk ? "text-green-400" : "text-red-400")}>
                  {testOk ? "✓" : "✗"} {testResult}
                </p>
              )}
            </div>

            {/* Info */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-2 text-xs font-medium text-zinc-400">说明</h3>
              <ul className="space-y-1 text-xs text-zinc-500">
                <li>• API Key 仅保存在浏览器本地（localStorage），不会上传至服务器或云端</li>
                <li>• 清除浏览器数据会丢失 API Key，请妥善保管原始密钥</li>
                <li>• API URL 保存在服务端数据库中，多设备共享</li>
                <li>• 也可通过环境变量 NANO_BANANA_API_KEY 和 NANO_BANANA_API_URL 作为默认值</li>
                <li>• 浏览器中的 API Key 优先级高于环境变量</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
