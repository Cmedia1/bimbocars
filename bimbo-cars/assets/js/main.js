// Bimbo Location de Voitures — main.js
// Vanilla ES6+, no dependencies. Split into small independent modules that
// each check for their own markup before running.

const STORAGE_KEY = "bimbo_reservations";
const CONTACT_KEY = "bimbo_contact_messages";

/* ---------------------------------------------------------------------- */
/* Page loader                                                             */
/* ---------------------------------------------------------------------- */
function initLoader() {
  const loader = document.querySelector(".page-loader");
  if (!loader) return;
  const hide = () => loader.classList.add("is-hidden");
  window.addEventListener("load", () => setTimeout(hide, 250));
  // Fallback in case 'load' already fired or is slow.
  setTimeout(hide, 1500);
}

/* ---------------------------------------------------------------------- */
/* Navigation (mobile toggle)                                             */
/* ---------------------------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const panel = document.querySelector(".mobile-nav");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    panel.classList.toggle("is-open", !expanded);
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      panel.classList.remove("is-open");
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Scroll reveal                                                          */
/* ---------------------------------------------------------------------- */
function initReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---------------------------------------------------------------------- */
/* Fleet filter (flotte.html)                                             */
/* ---------------------------------------------------------------------- */
function initFleetFilter() {
  const bar = document.querySelector(".filter-bar");
  const grid = document.querySelector("[data-fleet-grid]");
  if (!bar || !grid) return;

  const cards = Array.from(grid.querySelectorAll("[data-category]"));
  const empty = document.querySelector(".fleet-empty");

  const applyFilter = (category) => {
    let visibleCount = 0;
    cards.forEach((card) => {
      const match = category === "all" || card.dataset.category === category;
      card.style.display = match ? "" : "none";
      if (match) visibleCount += 1;
    });
    if (empty) empty.classList.toggle("is-visible", visibleCount === 0);
  };

  bar.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter-btn");
    if (!btn) return;

    bar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    applyFilter(btn.dataset.filter);
  });

  // Allow deep-linking from other pages, e.g. flotte.html?cat=suv
  const requested = new URLSearchParams(window.location.search).get("cat");
  const requestedBtn = requested && bar.querySelector(`[data-filter="${requested}"]`);
  if (requestedBtn) {
    bar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
    requestedBtn.classList.add("is-active");
    applyFilter(requested);
  }
}

/* ---------------------------------------------------------------------- */
/* Shared form helpers                                                     */
/* ---------------------------------------------------------------------- */
function setFieldError(group, message) {
  const errorEl = group.querySelector(".form-error");
  if (errorEl) errorEl.textContent = message || errorEl.dataset.default || "";
  group.classList.toggle("has-error", Boolean(message));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  // Accepts Algerian mobile/landline formats written with spaces, dots or dashes.
  const digits = value.replace(/[\s.-]/g, "");
  return /^(0|\+213)[5-9]\d{8}$/.test(digits);
}

function generateReference(prefix) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `${prefix}-${stamp}`;
}

/* ---------------------------------------------------------------------- */
/* Reservation form (reservation.html)                                    */
/* ---------------------------------------------------------------------- */
function initReservationForm() {
  const form = document.querySelector("#reservation-form");
  if (!form) return;

  const confirmation = document.querySelector(".confirmation");
  const refEl = confirmation ? confirmation.querySelector(".ref") : null;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let valid = true;

    const fields = {
      nom: form.querySelector("#nom"),
      telephone: form.querySelector("#telephone"),
      email: form.querySelector("#email"),
      depart: form.querySelector("#date-depart"),
      retour: form.querySelector("#date-retour"),
      vehicule: form.querySelector("#vehicule"),
      lieu: form.querySelector("#lieu"),
    };

    Object.values(fields).forEach((field) => {
      if (!field) return;
      const group = field.closest(".form-group");
      if (!field.value.trim()) {
        setFieldError(group, "Ce champ est obligatoire.");
        valid = false;
      } else {
        setFieldError(group, "");
      }
    });

    if (fields.telephone.value.trim() && !isValidPhone(fields.telephone.value)) {
      setFieldError(fields.telephone.closest(".form-group"), "Format de téléphone invalide (ex. 0555 12 34 56).");
      valid = false;
    }

    if (fields.email.value.trim() && !isValidEmail(fields.email.value)) {
      setFieldError(fields.email.closest(".form-group"), "Adresse e-mail invalide.");
      valid = false;
    }

    if (fields.depart.value && fields.retour.value) {
      const depart = new Date(fields.depart.value);
      const retour = new Date(fields.retour.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (depart < today) {
        setFieldError(fields.depart.closest(".form-group"), "La date de départ ne peut pas être dans le passé.");
        valid = false;
      }
      if (retour <= depart) {
        setFieldError(fields.retour.closest(".form-group"), "La date de retour doit suivre la date de départ.");
        valid = false;
      }
    }

    if (!valid) return;

    const reference = generateReference("BC");
    const reservation = {
      reference,
      nom: fields.nom.value.trim(),
      telephone: fields.telephone.value.trim(),
      email: fields.email.value.trim(),
      dateDepart: fields.depart.value,
      dateRetour: fields.retour.value,
      vehicule: fields.vehicule.options[fields.vehicule.selectedIndex].text,
      lieu: fields.lieu.options[fields.lieu.selectedIndex].text,
      creeLe: new Date().toISOString(),
      statut: "en attente",
    };

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.push(reservation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    form.hidden = true;
    if (confirmation) {
      if (refEl) refEl.textContent = reference;
      confirmation.classList.add("is-visible");
      confirmation.setAttribute("tabindex", "-1");
      confirmation.focus();
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Contact form (contact.html)                                            */
/* ---------------------------------------------------------------------- */
function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const confirmation = document.querySelector(".confirmation");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let valid = true;

    const fields = {
      nom: form.querySelector("#contact-nom"),
      email: form.querySelector("#contact-email"),
      message: form.querySelector("#contact-message"),
    };

    Object.values(fields).forEach((field) => {
      if (!field) return;
      const group = field.closest(".form-group");
      if (!field.value.trim()) {
        setFieldError(group, "Ce champ est obligatoire.");
        valid = false;
      } else {
        setFieldError(group, "");
      }
    });

    if (fields.email.value.trim() && !isValidEmail(fields.email.value)) {
      setFieldError(fields.email.closest(".form-group"), "Adresse e-mail invalide.");
      valid = false;
    }

    if (!valid) return;

    const message = {
      nom: fields.nom.value.trim(),
      email: fields.email.value.trim(),
      message: fields.message.value.trim(),
      creeLe: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem(CONTACT_KEY) || "[]");
    existing.push(message);
    localStorage.setItem(CONTACT_KEY, JSON.stringify(existing));

    form.hidden = true;
    if (confirmation) {
      confirmation.classList.add("is-visible");
      confirmation.setAttribute("tabindex", "-1");
      confirmation.focus();
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */
function boot() {
  initLoader();
  initNav();
  initReveal();
  initFleetFilter();
  initReservationForm();
  initContactForm();
}

document.addEventListener("DOMContentLoaded", boot);
