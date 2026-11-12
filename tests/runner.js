// Tiny browser test runner: test(), eq(), near(), run().
const tests = [];

export function test(name, fn) { tests.push({ name, fn }); }

export function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`.trim());
}

export function near(actual, expected, eps = 0.005) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > eps) {
    throw new Error(`expected ≈${expected}, got ${actual}`);
  }
}

export function throws(fn, text) {
  try { fn(); } catch (e) {
    if (text && !String(e.message).includes(text)) throw new Error(`expected error "${text}", got "${e.message}"`);
    return;
  }
  throw new Error(`expected error "${text}"`);
}

export async function run() {
  let passed = 0, failed = 0;
  const lines = [];
  for (const t of tests) {
    try { await t.fn(); passed++; lines.push('ok   ' + t.name); }
    catch (e) { failed++; lines.push('FAIL ' + t.name + ' — ' + e.message); }
  }
  lines.push(`${passed} passed, ${failed} failed`);
  const pre = document.getElementById('report');
  pre.textContent = lines.join('\u0001');
  pre.dataset.result = failed ? 'FAIL' : 'PASS';
  document.title = (failed ? 'FAIL ' : 'PASS ') + (failed || passed);
  return { passed, failed };
}
