let images = [];
let sessionImages = [];
let currentIndex = 0;
let timerInterval;
let timeLeft = 0;
let totalSessionTime = 0;

// Lifetime stats initialization
let stats = JSON.parse(localStorage.getItem('sketchStats')) || { sessions: 0, images: 0, time: 0 };

// DOM Elements
const views = document.querySelectorAll('.view');
const folderInput = document.getElementById('folder-input');
const btnStart = document.getElementById('btn-start');
const imgDisplay = document.getElementById('current-image');
const progressBar = document.getElementById('progress-bar');
const numericDisplay = document.getElementById('numeric-timer');

// View Switcher
function showView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
}

// Handle File Selection
folderInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    document.getElementById('file-count').innerText = `${images.length} images found`;
    btnStart.disabled = images.length === 0;
});

// Start Session Logic
btnStart.addEventListener('click', () => {
    const count = parseInt(document.querySelector('input[name="img-count"]:checked').value);
    sessionImages = images.sort(() => 0.5 - Math.random()).slice(0, count);
    
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
    currentIndex = 0;
    totalSessionTime = 0;
    showView('timer');
    loadNextImage();
}

function loadNextImage() {
    if (currentIndex >= sessionImages.length) {
        endSession();
        return;
    }

    const duration = parseInt(document.querySelector('input[name="duration"]:checked').value);
    timeLeft = duration;
    totalSessionTime += duration;
    
    // UI Visibility Toggles
    progressBar.parentElement.style.display = document.getElementById('show-bar').checked ? 'block' : 'none';
    numericDisplay.style.display = document.getElementById('show-num').checked ? 'block' : 'none';

    imgDisplay.src = URL.createObjectURL(sessionImages[currentIndex]);
    runTimer(duration);
}

function runTimer(duration) {
    updateTimerUI(duration);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI(duration);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (document.getElementById('enable-sound').checked) {
                document.getElementById('ping-sound').play().catch(() => {});
            }
            currentIndex++;
            loadNextImage();
        }
    }, 1000);
}

function updateTimerUI(max) {
    numericDisplay.innerText = timeLeft;
    progressBar.style.width = `${(timeLeft / max) * 100}%`;
}

function endSession() {
    clearInterval(timerInterval);
    showView('results');

    // Update Lifetime Stats
    stats.sessions++;
    stats.images += sessionImages.length;
    stats.time += totalSessionTime;
    localStorage.setItem('sketchStats', JSON.stringify(stats));

    // Populate Gallery
    const gallery = document.getElementById('results-gallery');
    gallery.innerHTML = '';
    gallery.dataset.count = sessionImages.length;

    sessionImages.forEach(file => {
        const img = document.createElement('img');
        const url = URL.createObjectURL(file);
        img.src = url;
        img.onclick = () => window.open(url, '_blank');
        gallery.appendChild(img);
    });

    // Populate Stats Text
    document.getElementById('session-stats-text').innerText = 
        `Images: ${sessionImages.length} | Time: ${Math.floor(totalSessionTime/60)}m ${totalSessionTime%60}s`;
    
    document.getElementById('lifetime-stats-text').innerText = 
        `Total Sessions: ${stats.sessions} | Total Images: ${stats.images} | Total Time: ${Math.floor(stats.time/60)}m`;
}

document.getElementById('btn-restart').addEventListener('click', () => showView('index'));