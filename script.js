const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// === Utilitário: camada de setas animadas (SVG overlay) =======================

function sizeArrowLayer(svg){
  const w = window.innerWidth || document.documentElement.clientWidth || 1280;
  const h = window.innerHeight || document.documentElement.clientHeight || 720;
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
}

function ensureArrowLayer(){
  let svg = document.getElementById('arrow-layer');
  if (!svg){
    // segurança: se não existir, cria
    svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('id','arrow-layer');
    svg.classList.add('arrow-layer');
    document.body.appendChild(svg);
    sizeArrowLayer(svg);
    window.addEventListener('resize', ()=>sizeArrowLayer(svg));
  }
  // Define o marcador de ponta de seta (arrowhead) se ainda não existir
  if (!svg.querySelector('defs')){
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg','marker');
    marker.setAttribute('id','arrowhead');
    marker.setAttribute('markerWidth','8');
    marker.setAttribute('markerHeight','8');
    marker.setAttribute('refX','6.5');
    marker.setAttribute('refY','3.5');
    marker.setAttribute('orient','auto');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M0,0 L7,3.5 L0,7 Z');
    path.setAttribute('fill','currentColor');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }
  return svg;
}

// Obtém o centro (x,y) de um elemento na viewport
function centerOf(el){
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width/2, y: r.top + r.height/2 };
}

// Desenha uma curva suave (quadrática) entre dois pontos
function curvedPath(from, to){
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = from.x + dx * 0.5;
  const cy = from.y + dy * 0.1 - 40; // pequeno arco para cima
  return `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`;
}

// Cria e anima uma seta entre dois elementos
function drawArrowBetween(elFrom, elTo, {klass='arrow-in', keepMs=950} = {}){
  if (!elFrom || !elTo) return;
  const svg = ensureArrowLayer();
  const from = centerOf(elFrom);
  const to   = centerOf(elTo);

  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', curvedPath(from, to));
  pathEl.setAttribute('class', `arrow-path ${klass}`);
  pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
  pathEl.style.color = getComputedStyle(document.documentElement).getPropertyValue('--title') || '#000';

  svg.appendChild(pathEl);

  // remove após animação
  setTimeout(()=>{
    pathEl.remove();
  }, keepMs);
}

// Helpers para localizar células de RAM e Disco por índice/página
function getRamCellByIndex(frameIdx){
  return document.querySelector(`#ram .cell[data-i="${frameIdx}"]`);
}
function getDiskCellByPage(p){
  const cells = Array.from(document.querySelectorAll('#disk .cell'));
  for (const c of cells){
    const pill = c.querySelector('.pill');
    if (pill && pill.textContent.trim() === `p${p}`){
      return c;
    }
  }
  return null;
}


class PagingSim {
  constructor() {
    this.animPlan = null;
    this.numPages = 10;
    this.pageSize = 4;
    this.frames = 4;
    this.ref = [];
    this.stepIdx = 0;
    this.hits = 0;
    this.faults = 0;
    this.pageTable = [];
    this.ram = [];
    this.queue = [];
    this.timer = null;
    this.lastFlash = null;
    this.animPlan = null;
  }

  init(opts) {
    this.numPages = opts.numPages;
    this.pageSize = opts.pageSize;
    this.frames = opts.frames;
    this.ref = Array.isArray(opts.ref) ? opts.ref.slice() : [];
    this.stepIdx = 0;
    this.hits = 0;
    this.faults = 0;
    this.pageTable = Array.from({ length: this.numPages }, () => ({ frame: null, present: false, note: "" }));
    this.ram = Array.from({ length: this.frames }, () => null);
    this.queue = [];
    this.render();
    this.log(`Inicializado com ${this.numPages} páginas, ${this.frames} quadros, página ${this.pageSize}KB.`);
    $("#curr").textContent = "Próxima referência: —";
    $("#stats").textContent = `Passos: 0/${this.ref.length} · Hits: 0 · Faltas: 0`;
  }

