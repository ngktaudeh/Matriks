import React from "react";
import { Clock, Tag } from "lucide-react";
import { Modal } from "../UI/Modal";
import { formatRelative } from "../../utils/formatters";

export const ItemDetailModal = ({ item, isOpen, onClose }) => {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Item" size="lg">
      <div className="space-y-4">
        {item.image_url && (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <img
              src={item.image_url}
              alt={item.title}
              className="max-h-72 w-full object-cover"
            />
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold leading-snug text-slate-900 dark:text-white">
            {item.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {item.category}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Clock className="h-3 w-3" />
              {formatRelative(item.updated_at || item.created_at)}
            </span>
          </div>
        </div>

        {item.content && (
          <div className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
            {item.content}
          </div>
        )}

        {item.tags?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="h-4 w-4 text-slate-400" />
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
