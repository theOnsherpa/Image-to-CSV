const fileInput = document.getElementById("file");
const btn = document.getElementById("go");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

fileInput.addEventListener("change", () => {
  btn.disabled = !fileInput.files?.length;
});

btn.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const targetW = Math.max(1, parseInt(document.getElementById("w").value || "64", 10));
  const mode = document.getElementById("mode").value;

  statusEl.textContent = "Loading image…";

  const img = await fileToImage(file);

  // Keep aspect ratio
  const scale = targetW / img.width;
  const targetH = Math.max(1, Math.round(img.height * scale));

  canvas.width = targetW;
  canvas.height = targetH;

  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  statusEl.textContent = `Converting… (${targetW}×${targetH})`;

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const csv = imageDataToCsv(imageData, mode);

  const outName = (file.name.replace(/\.[^.]+$/, "") || "image") + `_${mode}_${targetW}w.csv`;
  downloadText(csv, outName);

  statusEl.textContent = `Done. Downloaded: ${outName}`;
});

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function imageDataToCsv(imageData, mode) {
  const { data, width, height } = imageData;

  // CSV rows correspond to image rows
  const lines = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];
      // alpha = data[i + 3];

      if (mode === "rgb") {
        // put "r g b" in one cell (easy to parse)
        row.push(`"${r} ${g} ${b}"`);
      } else {
        // grayscale value 0-255 (luma-ish)
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
