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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Bot className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </div>
      )}

      <div
        className={`group relative max-w-[min(85%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
            : msg.isError
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        ) : (
          <MarkdownContent content={msg.content} />
        )}

        {!isUser && msg.content && !msg.isError && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              title="Salin"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Disalin" : "Salin"}
            </button>
            {isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title="Generate ulang"
              >
                <RefreshCw className="h-3 w-3" />
                Ulangi
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
          <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </div>
  );
};