  next() {
    if (this.stepIdx >= this.ref.length) {
      this.log("✅ Execução encerrada.");
      return false;
    }
    const p = this.ref[this.stepIdx];
    $("#curr").textContent = `Referência agora: página ${p}`;

    if (p < 0 || p >= this.numPages) {
      this.log(`⚠️ Página ${p} inválida. Ignorada.`);
      this.stepIdx++;
      this.render();
      return true;
    }

    const pt = this.pageTable[p];

    if (pt.present && pt.frame !== null) {
      // HIT
      this.hits++;
      this.lastFlash = { frame: pt.frame, cls: 'hit' };
      this.log(`✔️ HIT – página ${p} já está no quadro ${pt.frame}.`);
    } else {
      // FAULT
      this.faults++;
      const free = this.ram.indexOf(null);
      if (free !== -1) {
        // quadro livre
        /* ARROWS_FREE_FRAME */
        this.ram[free] = p;
        pt.frame = free;
        pt.present = true;
        pt.note = "carregada (demanda)";
        this.queue.push(p);
        this.lastFlash = { frame: free, cls: 'fault' };
        this.log(`🟥 FALTA – página ${p} carregada no quadro livre ${free}.`);
        // Planeja animação: DISCO -> RAM (p -> frame livre)
        this.animPlan = { kind: 'in', page: p, frame: free };
    
      } else {
        // FIFO
        const victim = this.queue.shift();
        const vFrame = this.pageTable[victim].frame;
        this.pageTable[victim].frame = null;
        this.pageTable[victim].present = false;
        this.pageTable[victim].note = "swap";

        this.ram[vFrame] = p;
        pt.frame = vFrame;
        pt.present = true;
        pt.note = "substituição (FIFO)";
        this.queue.push(p);
        this.lastFlash = { frame: vFrame, cls: 'fault' };
        this.log(`🟥 Substituição FIFO – página ${victim} saiu; página ${p} entrou no quadro ${vFrame}.`);
        // Planeja animação composta: RAM(victim) -> DISCO, depois DISCO(p) -> RAM(vFrame)
        this.animPlan = { kind: 'swap', out: {frame: vFrame, page: victim}, inn: {frame: vFrame, page: p} };
    
      }
    }

    this.stepIdx++;
    this.render();
    return true;
  }

  flash(frame, cls) {
    const el = document.querySelector(`#ram .cell[data-i="${frame}"]`);
    if (!el) return;
    el.classList.remove("hit", "fault");
    void el.offsetWidth; // reflow
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 550);
  }

  render() {
    // RAM
    const ram = $("#ram");
    ram.innerHTML = "";
    this.ram.forEach((page, i) => {
      const cell = document.createElement("div");
      cell.className = "cell" + (page !== null ? " fill" : "");
      cell.setAttribute("data-i", String(i));
      cell.innerHTML = `
        <span class="idx">#${i}</span>
        ${page === null ? `<div>livre</div>` : `<div class="pill">p${page}</div>`}
        <span class="tag">${page === null ? "—" : "quadro"}</span>
      `;
      ram.appendChild(cell);
    /* ARROWS_EXEC */
    if (this.animPlan){
      const plan = this.animPlan; this.animPlan = null;
      if (plan.kind === 'in'){
        const ramCell = getRamCellByIndex(plan.frame);
        const diskCell = getDiskCellByPage(plan.page);
        if (diskCell && ramCell){ drawArrowBetween(diskCell, ramCell, {klass:'arrow-in'}); }
      } else if (plan.kind === 'swap'){
        const ramVict = getRamCellByIndex(plan.out.frame);
        const diskVict = getDiskCellByPage(plan.out.page) || document.querySelector('#disk');
        if (ramVict && diskVict){ drawArrowBetween(ramVict, diskVict, {klass:'arrow-out', keepMs:1100}); }
        setTimeout(()=>{
          const ramIn  = getRamCellByIndex(plan.inn.frame);
          const diskIn = getDiskCellByPage(plan.inn.page) || document.querySelector('#disk');
          if (diskIn && ramIn){ drawArrowBetween(diskIn, ramIn, {klass:'arrow-in'}); }
        }, 240);
      }
    }
}
);

    // DISK (swap): páginas não presentes
    const disk = $("#disk");
    if (disk) {
      disk.innerHTML = "";
      for (let p = 0; p < this.numPages; p++) {
        if (!this.pageTable[p].present) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.innerHTML = `<div class="pill">p${p}</div>`;
          disk.appendChild(cell);
        }
      }
    }

    // Tabela de páginas
    const tb = $("#ptbl tbody");
    if (tb) {
      tb.innerHTML = "";
      for (let i = 0; i < this.numPages; i++) {
        const pt = this.pageTable[i];
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>p${i}</td>
          <td>${pt.frame ?? "—"}</td>
          <td>${pt.present ? "Sim" : "Não"}</td>
          <td>${pt.note || ""}</td>
        `;
        tb.appendChild(tr);
      }
    }


    // PATCH: aplica highlight após render (não perde ao re-renderizar)
    if (this.lastFlash && Number.isInteger(this.lastFlash.frame)) {
      const el = document.querySelector(`#ram .cell[data-i="${this.lastFlash.frame}"]`);
      if (el) {
        const cls = this.lastFlash.cls;
        el.classList.remove('hit','fault');
        void el.offsetWidth; // reflow
        el.classList.add(cls);
        setTimeout(()=> el.classList.remove(cls), 600);
      }
      this.lastFlash = null;
    this.animPlan = null;
    }

    /* ARROWS_EXEC: desenha setas após o DOM estar pronto */
    if (this.animPlan){
      const plan = this.animPlan; this.animPlan = null;
      if (plan.kind === 'in'){
        // disco -> ram
        const ramCell = getRamCellByIndex(plan.frame);
        const diskCell = getDiskCellByPage(plan.page);
        if (diskCell && ramCell){ drawArrowBetween(diskCell, ramCell, {klass:'arrow-in'}); }
      } else if (plan.kind === 'swap'){
        // primeiro: RAM(victim) -> DISCO
        const ramVict = getRamCellByIndex(plan.out.frame);
        const diskVict = getDiskCellByPage(plan.out.page) || document.querySelector('#disk');
        if (ramVict && diskVict){ drawArrowBetween(ramVict, diskVict, {klass:'arrow-out', keepMs:1000}); }
        // depois de pequeno delay, DISCO(p) -> RAM
        setTimeout(()=>{
          const ramIn  = getRamCellByIndex(plan.inn.frame);
          const diskIn = getDiskCellByPage(plan.inn.page) || document.querySelector('#disk');
          if (diskIn && ramIn){ drawArrowBetween(diskIn, ramIn, {klass:'arrow-in'}); }
        }, 220);
      }
    }

    // Stats
    const stats = $("#stats");
    if (stats) {
      stats.textContent = `Passos: ${this.stepIdx}/${this.ref.length} · Hits: ${this.hits} · Faltas: ${this.faults}`;
    }
  }

  autoplay(on = true) {
    if (on) {
      if (this.timer) return;
      this.timer = setInterval(() => {
        const cont = this.next();
        if (!cont) this.autoplay(false);
      }, 650);
    } else {
      clearInterval(this.timer);
      this.timer = null;
    this.lastFlash = null;
    this.animPlan = null;
    }
  }

  log(msg) {
    const logEl = $("#log");
    if (!logEl) return;
    const line = document.createElement("div");
    line.textContent = msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }
}

