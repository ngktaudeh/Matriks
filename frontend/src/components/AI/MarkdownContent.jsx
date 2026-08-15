import React, { useMemo } from "react";
import { markdownToHtml } from "../../utils/markdown";

export const MarkdownContent = ({ content, className = "" }) => {
  const html = useMemo(() => markdownToHtml(content || ""), [content]);
  return (
    <div
      className={`md-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
