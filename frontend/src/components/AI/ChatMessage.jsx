import React, { useState } from "react";
import { Bot, User, Copy, Check, RefreshCw } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

export const ChatMessage = ({ msg, onCopy, onRegenerate, isLastAssistant }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = async () => {
    await onCopy?.(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/25">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={`group relative max-w-[min(85%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
          isUser
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
            : msg.isError
              ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "border border-slate-200/80 bg-white text-slate-800 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        ) : (
          <MarkdownContent content={msg.content} />
        )}

        {!isUser && msg.content && !msg.isError && (
          <div className="mt-2.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Disalin" : "Salin"}
            </button>
            {isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/80 dark:hover:text-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Ulangi
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
          <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </div>
  );
};
