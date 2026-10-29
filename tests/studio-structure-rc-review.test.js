import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const courses = ['structural-analysis', 'reinforced-concrete'].map(topic =>
  JSON.parse(fs.readFileSync(new URL(`../site/studio/content/${topic}.json`, import.meta.url), 'utf8')));
const cases = courses.flatMap(course => course.lessons.flatMap(lesson => lesson.cases));
const near = (a, b, note = '', tolerance = 1e-7) => assert.ok(
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b)), `${note}: ${a} != ${b}`);
const integrate = (f, length, count = 4000) => {
  const dx = length / count;
  let total = 0;
  for (let i = 0; i < count; i++) total += f((i + 0.5) * dx) * dx;
  return total;
};

// The audit uses only exported question data. It does not import production solvers.
function independent(c) {
  const p = c.params, changed = c.condition;
  switch (c.model) {
    case 'udl': return [p.q * p.L ** 2 / (changed ? 2 : 8), p.q * p.L / (changed ? 1 : 2)];
    case 'point': {
      const x = p.L * (changed ? 1 - p.r : p.r), rb = p.P * x / p.L;
      return [p.P - rb, rb, (p.P - rb) * x];
    }
    case 'stability': return [p.r + (changed ? 1 : 0) - 3 * (p.j - p.m), p.r + (changed ? 1 : 0)];
    case 'truss': {
      const angle = (changed ? 60 : p.theta) * Math.PI / 180;
      return [p.P / (2 * Math.sin(angle)), p.P / (2 * Math.tan(angle))];
    }
    case 'frame': return [p.P * p.a * (changed ? 2 : 1), p.P, p.P];
    case 'cantilever': {
      const EI = p.EI * (changed ? 2 : 1);
      return [integrate(x => p.P * (p.L - x) ** 2 / EI, p.L), integrate(x => p.P * (p.L - x) / EI, p.L)];
    }
    case 'beam-deflection': {
      const EI = p.EI * (changed ? 2 : 1);
      return [integrate(x => p.q * x * (p.L - x) / 2 * Math.min(x, p.L - x) / 2 / EI, p.L), p.q * p.L ** 3 / (24 * EI)];
    }
    case 'point-deflection': {
      const EI = p.EI * (changed ? .5 : 1);
      return [integrate(x => p.P * (Math.min(x, p.L - x) / 2) ** 2 / EI, p.L), p.P * p.L / 4];
    }
    case 'truss-displacement': {
      const sin = Math.sin(p.theta * Math.PI / 180), N = p.P / (2 * sin), EA = p.EA * (changed ? 2 : 1);
      return [2 * N / p.P * N * p.L / EA, N];
    }
    case 'propped': {
      const free = p.q * p.L ** 4 / (8 * p.EI), flexibility = p.L ** 3 / (3 * p.EI), rb = changed ? 0 : free / flexibility;
      return [rb, p.q * p.L - rb, p.q * p.L ** 2 / 2 - rb * p.L];
    }
    case 'force-flexibility': {
      const EI = p.EI * (changed ? 2 : 1);
      return [integrate(x => p.q * (p.L - x) ** 3 / (2 * EI), p.L), integrate(x => (p.L - x) ** 2 / EI, p.L)];
    }
    case 'settlement': {
      const rb = (changed ? 1 : -1) * p.delta / (p.L ** 3 / (3 * p.EI));
      return [rb, -rb];
    }
    case 'joint': {
      const rotation = p.M / (p.k1 + (changed ? 0 : p.k2));
      return [rotation, p.k1 * rotation];
    }
    case 'influence': {
      const x = p.L * (changed ? 1 - p.r : p.r);
      return [p.P * (p.L - x) / p.L, (p.L - x) / p.L];
    }
    case 'two-loads': {
      const x1 = p.L * (changed ? 2 / 3 : 1 / 3), x2 = p.L - x1;
      return [p.P1 * (p.L - x1) / p.L + p.P2 * (p.L - x2) / p.L, (p.P1 + p.P2) * p.L / 6];
    }
    case 'axial': {
      const stiffness = (changed ? 2 : 1) * p.EA / p.L;
      return [p.P / stiffness, stiffness];
    }
    case 'rc-flexure': {
      const b = p.b * (changed ? 2 : 1), T = p.As * p.fy, a = T / (.85 * p.fc * b);
      return [T * (p.d - a / 2) / 1e6, a];
    }
    case 'tbeam': {
      const h = p.hf * (changed ? .5 : 1), T = p.As * p.fy, pressure = .85 * p.fc;
      const a = T <= pressure * p.bf * h ? T / (pressure * p.bf) : h + (T - pressure * p.bf * h) / (pressure * p.bw);
      const flange = pressure * p.bf * Math.min(a, h), web = pressure * p.bw * Math.max(a - h, 0);
      return [(flange * (p.d - Math.min(a, h) / 2) + web * (p.d - (a + h) / 2)) / 1e6, a];
    }
    case 'rc-column': return [((changed ? .8 : .85) * p.fc * (p.Ag - p.Ast) + p.fy * p.Ast) / 1000, p.Ag - p.Ast];
    case 'magnify': {
      const factor = 1 / (1 - p.r * (changed ? 1.5 : 1));
      return [p.M1 * factor, factor];
    }
    case 'rc-shear': return [p.Av / p.s * p.fy * p.d / Math.tan((changed ? 30 : 45) * Math.PI / 180) / 1000, p.Av / p.s];
    case 'torsion': {
      const flow = p.T * 1e6 / (2 * p.Ao * (changed ? .75 : 1));
      return [flow, flow * p.s / p.fy];
    }
    case 'development': {
      const barForce = Math.PI * p.db ** 2 * p.fs / 4;
      return [barForce / (Math.PI * p.db * p.tau * (changed ? .8 : 1)), barForce / 1000];
    }
    case 'service': {
      const EI = p.EI * (changed ? .5 : 1);
      return [integrate(x => p.q * x * (p.L - x) / 2 * Math.min(x, p.L - x) / 2 / EI, p.L), EI];
    }
    case 'slab': {
      const M = p.q * p.L ** 2 / (changed ? 12 : 8);
      return [M, M * 1e6 / (p.fy * p.z)];
    }
    case 'punch': {
      const shearArea = p.bo * (changed ? 1.2 : 1) * p.d;
      return [p.Vu * 1000 / shearArea, shearArea];
    }
    case 'capacity': {
      const pair = 2 * p.M / p.L, gravity = p.q * p.L / 2;
      return [Math.abs(pair + (changed ? -gravity : gravity)), pair];
    }
    case 'prestress': {
      const uniform = p.P * 1000 / p.A, bending = p.P * 1000 * p.e / p.Z * (changed ? -1 : 1);
      return [uniform + bending, uniform - bending];
    }
    case 'loss': {
      const Pi = p.P0 - p.P0 * p.ri;
      return [Pi - (changed ? 0 : Pi * p.rl), Pi];
    }
    case 'prestress-range': {
      const stress = p.P * 1000 / p.A, limit = p.fc * (changed ? .5 : 1);
      return [Math.min(stress, limit - stress) * p.Z / (p.P * 1000), stress];
    }
    default: throw Error(`未覆核模型 ${c.model}`);
  }
}

