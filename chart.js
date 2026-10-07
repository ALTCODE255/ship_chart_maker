// ─────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────

const circle = document.getElementById("circle");
const charCount = document.getElementById("char-ct");
const charSel = document.getElementById("char-sel");
const legend = document.getElementById("legend");
const legendInput = document.getElementById("legend-input");
const strokeInput = document.getElementById("stroke-width");
const iconSrcInput = document.getElementById("image-srcs");
const currentColor = document.getElementById("current-color");
const chartForm = document.getElementById("chart-form");
const avatarSel = document.getElementById("avatar-sel");
const svg = document.getElementById("ship-lines");

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

const DEFAULTS = {
  strokeColor: "#FF0000",
  strokeWidth: 2,
  image: "./unknown.png",
  characterCount: 10,
};

const state = {
  strokeColor: DEFAULTS.strokeColor,
  strokeWidth: Number(strokeInput.value) || DEFAULTS.strokeWidth,
  selectedChar: null,
  ships: [],
  images: [],
  legend: [],
};

// ─────────────────────────────────────────────
// Character Selection and Ship Lines
// ─────────────────────────────────────────────

// Count SVG paths between same two characters
function countLines(char1, char2) {
  return state.ships.filter(
    (ship) => ship.char1 === char1 && ship.char2 === char2,
  ).length;
}

// Check if ship already exists
function hasShip(char1, char2, color) {
  return state.ships.some(
    (ship) =>
      ship.char1 === char1 && ship.char2 === char2 && ship.color === color,
  );
}

// Select a character to attach path to
function selectChar(index) {
  const char = state.images[index].img;

  // First character
  if (state.selectedChar === null) {
    state.selectedChar = index;
    char.style.setProperty("--color", state.strokeColor);
    char.classList.add("selected");
    return;
  }

  // Clicking the same character deselects it
  if (state.selectedChar === index) {
    char.classList.remove("selected");
    state.selectedChar = null;
    return;
  }

  // Second character -> create ship line

  // Make sure order doesn't matter
  const char1 = Math.min(state.selectedChar, index);
  const char2 = Math.max(state.selectedChar, index);

  if (!hasShip(char1, char2, state.strokeColor)) {
    const path_offset = countLines(char1, char2);
    state.ships.push({
      char1,
      char2,
      color: state.strokeColor,
      offset: path_offset,
    });

    drawShipLine(char1, char2, state.strokeColor, path_offset);
  }

  // Remove selection
  state.images[state.selectedChar].img.classList.remove("selected");
  state.selectedChar = null;
}

// Get center coordinates of bounding rectangle
function getCenter(rect) {
  const parent = circle.getBoundingClientRect();
  return [
    rect.left + rect.width / 2 - parent.left,
    rect.top + rect.height / 2 - parent.top,
  ];
}

// Draw a line between two given characters
function drawShipLine(char1, char2, color, path_offset) {
  const icon1 = state.images[char1].img;
  const icon2 = state.images[char2].img;

  if (!icon1 || !icon2) return;

  // Parent rectangle center
  const parent = circle.getBoundingClientRect();
  const [rx, ry] = [parent.width / 2, parent.height / 2];

  // Get center (x, y) positions of both icons
  const [x1, y1] = getCenter(icon1.getBoundingClientRect());
  const [x2, y2] = getCenter(icon2.getBoundingClientRect());

  // Midpoint
  const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];

  // Euclidean distances
  const [dx, dy] = [x2 - x1, y2 - y1];

  // Curvature inversely proportional to line length
  const length = Math.hypot(dx, dy);
  const offset = Math.min(7500 / length, 150);

  // Angle of vector that points from midpoint to center of circle
  const theta = Math.atan2(ry - my, rx - mx);

  // Control point
  const cx = mx + offset * Math.cos(theta);
  const cy = my + offset * Math.sin(theta);

  // Translation offset (to avoid stacking paths)
  const tx = path_offset * state.strokeWidth * Math.cos(theta);
  const ty = path_offset * state.strokeWidth * Math.sin(theta);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", state.strokeWidth);
  path.setAttribute("transform", `translate(${tx}, ${ty})`);

  path.addEventListener("click", () => {
    path.remove();
    const index = state.ships.findIndex(
      (ship) =>
        ship.char1 === char1 && ship.char2 === char2 && ship.color === color,
    );

    if (index != -1) state.ships.splice(index, 1);
  });

  svg.appendChild(path);
}

