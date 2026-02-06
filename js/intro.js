
const introCanvas = document.getElementById('intro-canvas');
const introCtx = introCanvas.getContext('2d');
let particles = [];
const particleCount = 400;
const introDuration = 3000;
let startTime;

function resizeCanvas() {
    introCanvas.width = window.innerWidth;
    introCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        // Random start position from outer edges
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // Top
            this.x = Math.random() * introCanvas.width;
            this.y = -50;
        } else if (side === 1) { // Right
            this.x = introCanvas.width + 50;
            this.y = Math.random() * introCanvas.height;
        } else if (side === 2) { // Bottom
            this.x = Math.random() * introCanvas.width;
            this.y = introCanvas.height + 50;
        } else { // Left
            this.x = -50;
            this.y = Math.random() * introCanvas.height;
        }

        // Target: Center forming a grid
        const centerX = introCanvas.width / 2;
        const centerY = introCanvas.height / 2;
        const gridSize = 10;
        const cols = 20;
        const index = particles.length % (cols * cols);
        this.targetX = centerX - (cols * gridSize) / 2 + (index % cols) * gridSize;
        this.targetY = centerY - (cols * gridSize) / 2 + Math.floor(index / cols) * gridSize;

        this.size = Math.random() * 2 + 2;
        this.speed = 0.02 + Math.random() * 0.05;
        this.color1 = '#667eea';
        this.color2 = '#764ba2';
    }

    update(progress) {
        // Ease In Out Cubic
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        this.currentX = this.x + (this.targetX - this.x) * ease;
        this.currentY = this.y + (this.targetY - this.y) * ease;
    }

    draw() {
        const gradient = introCtx.createLinearGradient(this.currentX, this.currentY, this.currentX + this.size, this.currentY + this.size);
        gradient.addColorStop(0, this.color1);
        gradient.addColorStop(1, this.color2);

        introCtx.fillStyle = gradient;
        introCtx.beginPath();
        introCtx.rect(this.currentX, this.currentY, this.size, this.size);
        introCtx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / introDuration, 1);

    introCtx.clearRect(0, 0, introCanvas.width, introCanvas.height);

    particles.forEach(p => {
        p.update(progress);
        p.draw();
    });

    if (progress < 1) {
        requestAnimationFrame(animate);
    } else {
        setTimeout(finishIntro, 1000);
    }
}

function finishIntro() {
    const intro = document.getElementById('intro-container');
    if (intro) {
        intro.style.transition = 'opacity 0.8s ease, transform 1s ease';
        intro.style.opacity = '0';
        intro.style.transform = 'scale(1.1)';
        document.body.classList.remove('intro-active');
        setTimeout(() => {
            intro.style.display = 'none';
        }, 800);
    }
}

// Global click event to redirect to aq.gy
document.getElementById('intro-container').addEventListener('click', () => {
    window.location.href = 'http://aq.gy';
});

initParticles();
requestAnimationFrame(animate);
