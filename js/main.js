const navigatorElement = document.querySelector(".craft-navigator");
const trackElement = document.querySelector(".craft-track");
const spriteElement = document.getElementById("craft-sprite");

const previousButton = document.getElementById("previous");
const nextButton = document.getElementById("next");

import { getData as getISSData } from "../providers/iss.js";
import { getData as getHubbleData } from "../providers/hubble.js";

const providers = {
    iss: getISSData,
    hubble: getHubbleData
};

const DATA_REFRESH_MS = 30000;
const DATA_TIMEOUT_MS = 6000;

let spacecrafts = [];
let currentIndex = 0;
let isAnimating = false;
let activeRenderId = 0;

async function loadSpacecrafts() {
    const response = await fetch("./data/spacecraftData.json");
    spacecrafts = await response.json();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timed out")), ms);
        })
    ]);
}

function showInitialSprite() {
    const craft = spacecrafts[currentIndex];

    if (!craft || !spriteElement) {
        return;
    }

    spriteElement.src = craft.sprite;
    spriteElement.alt = craft.name;
    spriteElement.style.setProperty("--sprite-scale", craft.scale ?? 1);
}

async function updateSprite(direction) {
    const craft = spacecrafts[currentIndex];

    if (!craft || !spriteElement) {
        return;
    }

    const exitClass =
        direction === "next"
            ? "is-changing-next"
            : "is-changing-previous";

    const enterClass =
        direction === "next"
            ? "is-changing-previous"
            : "is-changing-next";

    spriteElement.classList.add(exitClass);

    await sleep(250);

    spriteElement.classList.add("no-transition");
    spriteElement.classList.remove(exitClass);
    spriteElement.classList.add(enterClass);

    spriteElement.src = craft.sprite;
    spriteElement.alt = craft.name;
    spriteElement.style.setProperty("--sprite-scale", craft.scale ?? 1);

    void spriteElement.offsetWidth;

    spriteElement.classList.remove("no-transition");
    spriteElement.classList.remove(enterClass);
}

async function setCurrentIndex(index) {
    if (isAnimating) {
        return;
    }

    const oldIndex = currentIndex;
    const newIndex = (index + spacecrafts.length) % spacecrafts.length;

    if (oldIndex === newIndex) {
        return;
    }

    isAnimating = true;

    const direction = newIndex > oldIndex ? "next" : "previous";

    currentIndex = newIndex;
    syncActiveOption();

    await updateSprite(direction);

    isAnimating = false;

    renderData({ showLoading: true }).catch(error => {
        console.error("Failed to render spacecraft data:", error);
    });
}

function renderNavigator() {
    if (!navigatorElement || !trackElement) {
        return;
    }

    trackElement.replaceChildren();

    spacecrafts.forEach((craft, index) => {
        const option = document.createElement("button");

        option.className = "craft-option";
        option.type = "button";
        option.textContent = craft.name;
        option.dataset.index = String(index);

        option.addEventListener("click", () => {
            setCurrentIndex(index);
            option.blur();
        });

        trackElement.append(option);
    });
}

function syncActiveOption() {
    if (!navigatorElement || !trackElement) {
        return;
    }

    const options = Array.from(trackElement.querySelectorAll(".craft-option"));
    const activeOption = options[currentIndex];

    if (!activeOption) {
        return;
    }

    options.forEach((option, index) => {
        option.classList.toggle("is-active", index === currentIndex);
    });

    const capsulePadding = 16;
    const activeCenter = activeOption.offsetLeft + activeOption.offsetWidth / 2;
    const leftExtent = activeCenter;
    const rightExtent = trackElement.scrollWidth - activeCenter;
    const collapsedWidth = Math.ceil(activeOption.offsetWidth + capsulePadding * 2);
    const fullRevealWidth = Math.ceil(Math.max(leftExtent, rightExtent) * 2 + capsulePadding * 2);
    const expandedWidth = Math.ceil(Math.min(fullRevealWidth, window.innerWidth - 40));

    navigatorElement.style.setProperty("--capsule-collapsed-width", `${collapsedWidth}px`);
    navigatorElement.style.setProperty(
        "--capsule-expanded-width",
        `${Math.max(collapsedWidth, expandedWidth)}px`
    );

    requestAnimationFrame(() => {
        centerActiveOption(activeOption);
    });
}

function centerActiveOption(activeOption) {
    if (!navigatorElement || !trackElement) {
        return;
    }

    const activeCenter = activeOption.offsetLeft + activeOption.offsetWidth / 2;

    trackElement.style.transform =
        `translate3d(${Math.round(-activeCenter)}px, 0, 0)`;
}

async function renderData() {
    const renderId = ++activeRenderId;

    const spacecraft = spacecrafts[currentIndex];
    const provider = providers[spacecraft.provider];

    if (!spacecraft || !provider) {
        return;
    }

    renderLoadingStat(1, spacecraft.stats.stat1.icon);
    renderLoadingStat(2, spacecraft.stats.stat2.icon);
    renderLoadingStat(3, spacecraft.stats.stat3.icon);

    const statPromises = provider();

    renderStat(renderId, 1, statPromises[0]);
    renderStat(renderId, 2, statPromises[1]);
    renderStat(renderId, 3, statPromises[2]);
}

function renderLoadingStat(number, icon) {
    const valueElement = document.getElementById(`stat${number}-value`);
    const iconElement = document.getElementById(`stat${number}-icon`);

    iconElement.src = icon;
    valueElement.textContent = "Loading...";
}

async function renderStat(renderId, number, promise) {
    const valueElement = document.getElementById(`stat${number}-value`);

    try {
        const value = await promise;

        if (renderId !== activeRenderId) {
            return;
        }

        valueElement.textContent = value;
    } catch {
        if (renderId !== activeRenderId) {
            return;
        }

        valueElement.textContent = "—";
    }
}

window.addEventListener("resize", () => {
    syncActiveOption();
});

previousButton?.addEventListener("click", () => {
    setCurrentIndex(currentIndex - 1);
});

nextButton?.addEventListener("click", () => {
    setCurrentIndex(currentIndex + 1);
});

window.addEventListener("mousemove", (event) => {
    document.body.style.setProperty("--mouse-x", `${event.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${event.clientY}px`);
});

await loadSpacecrafts();

renderNavigator();
syncActiveOption();
showInitialSprite();

await renderData({ showLoading: true });

window.setInterval(() => {
    renderData().catch(error => {
        console.error("Failed to refresh spacecraft data:", error);
    });
}, DATA_REFRESH_MS);