# 🎡 LuckySpin 9 - Non-Repeating Name Selector Wheel

A state-of-the-art, luxury dark glassmorphism wheel spinner designed for picking from a pool of 9 names (or custom candidates) where **every selected name is eliminated from subsequent spins until all names have been drawn**.

---

## 🌟 Key Features

### 1. 🔄 Non-Repeating Selection Cycle
- **Pool Elimination**: As soon as a candidate is picked, they are celebrated with confetti and sound fanfare, then marked as **"Drawn"** and removed from the active wheel.
- **Dynamic Slice Recalculation**: The wheel automatically resizes remaining slices (9 slices $\to$ 8 $\to$ 7 $\to \dots \to$ 1) with even angles and vibrant jewel-tone color palettes.
- **Round Completion & Auto-Reset**: Once all 9 names have been drawn, a Grand Crown Celebration reveals the full draft/selection order (1st through 9th) with an option to start a brand new round.

### 2. 🎨 Luxury Cyber-Glassmorphism Visuals
- Deep space midnight theme (`#07090e`) with floating ambient radial aurora glow.
- Outer metallic gold bezel rim adorned with 24 animated LED bulbs that flash and pulse during spins.
- High-DPI canvas wheel renderer with crisp typography, slice drop shadows, and brass peg pins.
- Realistic spring flapper ticker at the top that physically recoils and twitches on peg contact.

### 3. 🔊 Integrated Web Audio API Synthesizer (Zero External Dependencies)
- **Mechanical Tick / Click**: Real-time synthesized clicks as pegs hit the flapper, adjusting in pitch and speed with wheel momentum.
- **Winner Fanfare**: Harmonious major chord chime when a winner lands.
- **Grand Victory Melody**: Multi-chord victory fanfare when the full 9-name cycle completes.
- **Mute / Unmute Toggle**: Preserved across reloads via `localStorage`.

### 4. 📋 Candidate Roster & Selection Timeline
- **Add / Remove**: Type any candidate name and hit `Add` or press <kbd>Enter</kbd>.
- **Quick Load Defaults**: One-click restore to 9 diverse default candidates.
- **Draw Order Tab**: Chronological timeline tracking each winner with pick rank and timestamp.
- **Export**: One-click copy results to clipboard formatted as a numbered draft list.
- **Keyboard Shortcut**: Press <kbd>Space</kbd> anywhere to trigger a spin.

---

## 🚀 Running the App

The web application is built with standard vanilla web technologies (HTML5, CSS3, ES6+ JavaScript) and requires no build step.

### Local Server
A local HTTP server is running on:
```text
http://localhost:8080
```

To run manually at any time:
```bash
# Python
python -m http.server 8080 --directory "c:\Users\Yatharth\code\spinner"

# Or Node.js
npx -y serve "c:\Users\Yatharth\code\spinner" -l 8080
```
Or simply double-click [index.html](file:///c:/Users/Yatharth/code/spinner/index.html) to run it directly in any modern web browser!

---

## 📁 File Structure
- [`index.html`](file:///c:/Users/Yatharth/code/spinner/index.html) - Semantic layout, HUD, canvas container, and celebration modals.
- [`style.css`](file:///c:/Users/Yatharth/code/spinner/style.css) - Design system, glassmorphism cards, responsive grid, and keyframes.
- [`app.js`](file:///c:/Users/Yatharth/code/spinner/app.js) - State machine, non-repeating algorithm, physics easing, Web Audio API, and confetti engine.
