const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, 'index.html');
const content = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('No <script> tag found!');
  process.exit(1);
}

const jsCode = scriptMatch[1];

// DOM Mocking Sandbox
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  window: {
    addEventListener: () => {},
    AudioContext: function() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
      this.resume = () => {};
      this.createOscillator = () => ({
        type: '',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      });
      this.createGain = () => ({
        gain: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {}
      });
    }
  },
  document: {
    documentElement: {
      setAttribute: () => {},
      getAttribute: () => 'light'
    },
    getElementById: (id) => ({
      id,
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      style: {},
      textContent: '',
      value: ''
    }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; }
  }
};

try {
  vm.createContext(sandbox);
  // Expose consts to sandbox global
  const wrappedCode = jsCode + '\nglobalThis.AppState = AppState;\nglobalThis.TimerEngine = TimerEngine;\nglobalThis.StorageEngine = StorageEngine;\nglobalThis.UIController = UIController;';
  vm.runInContext(wrappedCode, sandbox);
  console.log('✅ JavaScript Syntax & Initialization Test: PASSED');

  // Logic Unit Tests
  const { AppState, TimerEngine, StorageEngine } = sandbox;

  // Test 1: Timer Presets
  TimerEngine.init();
  if (AppState.timer.totalSeconds !== 180 || AppState.timer.remainingSeconds !== 180) {
    throw new Error('Default preset initialization failed');
  }
  console.log('✅ Test 1 (Timer Initial Preset 3min): PASSED');

  // Test 2: Preset Switch
  TimerEngine.selectPreset('recess10');
  if (AppState.timer.remainingSeconds !== 600 || !AppState.timer.isBreathingMode) {
    throw new Error('Preset recess10 switch failed');
  }
  console.log('✅ Test 2 (Preset Recess 10min): PASSED');

  // Test 3: Storage Engine
  StorageEngine.load();
  if (!Array.isArray(AppState.todos) || AppState.todos.length === 0) {
    throw new Error('Storage default todos load failed');
  }
  console.log('✅ Test 3 (Storage Todos Default Load): PASSED');

  // Test 4: Timer Minute Adjustment & Edge Case (No negative time)
  TimerEngine.selectPreset('breath3'); // 180s (3m)
  TimerEngine.adjustMinutes(-5); // should be clamped to at least 60s
  if (AppState.timer.remainingSeconds < 60) {
    throw new Error('Timer clamp failed on negative reduction: ' + AppState.timer.remainingSeconds);
  }
  TimerEngine.adjustMinutes(2); // +2m = 180s
  if (AppState.timer.remainingSeconds !== 180) {
    throw new Error('Timer adjustMinutes(+2) failed: ' + AppState.timer.remainingSeconds);
  }
  console.log('✅ Test 4 (Timer Minute Adjustment & Boundary Defense): PASSED');

  // Test 5: UIController Escape HTML (XSS Defense)
  const escapeHtml = sandbox.UIController.escapeHtml;
  const rawInput = '<script>alert("xss")</script>&"test"';
  const escaped = escapeHtml(rawInput);
  if (escaped.includes('<script>') || escaped.includes('"test"')) {
    throw new Error('XSS Escape HTML failed: ' + escaped);
  }
  console.log('✅ Test 5 (XSS Defense Sanitize): PASSED');

  console.log('\n🎉 ALL RIGOROUS TESTS PASSED SUCCESSFULLY!');
} catch (err) {
  console.error('❌ Verification failed:', err);
  process.exit(1);
}
