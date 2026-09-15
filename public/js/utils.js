export function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtMoney(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (isNaN(n)) return "-";
  return `${n.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} RON`;
}

export function fmtNumber(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (isNaN(n)) return "-";
  return n.toLocaleString("ro-RO", { maximumFractionDigits: digits });
}

export function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const EVENT_CATEGORIES = [
  { value: "viteza", label: "Viteza" },
  { value: "semifond", label: "Semifond" },
  { value: "fond", label: "Fond" },
  { value: "maraton", label: "Maraton / Mare fond" },
  { value: "antrenament", label: "Antrenament" },
  { value: "altul", label: "Altul" },
];

export const PIGEON_STATUSES = [
  { value: "activ", label: "Activ" },
  { value: "reproducator", label: "Reproducator" },
  { value: "vandut", label: "Vandut" },
  { value: "pierdut", label: "Pierdut" },
  { value: "decedat", label: "Decedat" },
];

let toastWrap;
export function toast(message, type = "") {
  if (!toastWrap) {
    toastWrap = document.createElement("div");
    toastWrap.className = "toast-wrap";
    document.body.appendChild(toastWrap);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastWrap.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

export function confirmDialog(message) {
  return window.confirm(message);
}

// Renders a modal with the given inner HTML; returns the overlay element so
// callers can wire up their own submit/cancel handlers and call close().
export function openModal({ title, bodyHtml, footerHtml }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close-modal aria-label="Inchide">${ICONS.close}</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest("[data-close-modal]")) close();
  });
  overlay.close = close;
  return overlay;
}

// Compresses/resizes an image file client-side before upload so we never
// ship huge photos to Cloudflare (keeps well under the 7MB server cap).
export function compressImage(file, { maxDimension = 1600, quality = 0.82, maxBytes = 6.5 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nu am putut citi fisierul"));
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        const tryEncode = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Nu am putut procesa imaginea"));
              if (blob.size > maxBytes && q > 0.35) {
                q -= 0.12;
                tryEncode();
              } else {
                resolve(new File([blob], (file.name || "poza").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
              }
            },
            "image/jpeg",
            q
          );
        };
        tryEncode();
      };
      img.onerror = () => reject(new Error("Fisierul nu este o imagine valida"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const ICONS = {
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  pigeon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14c2-6 7-9 12-8 3 .6 5 3 5 5-2-1-4-1-5 .5 2 .5 3 2 3 4-2-1-3-.5-4 .5-3 3-8 3-11-2"/><circle cx="9" cy="9" r=".6" fill="currentColor" stroke="none"/></svg>`,
  event: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m8 15 2.5 2.5L16 12"/></svg>`,
  tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="12" r="2.2"/><circle cx="6" cy="20" r="2.2"/><circle cx="18" cy="20" r="2.2"/><path d="M12 6.2V9M9 11l-2 -0M15 11l2-0M6 14.2V18M18 14.2V18"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M9 13h6M9 17h6M9 9h2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.31.44 1.4 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`,
  medal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="15" r="6"/><path d="m9 10-3-7M15 10l3-7M9 3h6"/></svg>`,
};
