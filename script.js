let images = [];
let sessionImages = [];
let currentIndex = 0;
let timerInterval;
let timeLeft = 0;
let totalSessionTime = 0;
let activeSeed = '';
let previewImages = [];
let sessionStartTimestamp = 0;
let isUnlimitedSession = false;
let canAdvanceImage = false;
let manualAdvanceLockTimeout;

// Lifetime stats initialization
let stats = JSON.parse(localStorage.getItem('sketchStats')) || { sessions: 0, images: 0, time: 0, lastSeed: '' };
stats.lastSeed = typeof stats.lastSeed === 'string' ? stats.lastSeed : '';

// DOM Elements
const views = document.querySelectorAll('.view');
const folderInput = document.getElementById('folder-input');
const btnStart = document.getElementById('btn-start');
const imgDisplay = document.getElementById('current-image');
const progressBar = document.getElementById('progress-bar');
const numericDisplay = document.getElementById('numeric-timer');
const progressContainer = document.getElementById('progress-container');
const sessionControlsHint = document.getElementById('session-controls-hint');
const seedInput = document.getElementById('seed-input');
const copySeedButton = document.getElementById('copy-seed');
const seedModeInputs = document.querySelectorAll('input[name="seed-mode"]');
const lifetimeStatsText = document.getElementById('lifetime-stats-text');

// View Switcher
function showView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
}

function generateSeed() {
    return Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
}

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }

    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function mulberry32(seed) {
    return () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createSeededRandom(seed) {
    const seedFactory = xmur3(seed);
    return mulberry32(seedFactory());
}

function getImageKey(file) {
    return [file.webkitRelativePath || file.name, file.size, file.lastModified].join('|');
}

function pickSeededImages(sourceImages, count, seed) {
    const random = createSeededRandom(seed);
    const orderedImages = [...sourceImages].sort((a, b) => getImageKey(a).localeCompare(getImageKey(b)));

    for (let i = orderedImages.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [orderedImages[i], orderedImages[j]] = [orderedImages[j], orderedImages[i]];
    }

    return orderedImages.slice(0, count);
}

function getSelectedSeedMode() {
    return document.querySelector('input[name="seed-mode"]:checked').value;
}

function getSelectedDurationValue() {
    return document.querySelector('input[name="duration"]:checked').value;
}

function getSessionElapsedSeconds() {
    if (!sessionStartTimestamp) {
        return totalSessionTime;
    }

    return Math.max(0, Math.floor((Date.now() - sessionStartTimestamp) / 1000));
}

function refreshManualAdvanceLock() {
    canAdvanceImage = false;
    clearTimeout(manualAdvanceLockTimeout);

    manualAdvanceLockTimeout = window.setTimeout(() => {
        canAdvanceImage = true;
    }, 1000);
}

function advanceToNextImage() {
    clearInterval(timerInterval);
    currentIndex++;
    loadNextImage();
}

function sanitizeSeedInput() {
    seedInput.value = seedInput.value.replace(/\D/g, '').slice(0, 10);
}

function ensureSeedValue() {
    if (!/^\d{10}$/.test(seedInput.value)) {
        seedInput.value = generateSeed();
    }
}

function updateSeedControls() {
    const useUserSeed = getSelectedSeedMode() === 'user';

    if (!useUserSeed) {
        ensureSeedValue();
    }

    seedInput.disabled = !useUserSeed;
}

async function copySeedToClipboard() {
    ensureSeedValue();

    try {
        await navigator.clipboard.writeText(seedInput.value);
        copySeedButton.innerText = 'Copied!';
        window.setTimeout(() => {
            copySeedButton.innerText = 'Copy';
        }, 1200);
    } catch (_) {
        copySeedButton.innerText = 'Failed';
        window.setTimeout(() => {
            copySeedButton.innerText = 'Copy';
        }, 1200);
    }
}

function updateLifetimeStats() {
    lifetimeStatsText.innerText =
        `Total Sessions: ${stats.sessions} | Total Images: ${stats.images} | Total Time: ${Math.floor(stats.time / 60)}m | Last Seed: ${stats.lastSeed || 'None'}`;
}

function renderGallery(galleryId, files) {
    const gallery = document.getElementById(galleryId);
    gallery.innerHTML = '';
    gallery.dataset.count = files.length;

    files.forEach(file => {
        const img = document.createElement('img');
        const url = URL.createObjectURL(file);
        img.src = url;
        img.onclick = () => window.open(url, '_blank');
        gallery.appendChild(img);
    });
}

function getActiveSeedValue({ requireUserSeed = false } = {}) {
    const useUserSeed = getSelectedSeedMode() === 'user';

    sanitizeSeedInput();

    if (useUserSeed) {
        if (!/^\d{10}$/.test(seedInput.value)) {
            if (requireUserSeed) {
                seedInput.focus();
            }

            return null;
        }

        return seedInput.value;
    }

    ensureSeedValue();
    return seedInput.value;
}

function openPreviewFromHome() {
    if (!document.getElementById('view-index').classList.contains('active') || images.length === 0) {
        return;
    }

    const count = parseInt(document.querySelector('input[name="img-count"]:checked').value);
    const previewSeed = getActiveSeedValue({ requireUserSeed: true });

    if (!previewSeed) {
        return;
    }

    previewImages = pickSeededImages(images, count, previewSeed);
    renderGallery('preview-gallery', previewImages);
    document.getElementById('preview-stats-text').innerText =
        `Images: ${previewImages.length} | Seed: ${previewSeed}`;
    showView('preview');
}

// Handle File Selection
folderInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    document.getElementById('file-count').innerText = `${images.length} images found`;
    btnStart.disabled = images.length === 0;
});

