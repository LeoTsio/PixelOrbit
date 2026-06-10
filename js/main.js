import { getDataISS } from "../providers/iss.js";
import { getDataHUBBLE } from "../providers/hubble.js";
const spacecrafts = [
    {
        id: "iss",
        name: "ISS",
        sprite: "assets/iss.png",
        getData: getDataISS
    },
    {
        id: "hubble",
        name: "Hubble",
        sprite: "assets/hubble.png",
        getData: getDataHUBBLE
    }
];
let currentIndex = 0;
async function updatePage() {
    const craft = spacecrafts[currentIndex];
    const data = await craft.getData();
    document.getElementById("craft-name").textContent = craft.name;
    document.getElementById("craft-sprite").src = craft.sprite;
    document.getElementById("stat1-label").textContent = data.stat1.label;
    document.getElementById("stat1-value").textContent = data.stat1.value;
    document.getElementById("stat2-label").textContent = data.stat2.label;
    document.getElementById("stat2-value").textContent = data.stat2.value;
    document.getElementById("stat3-label").textContent = data.stat3.label;
    document.getElementById("stat3-value").textContent = data.stat3.value;
}
document.getElementById("next").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % spacecrafts.length;
    updatePage();
});
document.getElementById("previous").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + spacecrafts.length) % spacecrafts.length;
    updatePage();
});
updatePage();