const fileInput = document.getElementById("file");
const btn = document.getElementById("go");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const wInput = document.getElementById("w");
const hInput = document.getElementById("h");
const linkBtn = document.getElementById("link");

let isLinked = true;
let aspect = null; // height / width of selected image
let suppressSync = false;
let lastEdited = "w"; // "w" or "h" (last edited wins)

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
  btn.disabled = !fileInput.files?.length;
  aspect = null;

  const file = fileInput.files?.[0];
  if (!file) return;

  statusEl.textContent = "Reading image…";
  try {
    const img = await fileToImage(file);
    aspect = img.height / img.width;

    if (isLinked) syncFromLastEdited();

    statusEl.textContent = "Ready.";
  } catch (e) {
    statusEl.textContent = "Could not read that image file.";
    console.error(e);
  }
});

btn.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  statusEl.textContent = "Loading image…";
  const img = await fileToImage(file);
  if (!aspect) aspect = img.height / img.width;

  let outW = Math.max(1, parseInt(wInput.value || "64", 10));
  let outH = Math.max(1, parseInt(hInput.value || "64", 10));

  // If linked, enforce ratio based on last edited field
  if (isLinked && aspect) {
    if (lastEdited === "h") {
      outW = Math.max(1, Math.round(outH / aspect));
      suppressSync = true;
      wInput.value = String(outW);
      suppressSync = false;
    } else {
      outH = Math.max(1, Math.round(outW * aspect));
      suppressSync = true;
      hInput.value = String(outH);
      suppressSync = false;
    }
  }

  canvas.width = outW;
  canvas.height = outH;

  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(img, 0, 0, outW, outH);

  statusEl.textContent = `Converting… (${outW}×${outH})`;

  const imageData = ctx.getImageData(0, 0, outW, outH);
  const csv = imageDataToGrayCsv(imageData);

  const outName =
    (file.name.replace(/\.[^.]+$/, "") || "image") + `_${outW}x${outH}.csv`;

  downloadText(csv, outName);
  statusEl.textContent = `Done. Downloaded: ${outName}`;
});

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function imageDataToGrayCsv(imageData) {
  const { data, width, height } = imageData;

  const lines = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];

      // grayscale 0–255 (luma-ish)
      const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      row.push(String(gray));
    }
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
