const navigatorElement = document.querySelector(".craft-navigator");
const trackElement = document.querySelector(".craft-track");
const spriteElement = document.getElementById("craft-sprite");
const dataCapsuleElement = document.querySelector(".data-capsule");

const previousButton = document.getElementById("previous");
const nextButton = document.getElementById("next");

import { getData as getISSData } from "../providers/iss.js";
import { getData as getHubbleData } from "../providers/hubble.js";

const providers = {
    iss: getISSData,
    hubble: getHubbleData
};

const DATA_REFRESH_MS = 30000;
const NAVIGATOR_COPY_COUNT = 3;
const NAVIGATOR_MIDDLE_COPY = 1;
const NAVIGATOR_TRANSITION_MS = 280;
const SPRITE_TRANSITION_MS = 1150;
const STAT_VALUE_SCROLL_MS = 280;

let spacecrafts = [];
let currentIndex = 0;
let isAnimating = false;
let activeRenderId = 0;
let navigatorActiveCopy = NAVIGATOR_MIDDLE_COPY;
let navigatorResetTimer = null;
let dataCapsuleWidthFrame = null;
const statValueTimers = new WeakMap();
const statCache = new Map();

async function loadSpacecrafts() {
    const response = await fetch("./data/spacecraftData.json");
    spacecrafts = await response.json();
}

function waitForTransformTransition(element, fallbackMs) {
    return new Promise(resolve => {
        let isDone = false;

        const finish = () => {
            if (isDone) return;

            isDone = true;
            window.clearTimeout(timeout);
            element.removeEventListener("transitionend", onTransitionEnd);
            resolve();
        };

        const onTransitionEnd = event => {
            if (event.target === element && event.propertyName === "transform") {
                finish();
            }
        };

        const timeout = window.setTimeout(finish, fallbackMs);

        element.addEventListener("transitionend", onTransitionEnd);
    });
}

function scheduleDataCapsuleWidthUpdate() {
    if (!dataCapsuleElement || dataCapsuleWidthFrame) return;

    dataCapsuleWidthFrame = requestAnimationFrame(() => {
        dataCapsuleWidthFrame = null;
        updateDataCapsuleWidth();
    });
}

function updateDataCapsuleWidth() {
    if (!dataCapsuleElement) return;

    const clone = dataCapsuleElement.cloneNode(true);

    clone.querySelectorAll("[id]").forEach(element => {
        element.removeAttribute("id");
    });

    clone.style.position = "absolute";
    clone.style.left = "-10000px";
    clone.style.bottom = "auto";
    clone.style.transform = "none";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.width = "max-content";
    clone.style.transition = "none";

    document.body.append(clone);

    const width = Math.ceil(clone.getBoundingClientRect().width);

    clone.remove();

    dataCapsuleElement.style.setProperty("--data-capsule-width", `${width}px`);
}

function createStatValueSpan(text, className = "", isCurrent = true) {
    const span = document.createElement("span");

    span.className = [
        "stat-value-text",
        isCurrent ? "stat-value-current" : "",
        className
    ].filter(Boolean).join(" ");
    span.textContent = text;

    return span;
}

function getCurrentStatText(valueElement) {
    const currentElement = valueElement.querySelector(".stat-value-current");

    return currentElement?.textContent ?? valueElement.textContent;
}

function measureStatTextWidth(valueElement, text) {
    const probe = document.createElement("span");

    probe.className = "stat-value-text stat-value-probe";
    probe.textContent = text;
    valueElement.append(probe);

    const width = Math.ceil(probe.getBoundingClientRect().width);

    probe.remove();

    return width;
}

function commitStatValue(valueElement, text) {
    window.clearTimeout(statValueTimers.get(valueElement));
    statValueTimers.delete(valueElement);

    valueElement.classList.remove("is-scrolling");
    valueElement.style.removeProperty("--stat-value-width");
    valueElement.replaceChildren(createStatValueSpan(text));
    scheduleDataCapsuleWidthUpdate();
}

