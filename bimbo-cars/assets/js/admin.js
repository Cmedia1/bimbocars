// Bimbo Location de Voitures — admin.js
// Vanilla ES6+. Reads the same localStorage key that reservation.html writes to.
//
// SECURITY NOTE: authentication here is a hardcoded client-side check only,
// intended as an MVP placeholder. Anyone can read the credentials from this
// file's source or bypass the check entirely from the browser console. Do
// not use this as real access control — replace with a proper backend and
// server-side authentication before handling genuine customer data.

const RESERVATIONS_KEY = "bimbo_reservations";
const FLEET_STATUS_KEY = "bimbo_fleet_status";
const AUTH_KEY = "bimbo_admin_session";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "bimbo2026";

const FLEET = [
  { name: "Dacia Sandero", categorie: "Économique" },
  { name: "Hyundai i10", categorie: "Économique" },
  { name: "Renault Clio", categorie: "Économique" },
  { name: "Hyundai Accent", categorie: "Berline" },
  { name: "Toyota Corolla", categorie: "Berline" },
  { name: "Skoda Octavia", categorie: "Berline" },
  { name: "Dacia Duster", categorie: "SUV" },
  { name: "Hyundai Tucson", categorie: "SUV" },
  { name: "Toyota RAV4", categorie: "SUV" },
  { name: "Mercedes Classe C", categorie: "Luxe" },
  { name: "BMW Série 3", categorie: "Luxe" },
  { name: "Range Rover Evoque", categorie: "Luxe" },
];

/* ---------------------------------------------------------------------- */
/* Storage helpers                                                        */
/* ---------------------------------------------------------------------- */
function getReservations() {
  return JSON.parse(localStorage.getItem(RESERVATIONS_KEY) || "[]");
}
function saveReservations(list) {
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(list));
}
function getFleetStatus() {
  return JSON.parse(localStorage.getItem(FLEET_STATUS_KEY) || "{}");
}
function saveFleetStatus(status) {
  localStorage.setItem(FLEET_STATUS_KEY, JSON.stringify(status));
}

/* ---------------------------------------------------------------------- */
/* Auth                                                                    */
/* ---------------------------------------------------------------------- */
function initAuth() {
  const loginScreen = document.querySelector(".admin-login");
  const app = document.querySelector(".admin-app");
  const form = document.querySelector("#admin-login-form");
  const errorEl = document.querySelector(".admin-login__error");
  const logoutBtn = document.querySelector(".admin-logout");

  const showApp = () => {
    loginScreen.style.display = "none";
    app.classList.add("is-active");
    renderAll();
  };

  if (sessionStorage.getItem(AUTH_KEY) === "true") {
    showApp();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = form.querySelector("#admin-username").value.trim();
    const password = form.querySelector("#admin-password").value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "true");
      errorEl.classList.remove("is-visible");
      showApp();
    } else {
      errorEl.textContent = "Identifiants incorrects.";
      errorEl.classList.add("is-visible");
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    app.classList.remove("is-active");
    loginScreen.style.display = "grid";
    form.reset();
  });
}

/* ---------------------------------------------------------------------- */
/* Navigation between views                                                */
/* ---------------------------------------------------------------------- */
function initNav() {
  const buttons = document.querySelectorAll(".admin-nav button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      document.querySelectorAll(".admin-view").forEach((v) => v.classList.remove("is-active"));
      document.querySelector(`#view-${btn.dataset.view}`).classList.add("is-active");

      document.querySelector("#topbar-title").textContent = btn.textContent;
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Dashboard stats + chart                                                 */
/* ---------------------------------------------------------------------- */
function renderStats() {
  const reservations = getReservations();
  const pending = reservations.filter((r) => r.statut === "en attente").length;

  const counts = {};
  reservations.forEach((r) => {
    counts[r.vehicule] = (counts[r.vehicule] || 0) + 1;
  });
  let topVehicle = "—";
  let topCount = 0;
  Object.entries(counts).forEach(([name, count]) => {
    if (count > topCount) {
      topCount = count;
      topVehicle = name;
    }
  });

  document.querySelector("#stat-total").textContent = reservations.length;
  document.querySelector("#stat-pending").textContent = pending;
  document.querySelector("#stat-top-vehicle").textContent = topVehicle;

  renderChart(reservations);
}

function renderChart(reservations) {
  const svg = document.querySelector(".bar-chart");
  if (!svg) return;

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const dayLabel = (d) => d.toLocaleDateString("fr-FR", { weekday: "short" });
  const sameDay = (a, b) => a.toDateString() === new Date(b).toDateString();

  const counts = days.map((d) => reservations.filter((r) => r.creeLe && sameDay(d, r.creeLe)).length);
  const max = Math.max(1, ...counts);

  const width = 560;
  const height = 190;
  const barWidth = width / days.length - 16;
  const chartHeight = 140;

  let bars = "";
  counts.forEach((count, i) => {
    const barHeight = (count / max) * chartHeight;
    const x = i * (width / days.length) + 8;
    const y = chartHeight - barHeight + 10;
    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barHeight, 2)}" rx="3"></rect>`;
    bars += `<text x="${x + barWidth / 2}" y="${chartHeight + 28}" text-anchor="middle">${dayLabel(days[i])}</text>`;
    bars += `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle">${count}</text>`;
  });

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = bars;
}

