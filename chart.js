const circle = document.querySelector(".circle");
const charCount = document.getElementById("char-ct");
const uploadImgForm = document.getElementById("upload-img");
const charSel = document.getElementById("char-sel");
const avatarSel = document.getElementById("avatar-sel");

let color = "#ff4d6d";
let icons = [];
let selectedChar = null;
let ships = [];

function countLines(list, target) {
  return list.filter((arr) => arr[0] == target[0] && arr[1] == target[1])
    .length;
}

function hasArray(list, target) {
  return list.some((arr) => arr.every((value, i) => value === target[i]));
}

function selectChar(index) {
  const char = icons[index];

  // First character
  if (selectedChar == null) {
    selectedChar = index;
    char.style.setProperty("--color", color);
    char.classList.add("selected");
    return;
  }

  // Clicking the same character deselects it
  if (selectedChar == index) {
    char.classList.remove("selected");
    selectedChar = null;
    return;
  }

  // Second character -> create ship

  // Make sure order doesn't matter
  char1 = Math.max(selectedChar, index);
  char2 = Math.min(selectedChar, index);

  if (!hasArray(ships, [char1, char2, color])) {
    dupe_ct = countLines(ships, [char1, char2]);
    ships.push([char1, char2, color]);

    drawShipLine(char1, char2, dupe_ct);
  }

  // Remove selection
  icons[selectedChar].classList.remove("selected");
  selectedChar = null;
}

function getCenter(rect) {
  let parent = circle.getBoundingClientRect();
  return [
    rect.left + rect.width / 2 - parent.left,
    rect.top + rect.height / 2 - parent.top,
  ];
}

function drawShipLine(char1, char2, path_offset) {
  const svg = document.querySelector(".ship-lines");

  const icon1 = icons[char1];
  const icon2 = icons[char2];

  if (!icon1 || !icon2) return;

  // Parent rectangle center
  [rx, ry] = getCenter(circle.getBoundingClientRect());

  // Get center (x, y) positions of both icons
  [x1, y1] = getCenter(icon1.getBoundingClientRect());
  [x2, y2] = getCenter(icon2.getBoundingClientRect());

  // Midpoint
  [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];

  // Euclidean distances
  [dx, dy] = [x2 - x1, y2 - y1];

  // Curvature inversely proportional to line length
  length = Math.sqrt(dx * dx + dy * dy);
  offset = 7500 / length;

  // Angle of vector that points from midpoint to center of circle
  theta = Math.atan2(ry - my, rx - mx);

  // Control point
  cx = mx + offset * Math.cos(theta);
  cy = my + offset * Math.sin(theta);

  // Translation offset (to avoid stacking paths)
  tx = path_offset * 3 * Math.cos(theta);
  ty = path_offset * 3 * Math.sin(theta);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "3");
  path.setAttribute("transform", `translate(${tx}, ${ty})`);

  path.addEventListener("click", () => {
    path.remove();
    ships.pop([char1, char2, color]);
  });

  svg.appendChild(path);
}

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

  charSel.max = charCount.value;

  // Load any previously saved images
  icons.forEach((icon, i) => {
    const image = localStorage.getItem(`uploadedImage-${i + 1}`);
    if (image) {
      icon.src = image;
    }
  });
}

function clearCharacters() {
  icons.forEach((icon, i) => {
    localStorage.removeItem(`uploadedImage-${i + 1}`);
    icon.src = "unknown.png";
  });
  clearAllLines();
}

function clearAllLines() {
  const svg = document.querySelector(".ship-lines");
  svg.innerHTML = "";
  ships = [];
}

function uploadImage(e) {
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
}
uploadImgForm.addEventListener("submit", uploadImage);

function switchColor(el) {
  color = el.style.getPropertyValue("--color");
}
