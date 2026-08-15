import React, { useState } from "react";
import { X, User, Mail, Calendar, KeyRound, Trash2, LogOut, Shield } from "lucide-react";
import { Button } from "../UI/Button";
import { Input } from "../UI/Input";
import { Modal } from "../UI/Modal";
import { useAdmin } from "../../hooks/useAdmin";
import { formatDate } from "../../utils/formatters";

export const ProfileSettings = ({ isOpen, onClose, user, onLogout, onUpdatePassword, onDeleteAccount }) => {
 const { isAdmin } = useAdmin(user);
 const [activeTab, setActiveTab] = useState("profile");
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [deleteConfirm, setDeleteConfirm] = useState("");
 const [loading, setLoading] = useState(false);

 const handleChangePassword = async (e) => {
 e.preventDefault();
 if (newPassword !== confirmPassword) return;
 setLoading(true);
 await onUpdatePassword(newPassword);
 setLoading(false);
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 };

 const handleDelete = async () => {
 if (deleteConfirm !== "HAPUS") return;
 setLoading(true);
 await onDeleteAccount();
 setLoading(false);
 };

 const tabs = [
 { id: "profile", label: "Profil", icon: User },
 { id: "security", label: "Keamanan", icon: KeyRound },
 { id: "danger", label: "Zona Berbahaya", icon: Trash2 },
 ];

 return (
 <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan" size="lg">
 <div className="flex gap-6 min-h-[400px]">
 {/* Sidebar Tabs */}
 <div className="w-48 shrink-0 space-y-1">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`
 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
 ${activeTab === tab.id
 ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
 : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
 }
 `}
 >
 <tab.icon className="h-4 w-4" />
 {tab.label}
 </button>
 ))}
 <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
 <button
 onClick={onLogout}
 className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
 >
 <LogOut className="h-4 w-4" />
 Keluar
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1">
 {activeTab === "profile" && (
 <div className="space-y-5">
 <div className="flex items-center gap-4">
 <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
 {user?.email?.charAt(0).toUpperCase()}
 </div>
 <div>
 <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
 {user?.email}
 </h3>
 <div className="mt-1 flex items-center gap-2">
 {isAdmin && (
 <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
 <Shield className="h-3 w-3" />
 ADMIN
 </span>
 )}
 <span className="text-xs text-slate-500 dark:text-slate-400">
 Bergabung {formatDate(user?.created_at)}
 </span>
 </div>
 </div>
 </div>

 <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
 <div className="flex items-center gap-3 text-sm">
 <Mail className="h-4 w-4 text-slate-400" />
 <span className="text-slate-600 dark:text-slate-300">{user?.email}</span>
 </div>
 <div className="flex items-center gap-3 text-sm">
 <Calendar className="h-4 w-4 text-slate-400" />
 <span className="text-slate-600 dark:text-slate-300">
 ID: {user?.id?.slice(0, 8)}...
 </span>
 </div>
 </div>
 </div>
 )}

 {activeTab === "security" && (
 <form onSubmit={handleChangePassword} className="space-y-4">
 <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Ganti Password</h3>
 <Input
 label="Password Baru"
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="Minimal 8 karakter"
 required
 />
 <Input
 label="Konfirmasi Password Baru"
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="Ulangi password baru"
 error={confirmPassword && newPassword !== confirmPassword ? "Password tidak cocok" : ""}
 required
 />
 <Button type="submit" loading={loading} disabled={!newPassword || newPassword !== confirmPassword}>
 <KeyRound className="mr-1.5 h-4 w-4" />
 Perbarui Password
 </Button>
 </form>
 )}

 {activeTab === "danger" && (
 <div className="space-y-4">
 <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
 <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Hapus Akun</h3>
 <p className="mt-1 text-xs text-red-600 dark:text-red-400">
 Semua data vault Anda akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
 </p>
 </div>
 <Input
 label={`Ketik "HAPUS" untuk konfirmasi`}
 value={deleteConfirm}
 onChange={(e) => setDeleteConfirm(e.target.value)}
 placeholder="HAPUS"
 />
 <Button
 variant="danger"
 onClick={handleDelete}
 loading={loading}
 disabled={deleteConfirm !== "HAPUS"}
 className="w-full"
 >
 <Trash2 className="mr-1.5 h-4 w-4" />
 Hapus Akun Saya
 </Button>
 </div>
 )}
 </div>
 </div>
 </Modal>
 );
};