/* ---------------------------------------------------------------------- */
/* Reservations table                                                     */
/* ---------------------------------------------------------------------- */
function renderTable() {
  const tbody = document.querySelector("#reservations-body");
  const empty = document.querySelector("#reservations-empty");
  const reservations = getReservations().slice().reverse();

  if (!reservations.length) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  tbody.innerHTML = reservations
    .map((r) => {
      const badgeClass = r.statut === "confirmée" ? "badge--confirmed" : r.statut === "annulée" ? "badge--cancelled" : "badge--pending";
      return `
        <tr>
          <td>${r.reference}</td>
          <td>${r.nom}</td>
          <td>${r.telephone}</td>
          <td>${r.vehicule}</td>
          <td>${r.dateDepart} → ${r.dateRetour}</td>
          <td><span class="badge ${badgeClass}">${r.statut}</span></td>
          <td>
            <div class="row-actions">
              <select data-reference="${r.reference}" aria-label="Changer le statut de la réservation ${r.reference}">
                <option value="en attente" ${r.statut === "en attente" ? "selected" : ""}>En attente</option>
                <option value="confirmée" ${r.statut === "confirmée" ? "selected" : ""}>Confirmée</option>
                <option value="annulée" ${r.statut === "annulée" ? "selected" : ""}>Annulée</option>
              </select>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  tbody.querySelectorAll("select[data-reference]").forEach((select) => {
    select.addEventListener("change", () => {
      const reservations = getReservations();
      const target = reservations.find((r) => r.reference === select.dataset.reference);
      if (target) {
        target.statut = select.value;
        saveReservations(reservations);
        renderStats();
        renderTable();
      }
    });
  });
}

function initCsvExport() {
  const btn = document.querySelector("#export-csv");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const reservations = getReservations();
    if (!reservations.length) return;

    const headers = ["Référence", "Nom", "Téléphone", "E-mail", "Véhicule", "Lieu", "Départ", "Retour", "Statut"];
    const rows = reservations.map((r) => [
      r.reference, r.nom, r.telephone, r.email, r.vehicule, r.lieu, r.dateDepart, r.dateRetour, r.statut,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bimbo-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

/* ---------------------------------------------------------------------- */
/* Fleet management                                                       */
/* ---------------------------------------------------------------------- */
function renderFleet() {
  const grid = document.querySelector("#fleet-admin-grid");
  if (!grid) return;

  const status = getFleetStatus();

  grid.innerHTML = FLEET.map((vehicle) => {
    const state = status[vehicle.name] || "disponible";
    return `
      <div class="fleet-admin-card">
        <div>
          <p class="fleet-admin-card__name">${vehicle.name}</p>
          <p class="fleet-admin-card__cat">${vehicle.categorie}</p>
        </div>
        <button class="status-toggle" data-vehicle="${vehicle.name}" data-status="${state === "disponible" ? "disponible" : "loue"}">
          ${state === "disponible" ? "Disponible" : "Loué"}
        </button>
      </div>`;
  }).join("");

  grid.querySelectorAll(".status-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = getFleetStatus();
      const current = status[btn.dataset.vehicle] || "disponible";
      const next = current === "disponible" ? "loue" : "disponible";
      status[btn.dataset.vehicle] = next;
      saveFleetStatus(status);
      renderFleet();
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */
function renderAll() {
  renderStats();
  renderTable();
  renderFleet();
}

function boot() {
  initAuth();
  initNav();
  initCsvExport();
}

document.addEventListener("DOMContentLoaded", boot);