// Redraw ship lines after a layout change
function redrawLines() {
  svg.replaceChildren();
  // Filter out invalid ships
  state.ships = state.ships.filter(({ char1, char2, color, offset }) => {
    if (state.images[char1] && state.images[char2]) {
      drawShipLine(char1, char2, color, offset);
      return true;
    }
    return false;
  });
}

// Update stroke width on input
strokeInput.addEventListener("input", () => {
  const value = Number(strokeInput.value);
  if (value <= 0) return;
  state.strokeWidth = value;
});

// Clear drawn ship lines
function clearAllLines() {
  svg.replaceChildren();
  state.ships = [];
  if (state.selectedChar !== null) {
    state.images[state.selectedChar].img.classList.remove("selected");
    state.selectedChar = null;
  }
}

// ─────────────────────────────────────────────
// Icons + Image Handling
// ─────────────────────────────────────────────

// Update number of images in circle based on user input
function updateCharCount(value) {
  const count = (charSel.max = Math.min(value, charCount.max));

  // Add icons until desired count is reached
  while (state.images.length < count) {
    const idx = state.images.length;
    const img = createIcon(idx);
    const input = createIconSourceInput(idx);
    state.images.push({ src: DEFAULTS.image, img, input });
  }

  // Remove icons until desired count is reached
  while (state.images.length > count) {
    const removed = state.images.pop();
    // Revoke blob
    if (removed.src.startsWith("blob:")) URL.revokeObjectURL(removed.src);

    // Revoke tooltip
    const tooltip = bootstrap.Tooltip.getInstance(removed.img);
    tooltip?.dispose();

    circle.removeChild(removed.img);
    iconSrcInput.removeChild(removed.input.parentElement);
  }

  // Remove selection if above count
  if (state.selectedChar !== null && state.selectedChar >= count) {
    state.selectedChar = null;
  }

  // Fix positions of icons on circle
  for (let i = 0; i < state.images.length; i++) {
    const img = state.images[i].img;
    const angle = (360 / count) * i;
    img.style.setProperty("--total-num", count);
    img.style.setProperty("--angle", `${angle}deg`);
  }

  // Redraw ship lines
  redrawLines();
}

function createIcon(i) {
  // Create image for icon
  const icon = document.createElement("img");
  icon.src = DEFAULTS.image;
  icon.className = "icon";

  // Select on click
  icon.addEventListener("click", () => selectChar(i));

  // Enable tooltip
  icon.setAttribute("data-bs-toggle", "tooltip");
  icon.setAttribute("data-bs-title", i + 1);
  new bootstrap.Tooltip(icon);

  circle.appendChild(icon);
  return icon;
}

// Create input row for images
function createIconSourceInput(i) {
  const row = document.createElement("div");
  row.className = "input_row";

  // insert label before input
  const label = document.createTextNode(`${i + 1}: `);
  row.appendChild(label);

  // Create image source input
  const input = document.createElement("input");
  input.style.width = "min(calc(75%), 30em)";
  input.className = "icon_src";
  input.type = "text";
  input.value = DEFAULTS.image;
  input.addEventListener("change", () => setImageSrc(i, input.value));
  row.appendChild(input);

  // Create arrows for rearranging
  const upButton = document.createElement("button");
  upButton.textContent = " ↑ ";
  upButton.title = "Move up";
  upButton.addEventListener("click", () => moveImagePos(i, -1));

  const downButton = document.createElement("button");
  downButton.textContent = " ↓ ";
  downButton.title = "Move down";
  downButton.addEventListener("click", () => moveImagePos(i, 1));

  row.appendChild(upButton);
  row.appendChild(downButton);

  const linebreak = document.createElement("br");
  row.appendChild(linebreak);
  iconSrcInput.appendChild(row);

  return input;
}

