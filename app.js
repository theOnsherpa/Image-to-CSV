const fileInput = document.getElementById("file");
const btn = document.getElementById("go");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const wInput = document.getElementById("w");
const hInput = document.getElementById("h");
const linkBtn = document.getElementById("link");

let isLinked = true;
let aspect = null; // height / width of the selected image
let suppressSync = false;
let lastEdited = "w"; // "w" or "h"  <-- this makes "last edited wins"

function setLinkUI() {
  linkBtn.setAttribute("aria-pressed", String(isLinked));
  linkBtn.textContent = isLinked ? "🔗" : "⛓️";
  linkBtn.title = isLinked ? "Aspect ratio locked" : "Aspect ratio unlocked";
}
setLinkUI();

function syncFromWidth() {
  if (suppressSync || !aspect) return;
  const w = Math.max(1, parseInt(wInput.value || "1", 10));
  suppressSync = true;
  hInput.value = String(Math.max(1, Math.round(w * aspect)));
  suppressSync = false;
}

function syncFromHeight() {
  if (suppressSync || !aspect) return;
  const h = Math.max(1, parseInt(hInput.value || "1", 10));
  suppressSync = true;
  wInput.value = String(Math.max(1, Math.round(h / aspect)));
  suppressSync = false;
}

function syncFromLastEdited() {
  if (!aspect) return;
  if (lastEdited === "h") syncFromHeight();
  else syncFromWidth();
}

linkBtn.addEventListener("click", () => {
  isLinked = !isLinked;
  setLinkUI();
  // When relocking, update the *other* field based on the last thing they edited
  if (isLinked && aspect) syncFromLastEdited();
});

wInput.addEventListener("input", () => {
  if (suppressSync) return;
  lastEdited = "w";
  if (isLinked && aspect) syncFromWidth();
});

hInput.addEventListener("input", () => {
  if (suppressSync) return;
  lastEdited = "h";
  if (isLinked && aspect) syncFromHeight();
});

fileInput.addEventListener("change", async () => {
  btn.disa
