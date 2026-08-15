import React, { useState } from "react";
import { Plus, X, Edit2, Check, Trash2, FolderOpen } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";
import { Modal } from "../UI/Modal";

export const CategoryManager = ({ categories, onAdd, onUpdate, onDelete, isOpen, onClose }) => {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { error } = await onAdd(newName);
    if (error) setError(error.message || "Gagal menambah kategori");
    else setNewName("");
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    await onUpdate(id, editName);
    setEditingId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kelola Kategori" size="md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nama kategori baru..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Tambah
          </Button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {editingId === cat.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleUpdate(cat.id)}>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <FolderOpen className="w-4 h-4 text-slate-400" />
                    {cat.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:bg-red-50 dark:text-red-400"
                      onClick={() => onDelete(cat.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
