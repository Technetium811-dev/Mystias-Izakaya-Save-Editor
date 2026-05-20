// ========================
// SAVE EDITOR CORE STATE
// ========================

let originalSave = null;

let itemData = [];
let staffData = [];
let cookwareUnique = [];
let cookwareProgressive = [];
let clothingData = [];
let recipeData = [];
let upgradeData = [];

let selectedItems = new Set();
let selectedStaff = new Set();
let selectedCookwareUnique = new Set();
let selectedClothing = new Set();
let selectedRecipes = new Set();
let selectedUpgrades = new Set();

let progressiveState = new Map();

// ========================
// TOOLTIP
// ========================

const tooltip = document.getElementById("tooltip");

function attachTooltip(el, text) {
  el.addEventListener("mousemove", (e) => {
    tooltip.style.display = "block";
    tooltip.style.left = e.pageX + "px";
    tooltip.style.top = e.pageY + "px";
    tooltip.textContent = text;
  });

  el.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });
}

// ========================
// DATA LOAD
// ========================

fetch("Items.json")
  .then(r => r.json())
  .then(data => {
    itemData = data.items || [];
    staffData = data.staff || [];
    cookwareUnique = data.cookwareUnique || [];
    cookwareProgressive = data.cookwareProgressive || [];
    clothingData = data.clothing || [];
    recipeData = data.recipes || [];
    upgradeData = data.upgrades || [];

    renderAll();
  })
  .catch(err => console.error("DATA LOAD ERROR:", err));

// ========================
// GRID RENDER
// ========================

function renderGrid(data, set, gridId, folder, size = "small") {
  const grid = document.getElementById(gridId);
  if (!grid || !Array.isArray(data)) return;

  grid.innerHTML = "";

  data.forEach(entry => {
    const el = document.createElement("div");
    el.className = "item";

    const imgClass = size === "large" ? "icon-large" : "icon-small";

    el.innerHTML = `
      <img class="${imgClass}" src="icons/${folder}/${entry.icon}">
    `;

    if (set.has(entry.id)) el.classList.add("selected");

    attachTooltip(el, entry.name);

    el.addEventListener("click", () => {
      set.has(entry.id) ? set.delete(entry.id) : set.add(entry.id);
      renderAll();
    });

    grid.appendChild(el);
  });
}

// ========================
// COOKWARE UNIQUE
// ========================

function renderUniqueCookware() {
  const grid = document.getElementById("uniqueCookwareGrid");
  if (!grid) return;

  grid.innerHTML = "";

  cookwareUnique.forEach(entry => {
    const el = document.createElement("div");
    el.className = "item";

    if (selectedCookwareUnique.has(entry.id)) {
      el.classList.add("selected");
    }

    el.innerHTML = `
      <img class="icon-small" src="icons/cookware/${entry.icon}">
    `;

    attachTooltip(el, entry.name);

    el.addEventListener("click", () => {
      selectedCookwareUnique.has(entry.id)
        ? selectedCookwareUnique.delete(entry.id)
        : selectedCookwareUnique.add(entry.id);

      renderAll();
    });

    grid.appendChild(el);
  });
}

// ========================
// PROGRESSIVE COOKWARE
// ========================

function renderProgressiveCookware() {
  const grid = document.getElementById("progressiveCookwareGrid");
  if (!grid) return;

  grid.innerHTML = "";

  cookwareProgressive.forEach(entry => {
    const stage = progressiveState.get(entry.id) || 0;

    const index = stage === 0 ? 0 : stage - 1;
    const icon = entry.icons[index];

    const el = document.createElement("div");
    el.className = "item";

    if (stage === 0) el.classList.add("locked");
    else el.classList.add("selected");

    el.innerHTML = `
      <img class="icon-small" src="icons/cookware/${icon}">
    `;

    attachTooltip(el, entry.name);

    el.addEventListener("click", () => {
      let next = stage + 1;
      if (next > entry.icons.length) next = 0;
      progressiveState.set(entry.id, next);
      renderAll();
    });

    grid.appendChild(el);
  });
}

