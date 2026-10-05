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

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

let strokeColor = "#FF0000";
let strokeWidth = Number(strokeInput.value) || 2;
let icons = [];
let icon_srcs = [];
let selectedChar = null;
let ships = [];

// ─────────────────────────────────────────────
// Character Selection and Ship Lines
// ─────────────────────────────────────────────

// Count SVG paths between same two characters
function countLines(list, target) {
  return list.filter((arr) => arr[0] == target[0] && arr[1] == target[1])
    .length;
}

function hasArray(list, target) {
  return list.some((arr) => arr.every((value, i) => value === target[i]));
}

// Select a character to attach path to
function selectChar(index) {
  const char = icons[index];

  // First character
  if (selectedChar == null) {
    selectedChar = index;
    char.style.setProperty("--color", strokeColor);
    char.classList.add("selected");
    return;
  }

  // Clicking the same character deselects it
  if (selectedChar == index) {
    char.classList.remove("selected");
    selectedChar = null;
    return;
  }

  // Second character -> create ship line

  // Make sure order doesn't matter
  const char1 = Math.max(selectedChar, index);
  const char2 = Math.min(selectedChar, index);

  if (!hasArray(ships, [char1, char2, strokeColor])) {
    const dupe_ct = countLines(ships, [char1, char2]);
    ships.push([char1, char2, strokeColor]);

    drawShipLine(char1, char2, strokeColor, dupe_ct);
  }

  // Remove selection
  icons[selectedChar].classList.remove("selected");
  selectedChar = null;
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
  const svg = circle.querySelector(".ship-lines");
  const icon1 = icons[char1];
  const icon2 = icons[char2];

  if (!icon1 || !icon2) return;

  // Parent rectangle center
  const [rx, ry] = [
    circle.getBoundingClientRect().width / 2,
    circle.getBoundingClientRect().height / 2,
  ];

  // Get center (x, y) positions of both icons
  const [x1, y1] = getCenter(icon1.getBoundingClientRect());
  const [x2, y2] = getCenter(icon2.getBoundingClientRect());

  // Midpoint
  const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];

  // Euclidean distances
  const [dx, dy] = [x2 - x1, y2 - y1];

  // Curvature inversely proportional to line length
  const length = Math.hypot(dx, dy);
  const offset = 7500 / length;

  // Angle of vector that points from midpoint to center of circle
  const theta = Math.atan2(ry - my, rx - mx);

  // Control point
  const cx = mx + offset * Math.cos(theta);
  const cy = my + offset * Math.sin(theta);

  // Translation offset (to avoid stacking paths)
  const tx = path_offset * strokeWidth * Math.cos(theta);
  const ty = path_offset * strokeWidth * Math.sin(theta);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", strokeWidth);
  path.setAttribute("transform", `translate(${tx}, ${ty})`);

  path.addEventListener("click", () => {
    path.remove();
    const index = ships.findIndex(
      (ship) => ship[0] == char1 && ship[1] == char2 && ship[2] == color,
    );

    if (index != -1) ships.splice(index, 1);
  });

  svg.appendChild(path);
}

// Clear drawn ship lines
function clearAllLines() {
  const svg = circle.querySelector(".ship-lines");
  svg.replaceChildren();
  ships = [];
}

// ─────────────────────────────────────────────
// Icons + Image Handling
// ─────────────────────────────────────────────

// Update number of images in circle based on user input
function updateCharCount(value) {
  selectedChar = null;
  ships = [];

  charSel.max = Math.min(value, charCount.max);

  // Clear existing elements
  circle.replaceChildren();
  iconSrcInput.replaceChildren();

  // Create SVG
  const shipLines = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  shipLines.setAttribute("class", "ship-lines");
  circle.appendChild(shipLines);

  for (let i = 0; i < charSel.max; i++) {
    // Create icon
    const icon = document.createElement("img");
    icon.className = "icon";
    icon.src = "./unknown.png";
    icon.setAttribute("data-bs-toggle", "tooltip");
    icon.setAttribute("data-bs-title", i + 1);
    icon.addEventListener("click", () => selectChar(i));
    circle.appendChild(icon);

    // insert label before input
    const label = document.createTextNode(`${i + 1}: `);
    iconSrcInput.appendChild(label);

    // Create image source input
    const input = document.createElement("input");
    input.style.width = "90%";
    input.className = "icon_src";
    input.type = "text";
    input.value = "./unknown.png";
    input.addEventListener("change", () => updateImageSrc(i, input.value));
    iconSrcInput.appendChild(input);

    const linebreak = document.createElement("br");
    iconSrcInput.appendChild(linebreak);
  }

  icons = Array.from(circle.querySelectorAll(".icon"));
  const tooltipList = [...icons].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
  icon_srcs = Array.from(iconSrcInput.querySelectorAll(".icon_src"));

  // Position icons around the circle
  icons.forEach((icon, i) => {
    const angle = (360 / icons.length) * i;

    icon.style.setProperty("--total-num", icons.length);
    icon.style.setProperty("--angle", `${angle}deg`);
  });
}

