import { getDataISS } from "../providers/iss.js";
import { getDataHUBBLE } from "../providers/hubble.js";

const providers = {
    iss: getDataISS,
    hubble: getDataHUBBLE
};

let spacecrafts = [];
let currentIndex = 0;

async function loadSpacecrafts() {
    const response = await fetch("data/spacecraftData.json");
    spacecrafts = await response.json();
}

async function updatePage() {
    const craft = spacecrafts[currentIndex];
    const getData = providers[craft.provider];

    const data = await getData();

    document.getElementById("craft-name").textContent = craft.name;
    document.getElementById("craft-sprite").src = craft.sprite;

    document.getElementById("stat1-label").textContent = data.stat1.label;
    document.getElementById("stat1-value").textContent = data.stat1.value;

    document.getElementById("stat2-label").textContent = data.stat2.label;
    document.getElementById("stat2-value").textContent = data.stat2.value;

    document.getElementById("stat3-label").textContent = data.stat3.label;
    document.getElementById("stat3-value").textContent = data.stat3.value;
}

document.getElementById("next").addEventListener("click", async () => {
    currentIndex = (currentIndex + 1) % spacecrafts.length;
    await updatePage();
});

document.getElementById("previous").addEventListener("click", async () => {
    currentIndex = (currentIndex - 1 + spacecrafts.length) % spacecrafts.length;
    await updatePage();
});

await loadSpacecrafts();
await updatePage();