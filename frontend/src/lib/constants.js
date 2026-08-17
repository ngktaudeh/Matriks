export const APP_NAME = "Line Togel";
export const APP_TAGLINE = "VIP Dashboard";

export const DEFAULT_CATEGORIES = ["Passwords", "Notes", "API Keys", "Links", "Snippets"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "az", label: "A – Z" },
  { value: "favorites", label: "Favorit Dulu" },
  { value: "updated", label: "Terakhir Diubah" },
];

export const ITEM_TEMPLATES = {
  password: {
    label: "Password",
    icon: "Key",
    fields: [
      { key: "username", label: "Username / Email", type: "text" },
      { key: "password", label: "Password", type: "password" },
      { key: "url", label: "Website URL", type: "url" },
      { key: "totp", label: "2FA / TOTP Secret", type: "text" },
    ],
  },
  apikey: {
    label: "API Key",
    icon: "Code",
    fields: [
      { key: "key", label: "API Key", type: "password" },
      { key: "service", label: "Service Name", type: "text" },
      { key: "environment", label: "Environment", type: "select", options: ["Development", "Staging", "Production"] },
    ],
  },
  note: {
    label: "Catatan",
    icon: "FileText",
    fields: [
      { key: "content", label: "Isi Catatan", type: "textarea" },
    ],
  },
  link: {
    label: "Link",
    icon: "Link",
    fields: [
      { key: "url", label: "URL", type: "url" },
      { key: "title", label: "Judul", type: "text" },
      { key: "description", label: "Deskripsi", type: "textarea" },
    ],
  },
};

export const PASSWORD_STRENGTH = {
  0: { label: "Sangat Lemah", color: "bg-red-500" },
  1: { label: "Lemah", color: "bg-orange-500" },
  2: { label: "Sedang", color: "bg-yellow-500" },
  3: { label: "Kuat", color: "bg-lime-500" },
  4: { label: "Sangat Kuat", color: "bg-emerald-500" },
};