function setStatValue(valueElement, nextValue) {
    const nextText = String(nextValue);
    const currentText = getCurrentStatText(valueElement);

    if (!currentText || currentText === nextText) {
        commitStatValue(valueElement, nextText);
        return;
    }

    window.clearTimeout(statValueTimers.get(valueElement));

    const currentWidth = measureStatTextWidth(valueElement, currentText);
    const nextWidth = measureStatTextWidth(valueElement, nextText);

    valueElement.style.setProperty(
        "--stat-value-width",
        `${Math.max(currentWidth, nextWidth)}px`
    );
    valueElement.classList.add("is-scrolling");
    valueElement.replaceChildren(
        createStatValueSpan(currentText, "is-exiting", false),
        createStatValueSpan(nextText, "is-entering")
    );

    scheduleDataCapsuleWidthUpdate();

    const timer = window.setTimeout(() => {
        commitStatValue(valueElement, nextText);
    }, STAT_VALUE_SCROLL_MS);

    statValueTimers.set(valueElement, timer);
}

function showInitialSprite() {
    const craft = spacecrafts[currentIndex];

    if (!craft || !spriteElement) return;

    spriteElement.src = craft.sprite;
    spriteElement.alt = craft.name;
    spriteElement.style.setProperty("--sprite-scale", craft.scale ?? 1);
}

async function updateSprite(direction) {
    const craft = spacecrafts[currentIndex];

    if (!craft || !spriteElement) return;

    const exitClass =
        direction === "next"
            ? "is-changing-next"
            : "is-changing-previous";

    const enterClass =
        direction === "next"
            ? "is-changing-previous"
            : "is-changing-next";

    const outgoingSprite = spriteElement.cloneNode(true);

    outgoingSprite.removeAttribute("id");
    outgoingSprite.classList.remove(
        "is-changing-next",
        "is-changing-previous",
        "is-entering",
        "no-transition"
    );
    outgoingSprite.classList.add("transition-clone");
    outgoingSprite.setAttribute("aria-hidden", "true");
    outgoingSprite.alt = "";
    spriteElement.parentElement?.append(outgoingSprite);

    spriteElement.classList.add("no-transition");
    spriteElement.classList.add(enterClass);

    spriteElement.src = craft.sprite;
    spriteElement.alt = craft.name;
    spriteElement.style.setProperty("--sprite-scale", craft.scale ?? 1);

    void spriteElement.offsetWidth;

    spriteElement.classList.remove("no-transition");
    spriteElement.classList.add("is-entering");

    requestAnimationFrame(() => {
        outgoingSprite.classList.add(exitClass);
        spriteElement.classList.remove(enterClass);
    });

    await waitForTransformTransition(outgoingSprite, SPRITE_TRANSITION_MS);

    spriteElement.classList.remove("is-entering");
    outgoingSprite.remove();
}

async function setCurrentIndex(index) {
    if (isAnimating) return;

    const oldIndex = currentIndex;
    const newIndex = (index + spacecrafts.length) % spacecrafts.length;

    if (oldIndex === newIndex) return;

    isAnimating = true;

    const direction = index > oldIndex ? "next" : "previous";

    currentIndex = newIndex;
    navigatorActiveCopy = getNavigatorCopyForTransition(oldIndex, newIndex, direction);
    syncActiveOption();
    resetNavigatorCopyAfterTransition();

    await updateSprite(direction);

    isAnimating = false;

    renderData({ showLoading: true }).catch(error => {
        console.error("Failed to render spacecraft data:", error);
    });
}

function renderNavigator() {
    if (!navigatorElement || !trackElement || spacecrafts.length === 0) return;

    trackElement.replaceChildren();

    for (let copy = 0; copy < NAVIGATOR_COPY_COUNT; copy += 1) {
        spacecrafts.forEach((craft, index) => {
            const option = document.createElement("button");

            option.className = "craft-option";
            option.type = "button";
            option.textContent = craft.name;
            option.dataset.index = String(index);
            option.dataset.copy = String(copy);

            if (copy !== NAVIGATOR_MIDDLE_COPY) {
                option.tabIndex = -1;
                option.setAttribute("aria-hidden", "true");
            }

            option.addEventListener("click", () => {
                const targetIndex =
                    index + (copy - NAVIGATOR_MIDDLE_COPY) * spacecrafts.length;

                setCurrentIndex(targetIndex);
                option.blur();
            });

            trackElement.append(option);
        });
    }

    syncActiveOption();
}

