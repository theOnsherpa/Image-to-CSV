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

function setLinkUI() {
  linkBtn.setAttribute("aria-pressed", String(isLinked));
  linkBtn.textContent = isLinked ? "🔗" : "⛓️";
  linkBtn.title = isLinked ? "Aspect ratio locked" : "Aspect ratio unlocked";
}

setLinkUI();

linkBtn.addEventListener("click", () => {
  isLinked = !isLinked;
  setLinkUI();
  // If we already know the image aspect, snap H to match current W when relocking
  if (isLinked && aspect) syncFromWidth();
});

wInput.addEventListener("input", () => {
  if (isLinked && aspect) syncFromWidth();
});

hInput.addEventListener("input", () => {
  if (isLinked && aspect) syncFromHeight();
});

function syncFromWidth() {
  if (suppressSync) return;
  const w = Math.max(1, parseInt(wInput.value || "1", 10));
  suppressSync = true;
  hInput.value = String(Math.max(1, Math.round(w * aspect)));
  suppressSync = false;
}

function syncFromHeight() {
  if (suppressSync) return;
  const h = Math.max(1, parseInt(hInput.value || "1", 10));
  suppressSync = true;
  wInput.value = String(Math.max(1, Math.round(h / aspect)));
  suppressSync = false;
}

fileInput.addEventListener("change", async () => {
  btn.disabled = !fileInput.files?.length;
  aspect = null;

  const file = fileInput.files?.[0];
  if (!file) return;

  // Load image now so we can lock aspect ratio immediately
  statusEl.textContent = "Reading image…";
  try {
    const img = await fileToImage(file);
    aspect = img.height / img.width;

    // If linked, update H from current W (like design apps)
    if (isLinked) syncFromWidth();

    statusEl.textContent = "Ready.";
  } catch (e) {
    statusEl.textContent = "Could not read that image file.";
    console.error(e);
  }
});

btn.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const mode = document.getElementById("mode").value;

  const targetW = Math.max(1, parseInt(wInput.value || "64", 10));
  const targetH = Math.max(1, parseInt(hInput.value || "64", 10));

  statusEl.textContent = "Loading image…";
  const img = await fileToImage(file);

  // If aspect isn't set yet (edge case), set it now
  if (!aspect) aspect = img.height / img.width;

  // If linked, enforce current ratio based on width (predictable)
  let outW = targetW;
  let outH = targetH;
  if (isLinked && aspect) {
    outH = Math.max(1, Math.round(outW * aspect));
    suppressSync = true;
    hInput.value = String(outH);
    suppressSync = false;
  }

  canvas.width = outW;
  canvas.height = outH;

  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(img, 0, 0, outW, outH);

  statusEl.textContent = `Converting… (${outW}×${outH})`;

  const imageData = ctx.getImageData(0, 0, outW, outH);
  const csv = imageDataToCsv(imageData, mode);

  const outName =
    (file.name.replace(/\.[^.]+$/, "") || "image") +
    `_${mode}_${outW}x${outH}.csv`;

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

function imageDataToCsv(imageData, mode) {
  const { data, width, height } = imageData;

  const lines = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];

      if (mode === "rgb") {
        row.push(`"${r} ${g} ${b}"`);
      } else {
        const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        row.push(String(gray));
      }
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
