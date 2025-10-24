var pose = null;
var camera = null;
var isRunning = false;
var count = 0;
var isInDownPosition = false;
var lastAngle = 180;
var detectionActive = false;

var video = document.getElementById('video');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var counter = document.getElementById('counter');
var positionStatus = document.getElementById('positionStatus');
var skeletonIndicator = document.getElementById('skeletonIndicator');
var angleDisplay = document.getElementById('angleDisplay');
var angleValue = document.getElementById('angleValue');
var errorDiv = document.getElementById('error');
var startBtn = document.getElementById('startBtn');
var stopBtn = document.getElementById('stopBtn');
var resetBtn = document.getElementById('resetBtn');

loadStats();

function calculateAngle(a, b, c) {
    var radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    var angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
}

function onResults(results) {
    if (!detectionActive) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (results.poseLandmarks) {
        skeletonIndicator.classList.add('active');
        angleDisplay.classList.add('active');

        if (window.drawConnectors) {
            window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
            window.drawLandmarks(ctx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2, radius: 6});
        }

        var rightShoulder = results.poseLandmarks[12];
        var rightElbow = results.poseLandmarks[14];
        var rightWrist = results.poseLandmarks[16];

        var elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        angleValue.textContent = Math.round(elbowAngle);

        if (elbowAngle < 100 && !isInDownPosition && lastAngle > 140) {
            isInDownPosition = true;
            positionStatus.className = 'position-status down';
            positionStatus.textContent = '⬇️ POSITION BASSE';
        } else if (elbowAngle > 160 && isInDownPosition) {
            isInDownPosition = false;
            count++;
            updateCounter();
            positionStatus.className = 'position-status up';
            positionStatus.textContent = '⬆️ POMPE VALIDÉE !';
            setTimeout(function() {
                positionStatus.className = 'position-status neutral';
                positionStatus.textContent = 'Prêt pour la suivante';
            }, 1000);
        } else if (elbowAngle > 140 && !isInDownPosition) {
            positionStatus.className = 'position-status neutral';
            positionStatus.textContent = 'Position haute - Descendez';
        }

        lastAngle = elbowAngle;
    } else {
        skeletonIndicator.classList.remove('active');
        angleDisplay.classList.remove('active');
        positionStatus.className = 'position-status neutral';
        positionStatus.textContent = 'Aucun corps détecté';
    }

    ctx.restore();
}

function startDetection() {
    errorDiv.classList.remove('active');
    
    pose = new window.Pose({
        locateFile: function(file) {
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);

    camera = new window.Camera(video, {
        onFrame: function() {
            if (isRunning) {
                pose.send({image: video});
            }
        },
        width: 640,
        height: 480
    });

    camera.start();
    isRunning = true;
    detectionActive = true;

    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
}

function stopDetection() {
    isRunning = false;
    detectionActive = false;
    
    if (camera) {
        camera.stop();
    }

    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    
    skeletonIndicator.classList.remove('active');
    angleDisplay.classList.remove('active');
    
    if (count > 0) {
        saveSession(count);
    }

    positionStatus.className = 'position-status neutral';
    positionStatus.textContent = 'Session terminée';
}

function updateCounter() {
    counter.textContent = count;
    counter.style.transform = 'scale(1.3)';
    setTimeout(function() {
        counter.style.transform = 'scale(1)';
    }, 200);
}

function resetCounter() {
    if (count > 0 && confirm('Sauvegarder cette session avant de réinitialiser ?')) {
        saveSession(count);
    }
    count = 0;
    isInDownPosition = false;
    counter.textContent = '0';
    positionStatus.className = 'position-status neutral';
    positionStatus.textContent = 'Compteur réinitialisé';
}

function saveSession(pushupCount) {
    var stats = JSON.parse(localStorage.getItem('pushup-stats') || '{"total":0,"sessions":[]}');
    
    stats.sessions.unshift({
        date: new Date().toISOString(),
        count: pushupCount
    });
    stats.sessions = stats.sessions.slice(0, 15);
    stats.total += pushupCount;
    
    localStorage.setItem('pushup-stats', JSON.stringify(stats));
    loadStats();
}

function loadStats() {
    var stats = JSON.parse(localStorage.getItem('pushup-stats') || '{"total":0,"sessions":[]}');
    
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('sessionCount').textContent = stats.sessions.length;
    
    if (stats.sessions.length > 0) {
        var record = Math.max.apply(Math, stats.sessions.map(function(s) { return s.count; }));
        document.getElementById('recordBox').style.display = 'block';
        document.getElementById('recordValue').textContent = record;
        
        var historyHTML = '';
        for (var i = 0; i < stats.sessions.length; i++) {
            var s = stats.sessions[i];
            var medal = s.count >= 50 ? '🏆' : s.count >= 30 ? '🥇' : s.count >= 20 ? '🥈' : '💪';
            historyHTML += '<div class="history-item"><div><div class="history-count">' + s.count + ' pompes</div><div class="history-date">' + formatDate(s.date) + '</div></div><div class="history-medal">' + medal + '</div></div>';
        }
        
        document.getElementById('historyList').innerHTML = historyHTML;
    }
}

function formatDate(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    
    return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short'
    });
}

startBtn.addEventListener('click', startDetection);
stopBtn.addEventListener('click', stopDetection);
resetBtn.addEventListener('click', resetCounter);