// Clear character images
function clearImages() {
  icons.forEach((icon) => (icon.src = "./unknown.png"));
}

function updateImageSrc(idx, value) {
  icons[idx].src = value;
}

// Upload images
document.getElementById("chart-form").addEventListener("submit", (e) => {
  e.preventDefault();
  Array.from(avatarSel.files).forEach(async (file, i) => {
    const idx = charSel.value - 1 + i;
    if (idx >= charSel.max) return;

    // Create a temporary URL for the uploaded file
    const imageSrc = URL.createObjectURL(file);
    icons[idx].src = imageSrc;
    icon_srcs[idx].value = imageSrc;
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
  const color = document.querySelector(
    `input[type='color'][data-index='${idx}']`,
  ).value;
  const label = document.querySelector(
    `input[type='text'][data-index='${idx}']`,
  ).value;
  const swatch = document.querySelector(`.swatch[data-index='${idx}']`);
  swatch.style.setProperty("--color", color);
  swatch.nextSibling.textContent = ` ${label}`;
}

// Update global stroke color
function updateColor(color) {
  strokeColor = color;
  document
    .getElementById("current-color")
    .style.setProperty("--color", strokeColor);
  if (selectedChar != null)
    icons[selectedChar].style.setProperty("--color", strokeColor);
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
  colorInput.dataset.index = idx;

  const labelInput = document.createElement("input");
  labelInput.className = "w-100";
  labelInput.type = "text";
  labelInput.placeholder = "Label";
  labelInput.value = label;
  labelInput.dataset.index = idx;

  entry.append(colorInput, labelInput);
  legendInput.appendChild(entry);

  // Create legend display item
  const item = document.createElement("div");
  item.className = "legend-item";

  const button = document.createElement("button");
  button.className = "swatch";
  button.dataset.index = idx;
  button.type = "button";
  button.style.setProperty("--color", color);
  button.addEventListener("click", () =>
    updateColor(button.style.getPropertyValue("--color")),
  );

  const labelText = document.createTextNode(" " + label);
  item.append(button, labelText);
  legend.appendChild(item);
}

function removeLastLegendEntry() {
  if (!legend.lastElementChild) return;
  legendInput.removeChild(legendInput.lastElementChild);
  legend.removeChild(legend.lastElementChild);
}

// ─────────────────────────────────────────────
// Export and Import Config via URL
// ─────────────────────────────────────────────

async function compressToBase64(text) {
  // Compress the text using gzip
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();

  // Convert the compressed data to base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  // Convert to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function decompressFrombase64(data) {
  // Convert from base64url to base64
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  // Decode base64 to compressed binary data
  const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  // Decompress the data using gzip
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  return await new Response(stream).text();
}

async function loadConfigFromURL() {
  const params = new URLSearchParams(window.location.search);
  const config = params.get("config");
  if (!config) return;

  const json_data = JSON.parse(await decompressFrombase64(config));

  updateCharCount(json_data.char_count);
  charCount.value = json_data.char_count;
  strokeInput.value = strokeWidth = json_data.line_width;

  deleteLegend();
  json_data.legend.forEach((e) => {
    if (e.color && e.label && CSS.supports("color", e.color)) {
      addLegendEntry(e.color, e.label);
    }
  });

  clearImages();
  json_data.images.forEach((src, i) => {
    if (icons[i]) {
      icons[i].src = src;
      icon_srcs[i].value = src;
    }
  });
}

async function exportConfig() {
  const legendEntries = Array.from(legendInput.children).map((entry) => {
    const color = entry.querySelector("input[type='color']").value;
    const label = entry.querySelector("input[type='text']").value;
    return { color, label };
  });
  const images = Array.from(icons).map((icon) => icon.src);

  if (images.some((src) => src.startsWith("blob:"))) {
    alert(
      "Warning: Local uploaded images (blob URLs) are not shareable. " +
        "Replace them with external URLs before sharing.",
    );
  }

  const payload = {
    char_count: charSel.max,
    line_width: strokeWidth,
    legend: legendEntries,
    images: images,
  };

  // Compress and encode the config to base64url
  const encoded = await compressToBase64(JSON.stringify(payload));

  const url = new URL(window.location.href);
  url.searchParams.set("config", encoded);
  navigator.clipboard.writeText(url.toString());
}

function init() {
  updateCharCount(10);
  createLegend();
  loadConfigFromURL();
}

function reset() {
  clearImages();
  clearAllLines();
  deleteLegend();
  updateCharCount(10);
  strokeInput.value = strokeWidth = 2;
  strokeColor = "#FF0000";
  document
    .getElementById("current-color")
    .style.setProperty("--color", strokeColor);
  const url = new URL(window.location);
  url.searchParams.delete("config");
  window.history.replaceState({}, document.title, url.toString());
  createLegend();
}

init();