// ========================
// RENDER ALL UI
// ========================

function renderAll() {
  renderGrid(itemData, selectedItems, "itemGrid", "items");
  renderGrid(staffData, selectedStaff, "staffGrid", "staff", "large");
  renderGrid(clothingData, selectedClothing, "clothingGrid", "clothing");
  renderGrid(recipeData, selectedRecipes, "recipeGrid", "recipes");
  renderGrid(upgradeData, selectedUpgrades, "upgradeGrid", "upgrades");

  renderUniqueCookware();
  renderProgressiveCookware();
}

// ========================
// FILE IMPORT
// ========================

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();

    originalSave = JSON.parse(text);

    syncFromSave(originalSave);

    alert("Save loaded successfully");
  } catch (err) {
    console.error(err);
    alert("Invalid save file");
  }
});

// ========================
// SYNC SAVE → UI
// ========================

function syncFromSave(save) {
  if (!save.storagePartial) {
    alert("Invalid save: missing storagePartial");
    return;
  }

  const sp = save.storagePartial;

  selectedItems.clear();
  selectedStaff.clear();
  selectedCookwareUnique.clear();
  selectedClothing.clear();
  selectedRecipes.clear();
  selectedUpgrades.clear();
  progressiveState.clear();

  const addFromObject = (obj, set) => {
    if (!obj) return;
    Object.keys(obj).forEach(k => set.add(Number(k)));
  };

  addFromObject(sp.items, selectedItems);
  if (Array.isArray(sp.unlockedPartners)) {
    sp.unlockedPartners.forEach(id => selectedStaff.add(Number(id)));
  }
  addFromObject(sp.cookers, selectedCookwareUnique);
  cookwareProgressive.forEach(entry => {
  let stage = 0;

  for (let i = 1; i <= entry.icons.length; i++) {
    const cookerId = entry.stages?.[i];

    if (sp.cookers?.[cookerId]) {
      stage = i;
    }
  }

  progressiveState.set(entry.id, stage);
});
  addFromObject(sp.clothing, selectedClothing);
  addFromObject(sp.izakayaUpgrades, selectedUpgrades);

  if (Array.isArray(sp.recipes)) {
    sp.recipes.forEach(id => selectedRecipes.add(Number(id)));
  }

  renderAll();
}

// ========================
// EXPORT SAVE
// ========================

document.getElementById("exportBtn").addEventListener("click", () => {
  if (!originalSave) return alert("No save loaded");

  const save = structuredClone(originalSave);
  if (!save.storagePartial) save.storagePartial = {};

  const sp = save.storagePartial;

  // ITEMS (force required IDs)
  sp.items = {
    "-2": 1,
    "-1": 1
  };

  selectedItems.forEach(id => sp.items[id] = 1);

  // STAFF
  sp.unlockedPartners = Array.from(selectedStaff);

  // COOKERS
  sp.cookers = {};
  selectedCookwareUnique.forEach(id => sp.cookers[id] = 1);

  cookwareProgressive.forEach(entry => {
    const stage = progressiveState.get(entry.id) || 0;

    for (let i = 1; i <= stage; i++) {
      const id = entry.stages?.[i];
      if (id !== undefined) sp.cookers[id] = 1;
    }
  });

  // CLOTHING / UPGRADES
  sp.clothing = {};
  selectedClothing.forEach(id => sp.clothing[id] = 1);

  sp.izakayaUpgrades = {};
  selectedUpgrades.forEach(id => sp.izakayaUpgrades[id] = 1);

  // RECIPES
  sp.recipes = Array.from(selectedRecipes);

  // DOWNLOAD
  const blob = new Blob(
    [JSON.stringify(save, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "Mystia#0.memory";
  a.click();

  URL.revokeObjectURL(url);
});