// Shift position of image
function moveImagePos(idx, dir) {
  const newIdx = idx + dir;

  if (newIdx < 0 || newIdx >= state.images.length) {
    return;
  }

  const img1 = state.images[idx];
  const img2 = state.images[newIdx];

  [img1.src, img2.src] = [img2.src, img1.src];
  [img1.img.src, img2.img.src] = [img2.img.src, img1.img.src];
  [img1.input.value, img2.input.value] = [img2.input.value, img1.input.value];

  state.ships.forEach((ship) => {
    if (ship.char1 === idx) ship.char1 = newIdx;
    else if (ship.char1 === newIdx) ship.char1 = idx;

    if (ship.char2 === idx) ship.char2 = newIdx;
    else if (ship.char2 === newIdx) ship.char2 = idx;

    if (ship.char1 > ship.char2) {
      [ship.char1, ship.char2] = [ship.char2, ship.char1];
    }
  });
  redrawLines();
}

// Clear character images
function clearImages() {
  for (let i = 0; i < state.images.length; i++) {
    setImageSrc(i, DEFAULTS.image);
  }
}

function setImageSrc(idx, value) {
  const image = state.images[idx];
  const oldValue = image.src;

  if (oldValue === value) return;

  if (oldValue.startsWith("blob:")) {
    URL.revokeObjectURL(oldValue);
  }

  image.src = image.img.src = image.input.value = value;
}

// Upload images
chartForm.addEventListener("submit", (e) => {
  e.preventDefault();
  Array.from(avatarSel.files).forEach((file, i) => {
    const idx = charSel.value - 1 + i;
    if (idx >= charSel.max) return;

    // Create a temporary URL for the uploaded file
    const imageSrc = URL.createObjectURL(file);
    setImageSrc(idx, imageSrc);
  });
});

