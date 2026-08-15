import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export const ConfirmDialog = ({
  isOpen,
  title = "Konfirmasi",
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="flex items-start gap-3">
      {danger && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
      )}
      <p className="pt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {message}
      </p>
    </div>
  </Modal>
);
