// Variables globales
let isDetecting = false;
let count = 0;
let isDown = false;
let videoStream = null;
let previousFrame = null;
let animationId = null;

// Éléments DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const counter = document.getElementById('counter');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const errorMsg = document.getElementById('errorMsg');
const motionIndicator = document.getElementById('motionIndicator');
const positionIndicator = document.getElementById('positionIndicator');

// Chargement des stats au démarrage
loadStats();

// Event listeners
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
resetBtn.addEventListener('click', resetCount);

// Démarrer la caméra
async function startCamera() {
    try {
        errorMsg.style.display = 'none';
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        video.srcObject = videoStream;
        video.onloadedmetadata = () => {
            video.play();
            video.classList.add('active');
            cameraPlaceholder.style.display = 'none';
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            isDetecting = true;
            detectMotion();
        };
        
    } catch (err) {
        errorMsg.textContent = "Impossible d'accéder à la caméra. Vérifiez les permissions.";
        errorMsg.style.display = 'block';
        console.error(err);
    }
}

// Arrêter la caméra
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        video.classList.remove('active');
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    cameraPlaceholder.style.display = 'flex';
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    isDetecting = false;
    motionIndicator.classList.remove('active');
    positionIndicator.classList.remove('active');
    
    if (count > 0) {
        saveSession(count);
    }
}

// Détection de mouvement
function detectMotion() {
    if (!isDetecting) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (previousFrame) {
        const motion = calculateMotion(previousFrame, currentFrame);
        
        if (motion > 15) {
            motionIndicator.classList.add('active');
            
            if (!isDown && motion > 25) {
                isDown = true;
                positionIndicator.classList.add('active');
            } else if (isDown && motion > 25) {
                isDown = false;
                positionIndicator.classList.remove('active');
                count++;
                updateCounter();
            }
        } else {
            motionIndicator.classList.remove('active');
        }
    }
    
    previousFrame = currentFrame;
    animationId = requestAnimationFrame(detectMotion);
}

// Calculer le mouvement
function calculateMotion(prev, current) {
    let motion = 0;
    const step = 4;
    const threshold = 30;
    
    for (let i = 0; i < prev.data.length; i += step * 4) {
        const diff = Math.abs(prev.data[i] - current.data[i]);
        if (diff > threshold) {
            motion++;
        }
    }
    
    return motion / 1000;
}

// Mettre à jour le compteur
function updateCounter() {
    counter.textContent = count;
    counter.style.transform = 'scale(1.2)';
    setTimeout(() => {
        counter.style.transform = 'scale(1)';
    }, 200);
}

// Réinitialiser
function resetCount() {
    if (count > 0 && confirm('Sauvegarder cette session avant de réinitialiser ?')) {
        saveSession(count);
    }
    count = 0;
    isDown = false;
    updateCounter();
    positionIndicator.classList.remove('active');
}

// Sauvegarder une session
function saveSession(pushupCount) {
    const stats = JSON.parse(localStorage.getItem('pushup-stats') || '{"total":0,"sessions":[]}');
    
    const newSession = {
        date: new Date().toISOString(),
        count: pushupCount
    };
    
    stats.sessions.unshift(newSession);
    stats.sessions = stats.sessions.slice(0, 10);
    stats.total += pushupCount;
    
    localStorage.setItem('pushup-stats', JSON.stringify(stats));
    loadStats();
}

// Charger les statistiques
function loadStats() {
    const stats = JSON.parse(localStorage.getItem('pushup-stats') || '{"total":0,"sessions":[]}');
    
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('sessionCount').textContent = stats.sessions.length;
    
    // Record
    if (stats.sessions.length > 0) {
        const record = Math.max(...stats.sessions.map(s => s.count));
        document.getElementById('recordBox').style.display = 'flex';
        document.getElementById('recordValue').textContent = record + ' pompes';
    }
    
    // Historique
    const historyDiv = document.getElementById('history');
    
    if (stats.sessions.length === 0) {
        historyDiv.innerHTML = '<p class="empty-state">Aucune session enregistrée</p>';
    } else {
        historyDiv.innerHTML = stats.sessions.map(session => {
            const medal = session.count >= 50 ? '🏆' : session.count >= 30 ? '🥇' : session.count >= 20 ? '🥈' : '💪';
            return `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-count">${session.count} pompes</div>
                        <div class="history-date">${formatDate(session.date)}</div>
                    </div>
                    <div class="history-medal">${medal}</div>
                </div>
            `;
        }).join('');
    }
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    
    return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Transition smooth du compteur
counter.style.transition = 'transform 0.2s ease';