// Export screenshot
async function exportChart() {
  const canvas = await html2canvas(document.getElementById("ship-chart"));
  const link = document.createElement("a");
  link.download = "ship-chart.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ─────────────────────────────────────────────
// Legend Handling + Color Selection
// ─────────────────────────────────────────────

function deleteLegend() {
  state.legend = [];
  legendInput.replaceChildren();
  legend.replaceChildren();
}
// Create default legend. Run only once in beginning
function createLegend() {
  deleteLegend();
  addLegendEntry("#FF0000", "Favorite");
  addLegendEntry("#EBA72A", "Really Like");
  addLegendEntry("#F2DD1F", "Like");
  addLegendEntry("#38EB38", "OK");
  addLegendEntry("#4393EE", "No Strong Feelings");
  addLegendEntry("#343435", "Dislike");
}

// Update legend for a specific entry
function updateLegend(idx) {
  const entry = state.legend[idx];
  entry.color = entry.input.querySelector("input[type='color']").value;
  entry.label = entry.input.querySelector("input[type='text']").value;

  const swatch = entry.display.querySelector(".swatch");

  swatch.style.setProperty("--color", entry.color);
  swatch.nextSibling.textContent = ` ${entry.label}`;
}

// Update global stroke color
function updateColor(color) {
  state.strokeColor = color;
  currentColor.style.setProperty("--color", color);

  if (state.selectedChar !== null) {
    state.images[state.selectedChar]?.img.style.setProperty("--color", color);
  }
}

function addLegendEntry(color = "#ffffff", label = "Label") {
  const idx = legendInput.children.length;

  // Create legend input entry
  const entry = document.createElement("div");
  entry.className = "legend-entry my-1 d-flex";
  entry.addEventListener("change", () => updateLegend(idx));

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = color;

  const labelInput = document.createElement("input");
  labelInput.style.width = "min(calc(90%), 30em)";
  labelInput.type = "text";
  labelInput.placeholder = "Label";
  labelInput.value = label;

  entry.append(colorInput, labelInput);
  legendInput.appendChild(entry);

  // Create legend display item
  const item = document.createElement("div");
  item.className = "legend-item";

  const button = document.createElement("button");
  button.className = "swatch";
  button.type = "button";
  button.style.setProperty("--color", color);
  button.addEventListener("click", () =>
    updateColor(button.style.getPropertyValue("--color")),
  );

  const labelText = document.createTextNode(" " + label);
  item.append(button, labelText);
  legend.appendChild(item);

  state.legend.push({ color, label, input: entry, display: item });
}

function removeLastLegendEntry() {
  const removed = state.legend.pop();
  if (removed) {
    legendInput.removeChild(removed.input);
    legend.removeChild(removed.display);
  }
}

// ─────────────────────────────────────────────
// Export and Import Config
// ─────────────────────────────────────────────

async function createShare(base64Data) {
  const response = await fetch("https://kv-storage.anonte3p5usu.workers.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      value: base64Data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const result = await response.json();
  return result.url_hash;
}

async function getShare(hash) {
  const response = await fetch(
    `https://kv-storage.anonte3p5usu.workers.dev/${hash}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to retrieve data: ${response.status}`);
  }

  return await response.text();
}

async function compressToBase64(text) {
  // Compress the text using gzip
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Break into 32KB chunks
  const chunkSize = 32 * 1024;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  // Convert the compressed data to base64
  const base64 = btoa(binary);
  return base64;
}

async function decompressFrombase64(base64) {
  // Decode base64 to compressed binary data
  const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  // Decompress the data using gzip
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  return await new Response(stream).text();
}

function readJsonToConfig(json) {
  updateCharCount(json.char_count);
  charCount.value = json.char_count;
  strokeInput.value = state.strokeWidth = json.line_width;

  deleteLegend();
  json.legend.forEach((e) => {
    if (e.color && e.label && CSS.supports("color", e.color)) {
      addLegendEntry(e.color, e.label);
    }
  });

  clearImages();
  json.images.forEach((src, i) => {
    if (state.images[i]) setImageSrc(i, src);
  });
}

function uploadConfig(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function (event) {
    const json_str = event.target.result;
    readJsonToConfig(JSON.parse(json_str));
  };
  reader.readAsText(file);
}

async function loadConfigFromURL() {
  const params = new URLSearchParams(window.location.search);
  const hash = params.get("share");
  if (!hash) return;

  const config = await getShare(hash);
  if (!config) return;
  const json_data = JSON.parse(await decompressFrombase64(config));

  readJsonToConfig(json_data);
}

function getConfigJson() {
  return {
    char_count: charSel.max,
    line_width: state.strokeWidth,
    legend: Array.from(
      state.legend.map((entry) => ({ color: entry.color, label: entry.label })),
    ),
    images: Array.from(state.images.map((image) => image.src)),
  };
}

function downloadConfig() {
  const config = getConfigJson();
  const link = document.createElement("a");
  link.download = "ship-chart-config.json";
  link.href =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(config, null, 2));
  link.click();
}

async function exportConfigAsUrl() {
  const payload = getConfigJson();

  if (payload.images.some((src) => src.startsWith("blob:"))) {
    alert(
      "Local uploaded images (blob URLs) are not shareable. " +
        "Replace them with external URLs in 'Edit Images' and try again.",
    );
    return;
  }

  // Compress and encode the config to base64
  const base64 = await compressToBase64(JSON.stringify(payload));

  // Create shareable URL
  const hash = await createShare(base64);

  const url = new URL(window.location.href);
  url.searchParams.set("share", hash);
  navigator.clipboard.writeText(url.toString());
  alert("Copied to clipboard!\n");
}

function init() {
  updateCharCount(charCount.value);
  createLegend();
  loadConfigFromURL();
}

function reset() {
  clearImages();
  clearAllLines();
  deleteLegend();
  updateCharCount(DEFAULTS.characterCount);
  updateColor(DEFAULTS.strokeColor);
  strokeInput.value = state.strokeWidth = DEFAULTS.strokeWidth;
  const url = new URL(window.location);
  url.searchParams.delete("share");
  window.history.replaceState({}, document.title, url.toString());
  createLegend();
}

init();
