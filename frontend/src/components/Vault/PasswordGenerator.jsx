import React, { useState, useCallback } from "react";
import { RefreshCw, Copy, Check, Settings2 } from "lucide-react";
import { Button } from "../UI/Button";
import { Tooltip } from "../UI/Tooltip";

const CHAR_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

export const PasswordGenerator = ({ onSelect }) => {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ lower: true, upper: true, numbers: true, symbols: true });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let chars = "";
    if (options.lower) chars += CHAR_SETS.lower;
    if (options.upper) chars += CHAR_SETS.upper;
    if (options.numbers) chars += CHAR_SETS.numbers;
    if (options.symbols) chars += CHAR_SETS.symbols;

    if (!chars) return;

    let result = "";
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
    setCopied(false);
  }, [length, options]);

  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 5);
  };

  const strength = getStrength(password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];
  const strengthLabels = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat"];

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Generator Password</span>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-600 dark:text-slate-400">Panjang: <strong>{length}</strong></label>
        <input
          type="range"
          min="8"
          max="64"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg bg-slate-200 accent-slate-900 dark:bg-slate-700 dark:accent-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries({ lower: "a-z", upper: "A-Z", numbers: "0-9", symbols: "!@#" }).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
          </label>
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={generate} className="w-full">
        <RefreshCw className="w-4 h-4 mr-1.5" />
        Generate
      </Button>

      {password && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            <code className="flex-1 text-sm font-mono text-slate-900 break-all dark:text-white">{password}</code>
            <Tooltip text={copied ? "Tersalin!" : "Salin"}>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </Tooltip>
          </div>

          <div className="space-y-1">
            <div className="flex gap-1 h-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex-1 rounded-full ${i < strength ? strengthColors[strength - 1] : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Kekuatan: <span className="font-medium">{strengthLabels[strength - 1]}</span>
            </p>
          </div>

          {onSelect && (
            <Button size="sm" className="w-full" onClick={() => onSelect(password)}>
              Gunakan Password Ini
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
