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
  const [keyEdited, setKeyEdited] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = (await res.json()) as Record<string, string>;
      setApiKey(data.nano_banana_api_key || "");
      setApiUrl(data.nano_banana_api_url || "");
      setKeyEdited(false);
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
      const body: Record<string, string> = {};
      if (apiUrl.trim()) body.nano_banana_api_url = apiUrl.trim();
      // Only send API key if the user actually edited it (not the masked value)
      if (keyEdited && apiKey.trim()) body.nano_banana_api_key = apiKey.trim();

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setKeyEdited(false);
      // Reload to get masked key
      setTimeout(() => {
        loadSettings();
        setSaved(false);
      }, 1500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [apiKey, apiUrl, keyEdited, loadSettings]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    setTestOk(false);
    try {
      const res = await fetch("/api/settings/test", { method: "POST" });
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
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
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
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setKeyEdited(true);
                    }}
                    onFocus={() => {
                      // Clear masked value on focus so user can type fresh
                      if (!keyEdited && apiKey.includes("•")) {
                        setApiKey("");
                        setKeyEdited(true);
                      }
                    }}
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
                <li>• API Key 保存后将以掩码方式显示，仅展示最后 4 位</li>
                <li>• 配置保存在数据库中，服务重启后仍然有效</li>
                <li>• 也可通过环境变量 NANO_BANANA_API_KEY 和 NANO_BANANA_API_URL 配置</li>
                <li>• 数据库中的配置优先级高于环境变量</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
