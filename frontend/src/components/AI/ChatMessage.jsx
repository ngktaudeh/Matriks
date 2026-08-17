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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2a5f] to-[#800020] shadow-md shadow-[#ff2a5f]/30">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={`group relative max-w-[min(85%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
          isUser
            ? "bg-gradient-to-br from-[#ff2a5f] to-[#ff003c] text-white shadow-md shadow-[#ff2a5f]/25"
            : msg.isError
              ? "border border-red-500/40 bg-red-500/10 text-red-300"
              : "border border-white/10 bg-white/5 text-white/90 shadow-sm"
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
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/50 hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#00ff88]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Disalin" : "Salin"}
            </button>
            {isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/50 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Ulangi
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <User className="h-4 w-4 text-white/70" />
        </div>
      )}
    </div>
  );
};