function syncActiveOption({ immediate = false } = {}) {
    if (!navigatorElement || !trackElement) return;

    const options = Array.from(trackElement.querySelectorAll(".craft-option"));
    const activeOption = options.find(
        option =>
            Number(option.dataset.index) === currentIndex &&
            Number(option.dataset.copy) === navigatorActiveCopy
    );

    if (!activeOption) return;

    options.forEach(option => {
        option.classList.toggle(
            "is-active",
            Number(option.dataset.index) === currentIndex
        );
    });

    const gap = 10;
    const navigatorStyles = getComputedStyle(navigatorElement);
    const padding =
        parseFloat(navigatorStyles.getPropertyValue("--capsule-padding")) || 8;

    const collapsedWidth = activeOption.offsetWidth + padding * 2;

    const totalOptionsWidth =
        spacecrafts.reduce((sum, _craft, index) => {
            const option = options.find(
                item =>
                    Number(item.dataset.index) === index &&
                    Number(item.dataset.copy) === NAVIGATOR_MIDDLE_COPY
            );

            return sum + (option?.offsetWidth ?? 0);
        }, 0) +
        gap * (spacecrafts.length - 1);

    const expandedWidth = totalOptionsWidth + padding * 2;

    navigatorElement.style.setProperty(
        "--capsule-collapsed-width",
        `${collapsedWidth}px`
    );

    navigatorElement.style.setProperty(
        "--capsule-expanded-width",
        `${expandedWidth}px`
    );

    if (immediate) {
        updateNavigatorPosition(activeOption);
        return;
    }

    requestAnimationFrame(() => {
        updateNavigatorPosition(activeOption);
    });
}

function getNavigatorCopyForTransition(oldIndex, newIndex, direction) {
    if (!trackElement) return NAVIGATOR_MIDDLE_COPY;

    const options = Array.from(trackElement.querySelectorAll(".craft-option"));
    const currentOption = options.find(
        option =>
            Number(option.dataset.index) === oldIndex &&
            Number(option.dataset.copy) === NAVIGATOR_MIDDLE_COPY
    );

    if (!currentOption) return NAVIGATOR_MIDDLE_COPY;

    const matchingOptions = options
        .filter(option => Number(option.dataset.index) === newIndex);

    const nextOption =
        direction === "next"
            ? matchingOptions.find(option => option.offsetLeft > currentOption.offsetLeft)
            : [...matchingOptions]
                .reverse()
                .find(option => option.offsetLeft < currentOption.offsetLeft);

    return Number(nextOption?.dataset.copy) || NAVIGATOR_MIDDLE_COPY;
}

function resetNavigatorCopyAfterTransition() {
    window.clearTimeout(navigatorResetTimer);

    if (navigatorActiveCopy === NAVIGATOR_MIDDLE_COPY) return;

    navigatorResetTimer = window.setTimeout(() => {
        navigatorActiveCopy = NAVIGATOR_MIDDLE_COPY;
        trackElement.classList.add("no-transition");
        syncActiveOption({ immediate: true });

        void trackElement.offsetWidth;

        requestAnimationFrame(() => {
            trackElement.classList.remove("no-transition");
        });
    }, NAVIGATOR_TRANSITION_MS);
}

function updateNavigatorPosition(activeOption) {
    if (!navigatorElement || !trackElement) return;

    const isExpanded = navigatorElement.matches(":hover, :focus-within");

    if (isExpanded) {
        trackElement.style.transform =
            `translate3d(${-activeOption.offsetLeft}px, 0, 0)`;
        return;
    }

    const navigatorStyles = getComputedStyle(navigatorElement);
    const collapsedWidth = parseFloat(
        navigatorStyles.getPropertyValue("--capsule-collapsed-width")
    );
    const padding =
        parseFloat(navigatorStyles.getPropertyValue("--capsule-padding")) || 0;

    const activeCenter =
        activeOption.offsetLeft + activeOption.offsetWidth / 2;

    const offset =
        activeCenter - (collapsedWidth / 2 - padding);

    trackElement.style.transform =
        `translate3d(${-offset}px, 0, 0)`;
}