const sim = new PagingSim();

function parseRefs(str, numPages) {
  if (!str || !str.trim()) {
    const len = 18;
    const arr = [];
    let cur = Math.floor(Math.random() * Math.max(2, numPages));
    for (let i = 0; i < len; i++) {
      const r = Math.random();
      if (r < 0.6) {
        cur = Math.max(0, Math.min(numPages - 1, cur + (Math.random() < 0.5 ? -1 : 1)));
      } else {
        cur = Math.floor(Math.random() * numPages);
      }
      arr.push(cur);
    }
    return arr;
  }
  return str.split(/[,\s]+/).map(x => parseInt(x, 10)).filter(n => Number.isFinite(n));
}

// Wire UI
document.querySelector('#init')?.addEventListener('click', () => {
  const numPages = Math.max(1, parseInt(document.querySelector('#numPages').value, 10) || 10);
  const pageSize = Math.max(1, parseInt(document.querySelector('#pageSize').value, 10) || 4);
  const frames = Math.max(1, parseInt(document.querySelector('#frames').value, 10) || 4);
  const policy = document.querySelector('#policy')?.value || 'FIFO';
  const ref = parseRefs(document.querySelector('#refStr').value, numPages);
  sim.init({ numPages, pageSize, frames, policy, ref });
  ['#step', '#auto', '#pause', '#reset'].forEach(id => { const el = document.querySelector(id); if (el) el.disabled = false; });
  document.querySelector('#step')?.focus();
});

document.querySelector('#step')?.addEventListener('click', () => sim.next());
document.querySelector('#auto')?.addEventListener('click', () => sim.autoplay(true));
document.querySelector('#pause')?.addEventListener('click', () => sim.autoplay(false));
document.querySelector('#reset')?.addEventListener('click', () => {
  sim.autoplay(false);
  sim.init({ numPages: sim.numPages, pageSize: sim.pageSize, frames: sim.frames, policy: 'FIFO', ref: sim.ref });
});

// Inicialização para preview rápido
if (!document.querySelector('#ram')?.children.length) {
  sim.init({ numPages: 10, pageSize: 4, frames: 4, policy: 'FIFO', ref: parseRefs('', 10) });
  ['#step', '#auto', '#pause', '#reset'].forEach(id => { const el = document.querySelector(id); if (el) el.disabled = false; });
}
