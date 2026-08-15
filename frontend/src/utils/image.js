// Utilitas gambar: resize + re-encode client-side sebelum upload.
// Dipakai oleh useItems (uploadImage) untuk mengecilkan ukuran sebelum ke storage.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1600;
const IMAGE_QUALITY = 0.8;

export const compressImage = (file) =>
  new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, MAX_IMAGE_WIDTH / Math.max(w, h));
        if (scale >= 1 && file.size <= MAX_IMAGE_BYTES) {
          URL.revokeObjectURL(url);
          return resolve(file);
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isSmallPng = file.type === "image/png" && file.size < 500 * 1024;
        const mime = isSmallPng ? "image/png" : "image/jpeg";
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(file);
            const ext = mime === "image/png" ? "png" : "jpg";
            const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
            resolve(new File([blob], name, { type: mime }));
          },
          mime,
          IMAGE_QUALITY
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