test('independent review checks all 300 structure/RC problem instances and 60 inverse targets', () => {
  assert.equal(cases.length, 300);
  for (const c of cases) {
    const expected = independent(c);
    if (c.index === 3) {
      near(c.fields[0].value, c.params[c.unknown], c.id);
      near(c.target.value, expected[0], `${c.id} inverse target`);
    } else {
      assert.equal(c.fields.length, expected.length, c.id);
      for (let i = 0; i < expected.length; i++) near(c.fields[i].value, expected[i], `${c.id} field ${i}`);
    }
  }
});

test('hanging two-member trusses label their forces as tension and satisfy joint equilibrium', () => {
  for (const c of cases.filter(c => ['truss', 'truss-displacement'].includes(c.model))) {
    const index = c.model === 'truss' ? 0 : 1;
    if (c.index !== 3) assert.match(c.fields[index].label, /拉力/, `${c.id}: 上支點、下受載節點為吊掛受拉系統`);
    const angle = (c.model === 'truss' && c.condition ? 60 : c.params.theta) * Math.PI / 180;
    const force = independent(c)[index];
    near(2 * force * Math.sin(angle), c.params.P, `${c.id} vertical equilibrium`);
  }
});

test('short-column prompts disclose their specified concrete stress coefficient before answering', () => {
  for (const c of cases.filter(c => c.model === 'rc-column')) {
    assert.match(c.prompt, /α\s*[=＝]\s*0\.85/, `${c.id}: 基礎係數不得隱藏在答案`);
    if (c.condition) assert.match(c.prompt, /α\s*[=＝]\s*0\.80?/);
  }
});

test('reversed capacity-shear cases refer to a specified end, not the larger end envelope', () => {
  for (const c of cases.filter(c => c.model === 'capacity' && c.condition)) {
    assert.doesNotMatch(c.fields[0].label, /較大端/, c.id);
    assert.match(c.fields[0].label, /指定端|同一端/, c.id);
    assert.ok(c.fields[0].value < independent({ ...c, condition: false })[0], c.id);
  }
});

test('RC pressure-block exercises disclose strain data and satisfy the assumed steel yielding', () => {
  for (const c of cases.filter(c => ['tbeam', 'rc-flexure'].includes(c.model))) {
    const p = c.params;
    assert.ok(p.ecu > 0 && p.beta1 > 0 && p.Es > 0, `${c.id}: 題給 ecu、beta1、Es`);
    const a = independent(c)[1], neutralAxis = a / p.beta1;
    const steelStrain = p.ecu * (p.d - neutralAxis) / neutralAxis;
    assert.ok(steelStrain >= p.fy / p.Es, `${c.id}: εs=${steelStrain} < εy=${p.fy / p.Es}`);
    assert.ok(neutralAxis < p.d, c.id);
  }
});

test('prestress constraints retain both edge stresses and feasible nonnegative eccentricity', () => {
  for (const c of cases.filter(c => c.model === 'prestress')) {
    const [bottom, top] = independent(c), p = c.params;
    near((bottom + top) / 2 * p.A, p.P * 1000, c.id);
    near((bottom - top) / 2 * p.Z, p.P * 1000 * p.e * (c.condition ? -1 : 1), c.id);
  }
  for (const c of cases.filter(c => c.model === 'prestress-range')) {
    const [e, uniform] = independent(c), p = c.params;
    assert.ok(e >= 0, c.id);
    const bending = p.P * 1000 * e / p.Z, limit = p.fc * (c.condition ? .5 : 1);
    assert.ok(uniform - bending >= -1e-9, `${c.id} top no tension`);
    assert.ok(uniform + bending <= limit + 1e-9, `${c.id} bottom compression limit`);
  }
});