seedModeInputs.forEach(input => {
    input.addEventListener('change', updateSeedControls);
});

seedInput.addEventListener('input', sanitizeSeedInput);
copySeedButton.addEventListener('click', copySeedToClipboard);

// Start Session Logic
btnStart.addEventListener('click', () => {
    const count = parseInt(document.querySelector('input[name="img-count"]:checked').value);
    const selectedSeed = getActiveSeedValue({ requireUserSeed: true });

    if (!selectedSeed) {
        return;
    }

    activeSeed = selectedSeed;
    sessionImages = pickSeededImages(images, count, activeSeed);
    
    startCountdown();
});

function startCountdown() {
    showView('countdown');
    let count = 3;
    const display = document.getElementById('countdown-display');
    display.innerText = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            display.innerText = count;
        } else {
            clearInterval(interval);
            startTimerSession();
        }
    }, 1000);
}

function startTimerSession() {
    clearInterval(timerInterval);
    currentIndex = 0;
    totalSessionTime = 0;
    sessionStartTimestamp = Date.now();
    isUnlimitedSession = getSelectedDurationValue() === 'unlimited';
    canAdvanceImage = false;
    clearTimeout(manualAdvanceLockTimeout);
    showView('timer');
    loadNextImage();
}

function loadNextImage() {
    if (currentIndex >= sessionImages.length) {
        endSession();
        return;
    }

    imgDisplay.src = URL.createObjectURL(sessionImages[currentIndex]);
    sessionControlsHint.style.display = 'block';
    refreshManualAdvanceLock();

    if (isUnlimitedSession) {
        timeLeft = 0;
        progressContainer.style.display = 'none';
        numericDisplay.style.display = 'none';
        return;
    }

    const duration = parseInt(getSelectedDurationValue(), 10);
    timeLeft = duration;

    progressContainer.style.display = document.getElementById('show-bar').checked ? 'block' : 'none';
    numericDisplay.style.display = document.getElementById('show-num').checked ? 'block' : 'none';
    runTimer(duration);
}

function runTimer(duration) {
    updateTimerUI(duration);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI(duration);

        if (timeLeft <= 0) {
            if (document.getElementById('enable-sound').checked) {
                document.getElementById('ping-sound').play().catch(() => {});
            }
            advanceToNextImage();
        }
    }, 1000);
}

function updateTimerUI(max) {
    numericDisplay.innerText = timeLeft;
    progressBar.style.width = `${(timeLeft / max) * 100}%`;
}

function endSession() {
    clearInterval(timerInterval);
    clearTimeout(manualAdvanceLockTimeout);
    totalSessionTime = getSessionElapsedSeconds();
    showView('results');

    // Update Lifetime Stats
    stats.sessions++;
    stats.images += sessionImages.length;
    stats.time += totalSessionTime;
    stats.lastSeed = activeSeed;
    localStorage.setItem('sketchStats', JSON.stringify(stats));
    updateLifetimeStats();

    // Populate Gallery
    renderGallery('results-gallery', sessionImages);

    // Populate Stats Text
    document.getElementById('session-stats-text').innerText = 
        `Images: ${sessionImages.length} | Time: ${Math.floor(totalSessionTime/60)}m ${totalSessionTime%60}s | Used seed: ${activeSeed}`;
}

document.getElementById('btn-restart').addEventListener('click', () => showView('index'));
document.getElementById('btn-preview-back').addEventListener('click', () => showView('index'));
document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
            return;
        }
    }

    if (!event.repeat && document.getElementById('view-timer').classList.contains('active')) {
        if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space') {
            event.preventDefault();

            if (!canAdvanceImage) {
                return;
            }

            canAdvanceImage = false;
            advanceToNextImage();
            return;
        }
    }

    if (event.repeat || event.key.toLowerCase() !== 't') {
        return;
    }

    openPreviewFromHome();
});

updateSeedControls();
updateLifetimeStats();
