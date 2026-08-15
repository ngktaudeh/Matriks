export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isStrongPassword = (password) => {
  // Minimal 8 karakter, ada huruf besar, kecil, angka, simbol
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  return checks.filter(Boolean).length;
};

export const validateItem = (item) => {
  const errors = {};
  if (!item.title?.trim()) errors.title = "Judul wajib diisi";
  if (item.title?.length > 200) errors.title = "Judul maksimal 200 karakter";
  if (item.content?.length > 50000) errors.content = "Konten terlalu panjang";
  return errors;
};