async function renderData({ showLoading = false } = {}) {
    const renderId = ++activeRenderId;

    const spacecraft = spacecrafts[currentIndex];

    if (!spacecraft) return;

    const provider = providers[spacecraft.provider];
    const cacheKey = getSpacecraftCacheKey(spacecraft);
    const cachedStats = statCache.get(cacheKey);

    renderLoadingStat(1, spacecraft.stats.stat1.icon, showLoading, cachedStats?.[1]);
    renderLoadingStat(2, spacecraft.stats.stat2.icon, showLoading, cachedStats?.[2]);
    renderLoadingStat(3, spacecraft.stats.stat3.icon, showLoading, cachedStats?.[3]);

    if (!provider) {
        renderStat(renderId, cacheKey, 1, Promise.resolve("—"));
        renderStat(renderId, cacheKey, 2, Promise.resolve("—"));
        renderStat(renderId, cacheKey, 3, Promise.resolve("—"));
        return;
    }

    const statPromises = provider();

    renderStat(renderId, cacheKey, 1, statPromises[0]);
    renderStat(renderId, cacheKey, 2, statPromises[1]);
    renderStat(renderId, cacheKey, 3, statPromises[2]);
}

function getSpacecraftCacheKey(spacecraft) {
    return spacecraft.id ?? spacecraft.provider ?? spacecraft.name;
}

function cacheStatValue(cacheKey, number, value) {
    if (!statCache.has(cacheKey)) {
        statCache.set(cacheKey, {});
    }

    statCache.get(cacheKey)[number] = value;
}

function renderLoadingStat(number, icon, showLoading, cachedValue) {
    const valueElement = document.getElementById(`stat${number}-value`);
    const iconElement = document.getElementById(`stat${number}-icon`);

    iconElement.src = icon;

    if (cachedValue !== undefined) {
        setStatValue(valueElement, cachedValue);
        return;
    }

    if (showLoading || !valueElement.textContent.trim()) {
        setStatValue(valueElement, "Loading...");
    }
}

async function renderStat(renderId, cacheKey, number, promise) {
    const valueElement = document.getElementById(`stat${number}-value`);

    try {
        const value = await promise;

        cacheStatValue(cacheKey, number, value);

        if (renderId !== activeRenderId) return;

        setStatValue(valueElement, value);
    } catch {
        if (renderId !== activeRenderId) return;

        setStatValue(valueElement, "—");
    }
}

window.addEventListener("resize", syncActiveOption);

navigatorElement?.addEventListener("mouseenter", syncActiveOption);
navigatorElement?.addEventListener("mouseleave", syncActiveOption);
navigatorElement?.addEventListener("focusin", syncActiveOption);
navigatorElement?.addEventListener("focusout", syncActiveOption);

previousButton?.addEventListener("click", () => {
    setCurrentIndex(currentIndex - 1);
});

nextButton?.addEventListener("click", () => {
    setCurrentIndex(currentIndex + 1);
});

window.addEventListener("mousemove", (event) => {
    document.body.style.setProperty("--mouse-x", `${event.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${event.clientY}px`);

    if (!spriteElement) return;

    const normalizedX = (event.clientX / window.innerWidth - 0.5) * 2;
    const normalizedY = (event.clientY / window.innerHeight - 0.5) * 2;

    spriteElement.style.setProperty("--sprite-offset-x", `${Math.round(normalizedX * 8)}px`);
    spriteElement.style.setProperty("--sprite-offset-y", `${Math.round(normalizedY * 6)}px`);
});

await loadSpacecrafts();

renderNavigator();
showInitialSprite();
updateDataCapsuleWidth();

await renderData({ showLoading: true });

window.setInterval(() => {
    renderData().catch(error => {
        console.error("Failed to refresh spacecraft data:", error);
    });
}, DATA_REFRESH_MS);
