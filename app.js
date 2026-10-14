/**
 * LuckySpin 9 - Non-Repeating Wheel Spinner
 * Architecture:
 * - State Management & LocalStorage Persistence
 * - High-DPI HTML5 Canvas Wheel Renderer with Outer LED Bezel
 * - Physics Spin Engine with Realistic Deceleration
 * - Web Audio API Synthesizer (Mechanical Ticks & Fanfare)
 * - Custom Particle Confetti Physics
 * - Full Keyboard & Touch Accessibility
 */

(() => {
  'use strict';

  // --- Preset 9 Default Names ---
  const DEFAULT_9_NAMES = [
    'Liam Chen',
    'Sophia Rodriguez',
    'Noah Patel',
    'Emma Watson',
    'Ethan Kim',
    'Olivia Davis',
    'Lucas Miller',
    'Maya Tanaka',
    'Aiden Brooks'
  ];

  // Distinct jewel / cyber-neon color palettes for segments
  const SLICE_COLORS = [
    { bg: '#e11d48', gradient: ['#f43f5e', '#be123c'], text: '#ffffff' }, // Rose Ruby
    { bg: '#7c3aed', gradient: ['#8b5cf6', '#6d28d9'], text: '#ffffff' }, // Royal Violet
    { bg: '#059669', gradient: ['#10b981', '#047857'], text: '#ffffff' }, // Emerald
    { bg: '#d97706', gradient: ['#f59e0b', '#b45309'], text: '#ffffff' }, // Gold Amber
    { bg: '#0891b2', gradient: ['#06b6d4', '#0e7490'], text: '#ffffff' }, // Cyan
    { bg: '#4f46e5', gradient: ['#6366f1', '#4338ca'], text: '#ffffff' }, // Indigo
    { bg: '#db2777', gradient: ['#ec4899', '#be185d'], text: '#ffffff' }, // Hot Pink
    { bg: '#65a30d', gradient: ['#84cc16', '#4d7c0f'], text: '#ffffff' }, // Lime Green
    { bg: '#ea580c', gradient: ['#f97316', '#c2410c'], text: '#ffffff' }  // Sunset Orange
  ];

  // --- Application State ---
  const state = {
    allNames: [],          // [{ id, name, colorIndex }]
    remainingIds: [],      // Array of ids still in the wheel
    drawnHistory: [],      // [{ id, name, rank, timestamp }]
    isSpinning: false,
    currentRotation: 0,    // in radians
    soundEnabled: true,
    roundNumber: 1,
    lastTickIndex: -1
  };

  // --- DOM Elements Cache ---
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spinBtn');
  const spinActionBtn = document.getElementById('spinActionBtn');
  const hubSubtext = document.getElementById('hubSubtext');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const resetPoolBtn = document.getElementById('resetPoolBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');
  
  const tickerFlapper = document.getElementById('tickerFlapper');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const remainingCountBadge = document.getElementById('remainingCountBadge');
  const roundStatusBadge = document.getElementById('roundStatusBadge');
  const latestWinnerStrip = document.getElementById('latestWinnerStrip');
  const latestWinnerName = document.getElementById('latestWinnerName');
  const latestWinnerTag = document.getElementById('latestWinnerTag');

  const tabRosterBtn = document.getElementById('tabRosterBtn');
  const tabHistoryBtn = document.getElementById('tabHistoryBtn');
  const tabRoster = document.getElementById('tabRoster');
  const tabHistory = document.getElementById('tabHistory');
  const totalNamesCounter = document.getElementById('totalNamesCounter');
  const drawnHistoryCounter = document.getElementById('drawnHistoryCounter');
  const activeCandidatesCount = document.getElementById('activeCandidatesCount');

  const addNameForm = document.getElementById('addNameForm');
  const nameInput = document.getElementById('nameInput');
  const loadPresetsBtn = document.getElementById('loadPresetsBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const namesList = document.getElementById('namesList');

  const historyTimeline = document.getElementById('historyTimeline');
  const emptyHistoryMsg = document.getElementById('emptyHistoryMsg');
  const exportHistoryBtn = document.getElementById('exportHistoryBtn');

  const winnerModal = document.getElementById('winnerModal');
  const winnerRankText = document.getElementById('winnerRankText');
  const modalWinnerName = document.getElementById('modalWinnerName');
  const modalWinnerNote = document.getElementById('modalWinnerNote');
  const modalRemainingCount = document.getElementById('modalRemainingCount');
  const modalCompletedCount = document.getElementById('modalCompletedCount');
  const continueSpinBtn = document.getElementById('continueSpinBtn');

  const roundCompleteModal = document.getElementById('roundCompleteModal');
  const grandOrderList = document.getElementById('grandOrderList');
  const startNewRoundBtn = document.getElementById('startNewRoundBtn');

  const toast = document.getElementById('toast');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const confettiCtx = confettiCanvas.getContext('2d');

  // --- Web Audio API Synthesizer ---
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playTick(velocity = 1) {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Synthetic crisp flapper click
        const baseFreq = 950 + Math.min(velocity * 80, 500);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.025);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.025);
      } catch (e) {
        // Ignore audio errors if blocked
      }
    }

    playWinnerChord() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        // Major triad chime: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 1.3);
        });
      } catch (e) {
        // Ignore audio errors
      }
    }

    playGrandFanfare() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const chords = [
          [523.25, 659.25, 783.99],          // C Major
          [587.33, 739.99, 880.00],          // D Major
          [659.25, 830.61, 987.77],          // E Major
          [1046.50, 1318.51, 1567.98]        // High C Victory
        ];

        chords.forEach((chord, cIdx) => {
          const startTime = now + cIdx * 0.22;
          chord.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.85);
          });
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  const audio = new SoundFX();

  // --- Confetti Particle System ---
  class ConfettiEngine {
    constructor(canvasEl) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.particles = [];
      this.animId = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    burst(x = window.innerWidth / 2, y = window.innerHeight / 2.5, count = 110) {
      const colors = ['#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#ffd700'];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 14 + 6;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 6 + 2),
          size: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          wobble: 0,
          wobbleSpeed: Math.random() * 0.1 + 0.05,
          alpha: 1,
          decay: Math.random() * 0.008 + 0.006,
          shape: Math.random() > 0.3 ? 'rect' : 'circle'
        });
      }

      if (!this.animId) {
        this.loop();
      }
    }

    loop() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // air drag
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > this.canvas.height + 20) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.scale(Math.cos(p.wobble), 1);
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }

        this.ctx.restore();
      }

      if (this.particles.length > 0) {
        this.animId = requestAnimationFrame(() => this.loop());
      } else {
        this.animId = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  const confetti = new ConfettiEngine(confettiCanvas);

  // --- Storage & Initialization ---
  function initApp() {
    loadSavedState();

    // Setup High-DPI canvas
    setupCanvas();

    // Event Listeners
    setupEventListeners();

    // Initial render
    renderWheel();
    renderUI();
  }

  function loadSavedState() {
    try {
      const saved = localStorage.getItem('luckyspin_state_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.allNames = parsed.allNames || [];
        state.remainingIds = parsed.remainingIds || [];
        state.drawnHistory = parsed.drawnHistory || [];
        state.roundNumber = parsed.roundNumber || 1;
        state.soundEnabled = parsed.soundEnabled ?? true;
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }

    // Default to 9 sample names if none saved
    if (!state.allNames || state.allNames.length === 0) {
      loadDefaultNames();
    } else if (state.remainingIds.length === 0 && state.drawnHistory.length === 0 && state.allNames.length > 0) {
      state.remainingIds = state.allNames.map(n => n.id);
    }

    updateSoundUI();
  }

  function saveState() {
    try {
      localStorage.setItem('luckyspin_state_v1', JSON.stringify({
        allNames: state.allNames,
        remainingIds: state.remainingIds,
        drawnHistory: state.drawnHistory,
        roundNumber: state.roundNumber,
        soundEnabled: state.soundEnabled
      }));
    } catch (e) {
      // LocalStorage quota or privacy mode error
    }
  }

  function loadDefaultNames() {
    state.allNames = DEFAULT_9_NAMES.map((name, index) => ({
      id: 'candidate_' + Date.now() + '_' + index,
      name,
      colorIndex: index % SLICE_COLORS.length
    }));
    state.remainingIds = state.allNames.map(n => n.id);
    state.drawnHistory = [];
    state.roundNumber = 1;
    saveState();
  }

  // --- Canvas Setup & High DPI Support ---
  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const size = 560;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
  }

  // --- Wheel Rendering Engine ---
  function renderWheel() {
    const size = 560;
    const center = size / 2;
    const radius = center - 16;
    const innerRadius = 55; // room for central spin hub

    ctx.clearRect(0, 0, size, size);

    // Get active candidates currently remaining in the wheel
    const activeCandidates = state.allNames.filter(c => state.remainingIds.includes(c.id));
    const count = activeCandidates.length;

    // Outer Bezel: Metallic dark gold rim with LED lights
    drawOuterBezel(center, radius);

    if (count === 0) {
      // Wheel empty / round finished state
      drawEmptyWheelState(center, radius, innerRadius);
      return;
    }

    const sliceAngle = (Math.PI * 2) / count;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(state.currentRotation);

    // 1. Draw segment slices with rich gradients
    for (let i = 0; i < count; i++) {
      const candidate = activeCandidates[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const colorScheme = SLICE_COLORS[candidate.colorIndex % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 14, startAngle, endAngle);
      ctx.closePath();

      // Create radial segment gradient for depth
      const grad = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, radius);
      grad.addColorStop(0, colorScheme.gradient[0]);
      grad.addColorStop(0.85, colorScheme.gradient[1]);
      grad.addColorStop(1, '#0f172a');

      ctx.fillStyle = grad;
      ctx.fill();

      // Delicate slice border
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();

      // Slice inner highlight
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.arc(0, 0, radius - 14, startAngle, endAngle);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw segment candidate names & icons
    for (let i = 0; i < count; i++) {
      const candidate = activeCandidates[i];
      const midAngle = i * sliceAngle + sliceAngle / 2;
      const colorScheme = SLICE_COLORS[candidate.colorIndex % SLICE_COLORS.length];

      ctx.save();
      ctx.rotate(midAngle);

      // Candidate text alignment
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      // Dynamic font sizing depending on count and name length
      let fontSize = 17;
      if (count > 7) fontSize = 15;
      if (candidate.name.length > 14) fontSize = 13.5;

      ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Draw Candidate text along radius
      const textRadius = radius - 36;
      const truncatedName = truncateText(candidate.name, 18);
      ctx.fillText(truncatedName, textRadius, 0);

      // Draw subtle segment index pill or star near the inner hub
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`•`, innerRadius + 22, 0);

      ctx.restore();
    }

    // 3. Draw metallic brass peg pins at each slice boundary
    for (let i = 0; i < count; i++) {
      const pegAngle = i * sliceAngle;
      const pegX = Math.cos(pegAngle) * (radius - 14);
      const pegY = Math.sin(pegAngle) * (radius - 14);

      ctx.beginPath();
      ctx.arc(pegX, pegY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#6b4f00';
      ctx.stroke();

      // Pin specular highlight
      ctx.beginPath();
      ctx.arc(pegX - 1.2, pegY - 1.2, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();

    // 4. Center cutout border ring (behind the HTML hub button)
    ctx.beginPath();
    ctx.arc(center, center, innerRadius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw metallic rim and surrounding animated LED bulbs
  function drawOuterBezel(center, radius) {
    // Outer casing ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    const rimGrad = ctx.createLinearGradient(0, 0, center * 2, center * 2);
    rimGrad.addColorStop(0, '#2d3748');
    rimGrad.addColorStop(0.3, '#1a202c');
    rimGrad.addColorStop(0.7, '#4a5568');
    rimGrad.addColorStop(1, '#1a202c');
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // Outer subtle gold accent wire
    ctx.beginPath();
    ctx.arc(center, center, radius + 7, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.stroke();

    // LED bulbs on the rim (24 lights)
    const ledCount = 24;
    const ledAngleStep = (Math.PI * 2) / ledCount;
    const now = Date.now() / 150;

    for (let i = 0; i < ledCount; i++) {
      const ledAngle = i * ledAngleStep;
      const lx = center + Math.cos(ledAngle) * (radius + 0.5);
      const ly = center + Math.sin(ledAngle) * (radius + 0.5);

      const isLit = state.isSpinning 
        ? Math.floor(now + i) % 2 === 0 
        : i % 2 === 0;

      ctx.beginPath();
      ctx.arc(lx, ly, 3.2, 0, Math.PI * 2);

      if (isLit) {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
  }

  function drawEmptyWheelState(center, radius, innerRadius) {
    ctx.beginPath();
    ctx.arc(center, center, radius - 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = '800 20px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALL 9 NAMES DRAWN!', center, center - 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Click "Reset Pool" to start a new round', center, center + 24);
  }

  function truncateText(str, max) {
    if (str.length <= max) return str;
    return str.substring(0, max - 1) + '…';
  }

  // --- Spin Mechanics & Non-Repeating Algorithm ---
  function spinWheel() {
    if (state.isSpinning) return;

    const activeCandidates = state.allNames.filter(c => state.remainingIds.includes(c.id));
    if (activeCandidates.length === 0) {
      showToast('All names have been selected! Please reset the pool.');
      return;
    }

    audio.init();

    state.isSpinning = true;
    updateSpinButtonStates(true);

    const count = activeCandidates.length;
    const sliceAngle = (Math.PI * 2) / count;

    // 1. Pick a random winner from currently remaining candidates
    const winningIndex = Math.floor(Math.random() * count);
    const winnerCandidate = activeCandidates[winningIndex];

    // 2. Physics Angle Math:
    // The pointer ticker is positioned at the top of the wheel (270 degrees or -pi/2).
    // In wheel coordinates, a point at angle theta aligns with the top pointer when:
    //   (currentRotation + sliceMidAngle) === -PI/2 (modulo 2PI)
    // Slice `i` occupies: [i * sliceAngle, (i + 1) * sliceAngle].
    // Target slice midpoint inside segment:
    const randomSubSliceOffset = (Math.random() * 0.7 + 0.15) * sliceAngle;
    const targetSliceAngle = winningIndex * sliceAngle + randomSubSliceOffset;

    // Pointer is at Top: -PI/2 (or 3*PI/2)
    const pointerAngle = -Math.PI / 2;

    // Solve for target final rotation:
    // targetRotation + targetSliceAngle = pointerAngle + 2*PI*K
    const fullSpins = 6 + Math.floor(Math.random() * 3); // 6 to 8 full revolutions
    const normalizedTarget = pointerAngle - targetSliceAngle;
    
    // Ensure we always rotate in forward positive direction
    let targetRotation = state.currentRotation + (fullSpins * Math.PI * 2);
    // Align with the normalized target angle modulo 2PI
    const currentModulo = targetRotation % (Math.PI * 2);
    const diff = (normalizedTarget - currentModulo + (Math.PI * 4)) % (Math.PI * 2);
    targetRotation += diff;

    // Spin animation variables
    const startRotation = state.currentRotation;
    const totalRotationDelta = targetRotation - startRotation;
    const duration = 5400; // 5.4 seconds for suspense
    const startTime = performance.now();

    state.lastTickIndex = -1;

    // Ease-out Quartic function for dramatic suspenseful deceleration
    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function animateSpin(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutQuart(progress);

      state.currentRotation = startRotation + totalRotationDelta * ease;

      // Handle ticker flapper collisions with pegs
      checkTickerCollision(count, sliceAngle, progress);

      // Re-render wheel
      renderWheel();

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        // Spin finished!
        finalizeSpin(winnerCandidate);
      }
    }

    requestAnimationFrame(animateSpin);
  }

  function checkTickerCollision(count, sliceAngle, progress) {
    if (count <= 0) return;

    // Calculate peg passings under the pointer (-PI/2)
    const pointerAngle = -Math.PI / 2;
    const relAngle = (pointerAngle - state.currentRotation) % (Math.PI * 2);
    const normalizedRelAngle = (relAngle + Math.PI * 4) % (Math.PI * 2);
    const currentPegIndex = Math.floor(normalizedRelAngle / sliceAngle);

    if (currentPegIndex !== state.lastTickIndex) {
      state.lastTickIndex = currentPegIndex;

      // Visual flapper bounce
      tickerFlapper.classList.remove('tick-hit');
      void tickerFlapper.offsetWidth; // trigger reflow
      tickerFlapper.classList.add('tick-hit');

      // Audio tick
      const speedFactor = 1 - progress;
      audio.playTick(speedFactor);
    }
  }

  // Handle winner selection, removal from remaining pool, and modal trigger
  function finalizeSpin(winner) {
    state.isSpinning = false;
    updateSpinButtonStates(false);

    // 1. Remove winner from remaining pool (NON-REPEATING LOGIC)
    state.remainingIds = state.remainingIds.filter(id => id !== winner.id);

    // 2. Add to draw history with Day number and date/time
    const pickRank = state.drawnHistory.length + 1;
    const now = new Date();
    const formattedDate = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const historyEntry = {
      id: winner.id,
      name: winner.name,
      rank: pickRank,
      dayNumber: pickRank,
      dayLabel: `Day ${pickRank} of ${state.allNames.length}`,
      dateStr: formattedDate,
      timeStr: formattedTime,
      timestamp: `${formattedDate} • ${formattedTime}`,
      isoTime: now.toISOString(),
      round: state.roundNumber
    };
    state.drawnHistory.push(historyEntry);

    // Save state
    saveState();

    // 3. Update HUD & Roster UI
    renderUI();
    renderWheel();

    // 4. Trigger celebration audio & confetti
    audio.playWinnerChord();
    confetti.burst(window.innerWidth / 2, window.innerHeight * 0.38, 110);

    // 5. Check if round is completely finished (all 9 names drawn)
    if (state.remainingIds.length === 0) {
      setTimeout(() => {
        showGrandCelebrationModal();
      }, 700);
    } else {
      // Show winner popup
      setTimeout(() => {
        showWinnerModal(winner, pickRank);
      }, 450);
    }
  }

  // --- UI Update & Rendering ---
  function renderUI() {
    const totalNames = state.allNames.length;
    const remainingCount = state.remainingIds.length;
    const drawnCount = state.drawnHistory.length;

    // Progress Bar
    const progressPercent = totalNames > 0 ? (drawnCount / totalNames) * 100 : 0;
    progressBar.style.width = `${progressPercent}%`;
    progressText.textContent = `${drawnCount} of ${totalNames} Picked`;

    // Badges
    remainingCountBadge.textContent = `${remainingCount} Remaining`;
    if (remainingCount === 0 && totalNames > 0) {
      roundStatusBadge.textContent = 'Round Complete!';
      roundStatusBadge.className = 'status-pill finished';
      hubSubtext.textContent = 'DONE';
    } else {
      roundStatusBadge.textContent = `Round ${state.roundNumber}`;
      roundStatusBadge.className = 'status-pill active';
      hubSubtext.textContent = 'READY';
    }

    // Counters
    totalNamesCounter.textContent = totalNames;
    drawnHistoryCounter.textContent = drawnCount;
    activeCandidatesCount.textContent = remainingCount;

    // Daily Streak Badge in Status Bar
    const dailyStreakBadge = document.getElementById('dailyStreakBadge');
    if (dailyStreakBadge) {
      if (remainingCount === 0 && totalNames > 0) {
        dailyStreakBadge.textContent = 'All 9 Days Done!';
        dailyStreakBadge.className = 'status-pill finished';
      } else {
        const nextDayNum = drawnCount + 1;
        dailyStreakBadge.textContent = `Day ${nextDayNum} of ${totalNames}`;
        dailyStreakBadge.className = 'status-pill active';
      }
    }

    // Latest winner strip
    if (state.drawnHistory.length > 0) {
      const lastWinner = state.drawnHistory[state.drawnHistory.length - 1];
      latestWinnerName.textContent = lastWinner.name;
      const dayLabel = lastWinner.dayLabel || `Day ${lastWinner.rank}`;
      latestWinnerTag.textContent = `${dayLabel} (${lastWinner.timestamp})`;
    } else {
      latestWinnerName.textContent = '— None yet —';
      latestWinnerTag.textContent = 'Waiting for Day 1 spin';
    }

    // Render Candidate Roster List
    renderRosterList();

    // Render Timeline History
    renderHistoryTimeline();
  }

  function renderRosterList() {
    namesList.innerHTML = '';

    if (state.allNames.length === 0) {
      namesList.innerHTML = `
        <div class="empty-history" style="padding: 2rem 1rem;">
          <p>No candidates in the list</p>
          <span>Click "Load 9 Defaults" or add names above.</span>
        </div>
      `;
      return;
    }

    state.allNames.forEach((candidate, idx) => {
      const isRemaining = state.remainingIds.includes(candidate.id);
      const colorScheme = SLICE_COLORS[candidate.colorIndex % SLICE_COLORS.length];
      
      const item = document.createElement('div');
      item.className = `candidate-item ${isRemaining ? '' : 'drawn'}`;

      const drawnInfo = state.drawnHistory.find(h => h.id === candidate.id);
      const dayText = drawnInfo ? (drawnInfo.dayLabel || `Day ${drawnInfo.rank}`) : '';
      const statusText = isRemaining ? 'In Wheel' : `${dayText}`;
      const statusClass = isRemaining ? 'in-pool' : 'drawn';

      item.innerHTML = `
        <div class="candidate-info">
          <span class="candidate-color-dot" style="color: ${colorScheme.gradient[0]}; background-color: ${colorScheme.gradient[0]};"></span>
          <span class="candidate-name" title="${candidate.name}">${candidate.name}</span>
        </div>
        <div class="candidate-actions">
          <span class="candidate-status-badge ${statusClass}">${statusText}</span>
          <button class="item-del-btn" data-id="${candidate.id}" title="Delete Candidate" aria-label="Delete ${candidate.name}">
            <svg class="icon small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Delete listener
      const delBtn = item.querySelector('.item-del-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCandidate(candidate.id);
      });

      namesList.appendChild(item);
    });
  }

  function renderHistoryTimeline() {
    historyTimeline.innerHTML = '';

    if (state.drawnHistory.length === 0) {
      historyTimeline.appendChild(emptyHistoryMsg);
      return;
    }

    // Render in reverse chronological order (latest on top)
    const reversed = [...state.drawnHistory].reverse();
    reversed.forEach(entry => {
      const el = document.createElement('div');
      el.className = 'history-entry';
      el.innerHTML = `
        <div class="history-entry-main">
          <span class="history-rank">#${entry.rank}</span>
          <div class="history-entry-details">
            <span class="history-winner-name">${entry.name}</span>
            <span class="history-day-tag">${entry.dayLabel || 'Day ' + entry.rank}</span>
          </div>
        </div>
        <span class="history-timestamp">${entry.timestamp}</span>
      `;
      historyTimeline.appendChild(el);
    });
  }

  // --- Modals ---
  function showWinnerModal(winner, rank) {
    winnerRankText.textContent = `Selected #${rank}`;
    modalWinnerName.textContent = winner.name;
    modalRemainingCount.textContent = state.remainingIds.length;
    modalCompletedCount.textContent = state.drawnHistory.length;

    modalWinnerNote.textContent = state.remainingIds.length > 0
      ? `"${winner.name}" is now removed from future spins until all other names have been drawn.`
      : `That was the final candidate! All names have now been selected.`;

    winnerModal.classList.add('show');
    winnerModal.setAttribute('aria-hidden', 'false');
  }

  function hideWinnerModal() {
    winnerModal.classList.remove('show');
    winnerModal.setAttribute('aria-hidden', 'true');
  }

  function showGrandCelebrationModal() {
    audio.playGrandFanfare();
    confetti.burst(window.innerWidth / 2, window.innerHeight * 0.4, 200);

    grandOrderList.innerHTML = '';
    state.drawnHistory.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'podium-item';
      item.innerHTML = `
        <span class="podium-rank">#${entry.rank}</span>
        <span class="podium-name">${entry.name}</span>
      `;
      grandOrderList.appendChild(item);
    });

    roundCompleteModal.classList.add('show');
    roundCompleteModal.setAttribute('aria-hidden', 'false');
  }

  function hideGrandCelebrationModal() {
    roundCompleteModal.classList.remove('show');
    roundCompleteModal.setAttribute('aria-hidden', 'true');
  }

  // --- Actions & Helpers ---
  function updateSpinButtonStates(spinning) {
    spinBtn.disabled = spinning;
    spinActionBtn.disabled = spinning;
    shuffleBtn.disabled = spinning;
    resetPoolBtn.disabled = spinning;
    
    if (spinning) {
      hubSubtext.textContent = 'SPINNING';
    } else {
      hubSubtext.textContent = state.remainingIds.length > 0 ? 'READY' : 'DONE';
    }
  }

  function addCandidate(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (state.allNames.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`"${trimmed}" is already in the list!`);
      return;
    }

    const newCandidate = {
      id: 'candidate_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: trimmed,
      colorIndex: state.allNames.length % SLICE_COLORS.length
    };

    state.allNames.push(newCandidate);
    state.remainingIds.push(newCandidate.id);
    saveState();

    renderUI();
    renderWheel();
    showToast(`Added "${trimmed}" to the wheel!`);
  }

  function deleteCandidate(id) {
    if (state.isSpinning) return;

    const candidate = state.allNames.find(c => c.id === id);
    state.allNames = state.allNames.filter(c => c.id !== id);
    state.remainingIds = state.remainingIds.filter(rId => rId !== id);
    state.drawnHistory = state.drawnHistory.filter(h => h.id !== id);

    // Re-adjust color indexes
    state.allNames.forEach((c, i) => c.colorIndex = i % SLICE_COLORS.length);

    saveState();
    renderUI();
    renderWheel();

    if (candidate) {
      showToast(`Removed "${candidate.name}"`);
    }
  }

  function resetRoundPool() {
    if (state.isSpinning) return;

    if (state.allNames.length === 0) {
      loadDefaultNames();
    } else {
      state.remainingIds = state.allNames.map(c => c.id);
      state.drawnHistory = [];
      state.roundNumber += 1;
    }

    saveState();
    renderUI();
    renderWheel();
    showToast(`Round reset! All ${state.allNames.length} names are back in the wheel.`);
  }

  function shuffleSlices() {
    if (state.isSpinning || state.remainingIds.length < 2) return;

    // Fisher-Yates shuffle on remainingIds
    for (let i = state.remainingIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.remainingIds[i], state.remainingIds[j]] = [state.remainingIds[j], state.remainingIds[i]];
    }

    saveState();
    renderWheel();
    showToast('Wheel order shuffled!');
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function updateSoundUI() {
    if (state.soundEnabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
      soundToggleBtn.setAttribute('title', 'Mute Sound Effects');
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
      soundToggleBtn.setAttribute('title', 'Unmute Sound Effects');
    }
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Spin Triggers
    spinBtn.addEventListener('click', () => spinWheel());
    spinActionBtn.addEventListener('click', () => spinWheel());

    // Keyboard trigger (Spacebar)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body && !state.isSpinning) {
        e.preventDefault();
        spinWheel();
      }
    });

    // Shuffle
    shuffleBtn.addEventListener('click', () => shuffleSlices());

    // Reset Pool
    resetPoolBtn.addEventListener('click', () => resetRoundPool());

    // Sound toggle
    soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      saveState();
      updateSoundUI();
      showToast(state.soundEnabled ? 'Sound enabled 🔊' : 'Sound muted 🔇');
    });

    // Tab Navigation
    tabRosterBtn.addEventListener('click', () => {
      tabRosterBtn.classList.add('active');
      tabHistoryBtn.classList.remove('active');
      tabRoster.classList.add('active');
      tabHistory.classList.remove('active');
    });

    tabHistoryBtn.addEventListener('click', () => {
      tabHistoryBtn.classList.add('active');
      tabRosterBtn.classList.remove('active');
      tabHistory.classList.add('active');
      tabRoster.classList.remove('active');
    });

    // Add Name Form
    addNameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = nameInput.value;
      if (val.trim()) {
        addCandidate(val);
        nameInput.value = '';
      }
    });

    // Load 9 Presets
    loadPresetsBtn.addEventListener('click', () => {
      loadDefaultNames();
      renderUI();
      renderWheel();
      showToast('Loaded 9 default candidate names!');
    });

    // Clear All
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all candidate names?')) {
        state.allNames = [];
        state.remainingIds = [];
        state.drawnHistory = [];
        saveState();
        renderUI();
        renderWheel();
        showToast('Roster cleared.');
      }
    });

    // Export / Copy History with Day tags
    exportHistoryBtn.addEventListener('click', () => {
      if (state.drawnHistory.length === 0) {
        showToast('No history to copy yet!');
        return;
      }

      const text = state.drawnHistory
        .map(h => `${h.dayLabel || 'Day ' + h.rank}: ${h.name} (${h.timestamp})`)
        .join('\n');

      navigator.clipboard.writeText(text).then(() => {
        showToast('9-Day Selection order copied to clipboard! 📋');
      }).catch(() => {
        showToast('Copied text!');
      });
    });

    // Backup & Restore Progress
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        const backupData = JSON.stringify({
          luckyspin_version: '1.0',
          allNames: state.allNames,
          remainingIds: state.remainingIds,
          drawnHistory: state.drawnHistory,
          roundNumber: state.roundNumber,
          soundEnabled: state.soundEnabled,
          exportedAt: new Date().toISOString()
        }, null, 2);

        navigator.clipboard.writeText(backupData).then(() => {
          showToast('Progress backup JSON copied to clipboard! 💾');
        }).catch(() => {
          showToast('Backup created!');
        });
      });
    }

    // Modals
    continueSpinBtn.addEventListener('click', () => {
      hideWinnerModal();
    });

    winnerModal.addEventListener('click', (e) => {
      if (e.target === winnerModal) hideWinnerModal();
    });

    startNewRoundBtn.addEventListener('click', () => {
      hideGrandCelebrationModal();
      resetRoundPool();
    });

    roundCompleteModal.addEventListener('click', (e) => {
      if (e.target === roundCompleteModal) hideGrandCelebrationModal();
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      setupCanvas();
      renderWheel();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
