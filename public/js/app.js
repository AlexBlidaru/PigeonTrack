import { api } from "./api.js";
import { ICONS } from "./utils.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderPigeons } from "./views/pigeons.js";
import { renderEvents } from "./views/events.js";
import { renderPedigree } from "./views/pedigree.js";
import { renderReports } from "./views/reports.js";
import { renderSettings } from "./views/settings.js";

const ROUTES = [
  { hash: "#/", title: "Panou principal", icon: ICONS.dashboard, render: renderDashboard },
  { hash: "#/pigeons", title: "Porumbei", icon: ICONS.pigeon, render: renderPigeons },
  { hash: "#/events", title: "Concursuri", icon: ICONS.event, render: renderEvents },
  { hash: "#/pedigree", title: "Pedigree", icon: ICONS.tree, render: renderPedigree },
  { hash: "#/reports", title: "Rapoarte", icon: ICONS.report, render: renderReports },
  { hash: "#/settings", title: "Setari", icon: ICONS.settings, render: renderSettings },
];

const pageRoot = document.getElementById("page-root");
const sidebarNav = document.getElementById("sidebar-nav");
const bottomNavList = document.getElementById("bottom-nav-list");
const sidebarUser = document.getElementById("sidebar-user");
const topbarTitle = document.getElementById("topbar-title");

function matchRoute(hash) {
  const clean = hash.split("?")[0];
  return ROUTES.find((r) => r.hash === clean) || ROUTES.find((r) => clean.startsWith(r.hash) && r.hash !== "#/") || ROUTES[0];
}

function buildNav() {
  sidebarNav.innerHTML = ROUTES.map(
    (r) => `<li><a href="${r.hash}" class="nav-item" data-hash="${r.hash}">${r.icon}<span>${r.title}</span></a></li>`
  ).join("");
  bottomNavList.innerHTML = ROUTES.map(
    (r) => `<li><a href="${r.hash}" data-hash="${r.hash}">${r.icon}<span>${r.title.split(" ")[0]}</span></a></li>`
  ).join("");
}

function updateActiveNav(hash) {
  const clean = hash.split("?")[0];
  document.querySelectorAll("[data-hash]").forEach((el) => {
    el.classList.toggle("active", el.dataset.hash === clean || (clean.startsWith(el.dataset.hash) && el.dataset.hash !== "#/"));
  });
}

async function router() {
  const hash = window.location.hash || "#/";
  const route = matchRoute(hash);
  updateActiveNav(hash);
  topbarTitle.textContent = route.title;
  pageRoot.innerHTML = '<div class="loading-spinner"></div>';
  try {
    await route.render(pageRoot, hash);
  } catch (err) {
    console.error(err);
    pageRoot.innerHTML = `<div class="empty-state">${ICONS.info}<p>${err.message || "A aparut o eroare."}</p></div>`;
  }
}

function applyTheme(settings) {
  const root = document.documentElement;
  if (settings.theme_mode === "dark") root.setAttribute("data-theme", "dark");
  else if (settings.theme_mode === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");

  if (settings.primary_color) root.style.setProperty("--color-primary", settings.primary_color);
  if (settings.accent_color) root.style.setProperty("--color-accent", settings.accent_color);
  if (settings.font_size) document.body.style.fontSize = settings.font_size + "px";
}

async function init() {
  let status;
  try {
    status = await api.authStatus();
  } catch {
    window.location.href = "/login.html";
    return;
  }
  if (!status.authenticated) {
    window.location.href = "/login.html";
    return;
  }

  sidebarUser.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span>${status.username}</span>
      <button class="icon-btn" id="logout-btn" title="Iesire din cont">${ICONS.logout}</button>
    </div>`;
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await api.logout();
    window.location.href = "/login.html";
  });

  // Cached theme applies instantly; server settings (may differ across devices) refine it after load.
  try {
    const cached = JSON.parse(localStorage.getItem("pt_theme") || "{}");
    applyTheme(cached);
  } catch {
    /* ignore */
  }
  try {
    const settings = await api.getSettings();
    applyTheme(settings);
    localStorage.setItem("pt_theme", JSON.stringify(settings));
  } catch {
    /* offline or first run - keep defaults */
  }

  buildNav();
  window.addEventListener("hashchange", router);
  router();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

init();
