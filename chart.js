const circle = document.querySelector(".circle");
const charCount = document.getElementById("char-ct");
const charSel = document.getElementById("char-sel");
const avatarSel = document.getElementById("avatar-sel");
const legend = document.getElementById("legend");
const legendInput = document.getElementById("legend-input");
const strokeInput = document.getElementById("stroke-width");

let strokeColor = "#FF0000";
let strokeWidth = strokeInput.value;
let icons = [];
let selectedChar = null;
let ships = [];

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
  char1 = Math.max(selectedChar, index);
  char2 = Math.min(selectedChar, index);

  if (!hasArray(ships, [char1, char2, strokeColor])) {
    dupe_ct = countLines(ships, [char1, char2]);
    ships.push([char1, char2, strokeColor]);

    drawShipLine(char1, char2, dupe_ct);
  }

  // Remove selection
  icons[selectedChar].classList.remove("selected");
  selectedChar = null;
}

// Get center coordinates of bounding rectangle
function getCenter(rect) {
  let parent = circle.getBoundingClientRect();
  return [
    rect.left + rect.width / 2 - parent.left,
    rect.top + rect.height / 2 - parent.top,
  ];
}

// Draw a line between two given characters
function drawShipLine(char1, char2, path_offset) {
  const svg = circle.querySelector(".ship-lines");

  const icon1 = icons[char1];
  const icon2 = icons[char2];

  if (!icon1 || !icon2) return;

  // Parent rectangle center
  const [rx, ry] = getCenter(circle.getBoundingClientRect());

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
  path.setAttribute("stroke", strokeColor);
  path.setAttribute("stroke-width", strokeWidth);
  path.setAttribute("transform", `translate(${tx}, ${ty})`);

  path.addEventListener("click", () => {
    path.remove();
    const index = ships.findIndex(
      (ship) => ship[0] == char1 && ship[1] == char2 && ship[2] == strokeColor,
    );

    if (index != -1) ships.splice(index, 1);
  });

  svg.appendChild(path);
}

// Update number of images in circle based on user input
function updateCharacters() {
  let iconHtml = "<svg class='ship-lines'></svg>";
  selectedChar = null;

  for (let i = 0; i < charCount.value && i < charCount.max; i++) {
    iconHtml += `<a href="javascript:selectChar(${i})"><img src="./unknown.png" class="icon"></a>`;
  }

  circle.innerHTML = iconHtml;

  icons = circle.querySelectorAll(".icon");

  icons.forEach((icon, i) => {
    const angle = (360 / icons.length) * i;

    icon.style.setProperty("--total-num", icons.length);
    icon.style.setProperty("--angle", `${angle}deg`);
  });

  charSel.max = Math.min(charCount.value, charCount.max);

  // Load any previously saved images
  icons.forEach((icon, i) => {
    const image = localStorage.getItem(`uploadedImage-${i + 1}`);
    if (image) {
      icon.src = image;
    }
  });
}

// Clear character images
function clearCharacters() {
  icons.forEach((icon, i) => {
    localStorage.removeItem(`uploadedImage-${i + 1}`);
    icon.src = "unknown.png";
  });
  clearAllLines();
}

// Clear drawn ship lines
function clearAllLines() {
  const svg = circle.querySelector(".ship-lines");
  svg.innerHTML = "";
  ships = [];
}

// Upload images
document.getElementById("chart-form").addEventListener("submit", (e) => {
  e.preventDefault();

  Array.from(avatarSel.files).forEach((file, i) => {
    const idx = charSel.value - 1 + i;
    if (idx >= charCount) return;

    // Display image immediately
    const imageSrc = URL.createObjectURL(file);
    icons[idx].src = imageSrc;

    // Save to local storage
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem(`uploadedImage-${idx + 1}`, reader.result);

      icons[idx].src = reader.result;
    };

    reader.readAsDataURL(file);
  });
});

// Export screenshot
document.getElementById("export").addEventListener("click", async () => {
  const canvas = await html2canvas(document.getElementById("ship-chart"));
  const link = document.createElement("a");
  link.download = "ship-chart.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// Update global stroke color
function updateColor(el) {
  strokeColor = el.style.getPropertyValue("--color");
  document
    .getElementById("current-color")
    .style.setProperty("--color", strokeColor);
  icons[selectedChar].style.setProperty("--color", strokeColor);
}

// Update legend for a specific entry
function updateLegend(el, idx) {
  // el should be of class .legend-entry
  const color = el.querySelector("[type='color']").value;
  const label = el.querySelector("[type='text']").value;
  document.getElementById(`label-${idx}`).innerHTML =
    `<button onclick="color = this.style.getPropertyValue('--color');" class="swatch" style="--color: ${color}"></button> ${label}`;
}

// Create legend. Run only once in beginning
function createLegend() {
  const html = Array.from(document.querySelectorAll(".legend-entry"))
    .map((entry, idx) => {
      entry.addEventListener("change", () => updateLegend(entry, idx));
      const color = entry.querySelector("[type='color']").value;
      const label = entry.querySelector("[type='text']").value;

      return `
            <div class="legend-item" id="label-${idx}">
                <button onclick="updateColor(this);" class="swatch" style="--color: ${color}"></button>
                ${label}
            </div>
        `;
    })
    .join("");

  legend.innerHTML = html;
}

function addLegendEntry() {
  const idx = legendInput.children.length;
  legendInput.insertAdjacentHTML(
    "beforeend",
    `<div class='legend-entry my-1 d-flex'>
        <input type='color' value='white'>
        <input class='w-100' type='text' placeholder='Label'>
    </div>`,
  );

  legend.insertAdjacentHTML(
    "beforeend",
    `
        <div class="legend-item" id="label-${idx}">
            <button onclick="updateColor(this);" class="swatch" style="--color: white"></button>
            Label
        </div>
    `,
  );
  legendInput.lastChild.addEventListener("change", () =>
    updateLegend(legendInput.lastElementChild, idx),
  );
}

function removeLegendEntry() {
  if (!legend.lastElementChild) return;
  legendInput.removeChild(legendInput.lastElementChild);
  legend.removeChild(legend.lastElementChild);
}
