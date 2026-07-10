// Self-running hero demo: types code, "runs" Explain, streams a reply, loops.
(function () {
  const codeEl = document.getElementById('demo-code');
  const caretEl = document.getElementById('demo-caret');
  const resultEl = document.getElementById('demo-result');
  const buttons = Array.from(document.querySelectorAll('.demo-btn'));
  if (!codeEl || !resultEl) return;

  const CODE = [
    'function debounce(fn, ms) {',
    '  let t;',
    '  return (...args) => {',
    '    clearTimeout(t);',
    '    t = setTimeout(() => fn(...args), ms);',
    '  };',
    '}',
  ].join('\n');

  const ANSWER =
    'JavaScript. This is a debounce helper. It returns a wrapped ' +
    'function that delays calling fn until ms milliseconds have ' +
    'passed since the last call — each new call cancels the pending ' +
    'one. Great for search inputs, resize, and scroll handlers.';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setActive(name) {
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.demo === name));
  }

  async function typeCode() {
    codeEl.textContent = '';
    caretEl.style.display = 'inline-block';
    for (let i = 0; i < CODE.length; i++) {
      codeEl.textContent += CODE[i];
      if (!prefersReduced) await sleep(CODE[i] === '\n' ? 60 : 18);
    }
    caretEl.style.display = 'none';
  }

  async function streamAnswer() {
    resultEl.textContent = '';
    resultEl.classList.add('streaming');
    const words = ANSWER.split(' ');
    for (let i = 0; i < words.length; i++) {
      resultEl.textContent += (i ? ' ' : '') + words[i];
      if (!prefersReduced) await sleep(38);
    }
    resultEl.classList.remove('streaming');
  }

  async function run() {
    for (;;) {
      setActive(null);
      resultEl.textContent = '';
      await typeCode();
      await sleep(500);
      setActive('explain');
      await sleep(450);
      await streamAnswer();
      if (prefersReduced) return; // show one static pass, no loop
      await sleep(4200);
    }
  }

  run();
})();
