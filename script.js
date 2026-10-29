/* ============================================================
   Detalle para Cheyling 💗
   ============================================================ */

const audio = document.getElementById("audio");

/* Arma la letra a partir de letra.js (TEXTO + TIEMPOS) */
const DURACION_APROX = 28.34;
const lineasTexto = TEXTO.split("\n").map(l => l.trim()).filter(Boolean);
function construirLetra() {
  let tiempos;
  if (TIEMPOS.length >= lineasTexto.length) {
    tiempos = TIEMPOS.slice(0, lineasTexto.length);
  } else {
    // Reparto automático entre el segundo 1.5 y el final
    const inicio = 1.5, fin = DURACION_APROX - 1;
    const paso = (fin - inicio) / Math.max(1, lineasTexto.length);
    tiempos = lineasTexto.map((_, i) => inicio + i * paso);
  }
  const fines = typeof FINES !== "undefined" && FINES.length >= lineasTexto.length && TIEMPOS.length >= lineasTexto.length ? FINES : [];
  const letra = lineasTexto.map((texto, i) => ({ t: tiempos[i], fin: fines[i], texto }));
  if (!letra.length || letra[0].t > 0.5) letra.unshift({ t: 0, texto: "♪ ♪ ♪" });
  return letra;
}
const LETRA = construirLetra();
const pantallas = {
  pregunta: document.getElementById("pantalla-pregunta"),
  karaoke:  document.getElementById("pantalla-karaoke"),
  final:    document.getElementById("pantalla-final"),
  sync:     document.getElementById("pantalla-sync"),
};

function mostrar(nombre) {
  Object.values(pantallas).forEach(p => p.classList.remove("activa"));
  pantallas[nombre].classList.add("activa");
}

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------
   1. FONDO: luces bokeh, destellos, corazones y pétalos
      (y todo late un poquito al ritmo de la canción)
------------------------------------------------------------ */
const canvas = document.getElementById("fondo");
const ctx = canvas.getContext("2d");
const aurora = document.querySelector(".aurora");
let particulas = [];
let luces = [];
let destellos = [];
let intensidad = 1;   // sube mientras suena la canción
let ritmo = 0;        // 0 a 1, viene del analizador de audio

function ajustarCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  crearLucesYDestellos();
}

function crearLucesYDestellos() {
  const area = innerWidth * innerHeight;
  luces = Array.from({ length: Math.round(area / 60000) + 6 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: 20 + Math.random() * 70,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    fase: Math.random() * Math.PI * 2,
    tono: ["255,79,154", "255,158,199", "255,209,230", "200,90,255"][Math.floor(Math.random() * 4)],
  }));
  destellos = Array.from({ length: Math.round(area / 9000) }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    tam: 0.6 + Math.random() * 1.6,
    fase: Math.random() * Math.PI * 2,
    vel: 0.01 + Math.random() * 0.03,
  }));
}

function nuevaParticula(enCualquierAltura) {
  const esCorazon = Math.random() < 0.5;
  return {
    x: Math.random() * innerWidth,
    y: enCualquierAltura ? Math.random() * innerHeight : innerHeight + 30,
    tam: esCorazon ? 6 + Math.random() * 12 : 5 + Math.random() * 8,
    vel: 0.25 + Math.random() * 0.7,
    giro: Math.random() * Math.PI * 2,
    vGiro: (Math.random() - 0.5) * 0.02,
    fase: Math.random() * Math.PI * 2,
    alfa: 0.3 + Math.random() * 0.5,
    color: ["#ff9ec7", "#ff4f9a", "#ffd1e6", "#ff7fb6"][Math.floor(Math.random() * 4)],
    corazon: esCorazon,
  };
}

function dibujarCorazon(s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s * 1.1, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.5, -s * 1.1, s, -s * 0.4, 0, s * 0.3);
  ctx.fill();
}

function dibujarPetalo(s) {
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.55, s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarDestello(x, y, s, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
  if (s > 1.4) { // los más grandes tienen forma de estrellita
    ctx.globalAlpha = a * 0.6;
    ctx.fillRect(x - s * 3, y - 0.4, s * 6, 0.8);
    ctx.fillRect(x - 0.4, y - s * 3, 0.8, s * 6);
  }
}

/* Analizador de audio: solo funciona abriendo con Live Server (http) */
let analizador = null, datosAudio = null;
function prepararAnalizador() {
  if (analizador || !location.protocol.startsWith("http")) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const actx = new AC();
    const fuente = actx.createMediaElementSource(audio);
    analizador = actx.createAnalyser();
    analizador.fftSize = 256;
    datosAudio = new Uint8Array(analizador.frequencyBinCount);
    fuente.connect(analizador);
    analizador.connect(actx.destination);
    actx.resume();
  } catch (e) { analizador = null; }
}

function leerRitmo() {
  if (!analizador || audio.paused) { ritmo *= 0.9; return; }
  analizador.getByteFrequencyData(datosAudio);
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += datosAudio[i]; // graves
  const nivel = suma / (12 * 255);
  ritmo = ritmo * 0.7 + nivel * 0.3;
}

function animarFondo() {
  leerRitmo();
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.globalCompositeOperation = "lighter";

  // Luces bokeh desenfocadas
  luces.forEach(l => {
    l.x += l.vx; l.y += l.vy; l.fase += 0.008;
    if (l.x < -100) l.x = innerWidth + 100; if (l.x > innerWidth + 100) l.x = -100;
    if (l.y < -100) l.y = innerHeight + 100; if (l.y > innerHeight + 100) l.y = -100;
    const r = l.r * (1 + ritmo * 0.35);
    const a = 0.10 + Math.sin(l.fase) * 0.04 + ritmo * 0.08;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, `rgba(${l.tono},${a})`);
    g.addColorStop(0.7, `rgba(${l.tono},${a * 0.4})`);
    g.addColorStop(1, `rgba(${l.tono},0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Destellos que titilan
  destellos.forEach(d => {
    d.fase += d.vel;
    const a = Math.max(0, Math.sin(d.fase)) * (0.5 + ritmo * 0.5);
    if (a > 0.02) dibujarDestello(d.x, d.y, d.tam, a);
  });

  ctx.globalCompositeOperation = "source-over";

  // Corazones y pétalos subiendo
  const objetivo = Math.round((innerWidth * innerHeight) / 16000 * intensidad);
  while (particulas.length < objetivo) particulas.push(nuevaParticula(false));
  particulas.forEach((p, i) => {
    p.y -= p.vel * intensidad * (1 + ritmo);
    p.fase += 0.015;
    p.x += Math.sin(p.fase) * 0.4;
    p.giro += p.vGiro;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.corazon ? Math.sin(p.fase) * 0.3 : p.giro);
    const escala = p.corazon ? 1 + ritmo * 0.4 : 1;
    ctx.scale(escala, escala);
    ctx.globalAlpha = p.alfa;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.corazon ? 12 : 0;
    p.corazon ? dibujarCorazon(p.tam) : dibujarPetalo(p.tam);
    ctx.restore();
    if (p.y < -40) particulas[i] = nuevaParticula(false);
  });
  if (particulas.length > objetivo + 10) particulas.length = objetivo;

  if (aurora) aurora.style.setProperty("--pulso", (1 + ritmo * 0.08).toFixed(3));

  if (!reducirMovimiento) requestAnimationFrame(animarFondo);
}

ajustarCanvas();
particulas = Array.from({ length: 45 }, () => nuevaParticula(true));
addEventListener("resize", ajustarCanvas);
animarFondo();

/* Lluvia de corazones al decir que sí */
function explosionDeCorazones() {
  for (let i = 0; i < 45; i++) {
    const p = nuevaParticula(true);
    p.corazon = true;
    p.y = innerHeight * (0.5 + Math.random() * 0.5);
    p.vel = 1.5 + Math.random() * 2.5;
    p.alfa = 0.85;
    particulas.push(p);
  }
}

/* ------------------------------------------------------------
   1b. OSITOS: uno rosado y uno azul vuelan por los lados
       y se disparan corazones mientras suena la canción
------------------------------------------------------------ */
const lienzoOsitos = document.getElementById("ositos");
const cOs = lienzoOsitos.getContext("2d");
const ositos = {
  activo: false,
  alfa: 0,
  balas: [],
  chispas: [],
  osos: [
    { lado: 1,  fase: 0,   cuerpo: "#ffb3d1", claro: "#ffe6f0", arma: "#ff4f9a", golpe: 0, retroceso: 0, proximo: 1.2 },
    { lado: -1, fase: 2.4, cuerpo: "#a9cfff", claro: "#e6f1ff", arma: "#3b7bff", golpe: 0, retroceso: 0, proximo: 2.4 },
  ],
};

function ajustarOsitos() {
  const dpr = window.devicePixelRatio || 1;
  lienzoOsitos.width = innerWidth * dpr;
  lienzoOsitos.height = innerHeight * dpr;
  cOs.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function unidadOso() {
  return Math.max(13, Math.min(22, innerWidth / 48));
}

function posicionOso(oso, t) {
  const u = unidadOso();
  const margen = Math.max(u * 2.2, innerWidth * 0.07);
  const x = oso.lado === 1 ? margen : innerWidth - margen;
  return {
    x: x + Math.sin(t * 0.9 + oso.fase) * u * 0.9,
    y: innerHeight * (0.42 + 0.26 * Math.sin(t * 0.45 + oso.fase)),
  };
}

function corazonEn(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.3);
  c.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.5, y - s * 1.1, x, y - s * 0.5);
  c.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s, y - s * 0.4, x, y + s * 0.3);
  c.fill();
}

function elipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

function dibujarOso(oso, pos, apunte, t) {
  const u = unidadOso();
  const c = cOs;
  c.save();
  c.translate(pos.x, pos.y);
  if (oso.golpe > 0) c.rotate(Math.sin(t * 40) * oso.golpe * 0.25);
  c.scale(oso.lado, 1); // el azul mira hacia la izquierda

  // Alitas que aletean
  const aleteo = Math.sin(t * 14 + oso.fase) * 0.5;
  c.fillStyle = "rgba(255,255,255,0.9)";
  c.shadowColor = "rgba(255,255,255,0.8)";
  c.shadowBlur = 8;
  [[-0.7, -0.1, -0.5], [-0.95, 0.15, -0.9]].forEach(([ax, ay, giro]) => {
    c.save();
    c.translate(ax * u, ay * u);
    c.rotate(giro + aleteo);
    c.beginPath();
    c.ellipse(-u * 0.45, 0, u * 0.55, u * 0.28, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
  c.shadowBlur = 0;

  // Cuerpo, patitas y pancita
  elipse(c, -u * 0.35, u * 1.3, u * 0.28, u * 0.22, oso.cuerpo);
  elipse(c, u * 0.35, u * 1.3, u * 0.28, u * 0.22, oso.cuerpo);
  elipse(c, 0, u * 0.6, u * 0.8, u * 0.78, oso.cuerpo);
  elipse(c, u * 0.1, u * 0.7, u * 0.48, u * 0.45, oso.claro);

  // Cabeza y orejas
  elipse(c, -u * 0.62, -u * 1.28, u * 0.34, u * 0.34, oso.cuerpo);
  elipse(c, u * 0.62, -u * 1.28, u * 0.34, u * 0.34, oso.cuerpo);
  elipse(c, -u * 0.62, -u * 1.28, u * 0.17, u * 0.17, oso.claro);
  elipse(c, u * 0.62, -u * 1.28, u * 0.17, u * 0.17, oso.claro);
  elipse(c, 0, -u * 0.6, u * 0.95, u * 0.88, oso.cuerpo);

  // Hociquito, nariz y cachetes
  elipse(c, u * 0.3, -u * 0.35, u * 0.38, u * 0.28, oso.claro);
  elipse(c, u * 0.38, -u * 0.46, u * 0.13, u * 0.09, "#4a2a3a");
  c.globalAlpha *= 0.55;
  elipse(c, -u * 0.4, -u * 0.35, u * 0.16, u * 0.11, "#ff7fb0");
  elipse(c, u * 0.78, -u * 0.38, u * 0.12, u * 0.1, "#ff7fb0");
  c.globalAlpha /= 0.55;

  // Ojitos (se cierran como > < cuando le pegan)
  if (oso.golpe > 0.3) {
    c.strokeStyle = "#3a1f2e";
    c.lineWidth = u * 0.08;
    c.lineCap = "round";
    [[-0.05, 1], [0.55, -1]].forEach(([ox, d]) => {
      c.beginPath();
      c.moveTo((ox - 0.1 * d) * u, -u * 0.8);
      c.lineTo((ox + 0.08 * d) * u, -u * 0.7);
      c.lineTo((ox - 0.1 * d) * u, -u * 0.6);
      c.stroke();
    });
  } else {
    [-0.05, 0.55].forEach(ox => {
      elipse(c, ox * u, -u * 0.7, u * 0.1, u * 0.12, "#3a1f2e");
      elipse(c, (ox + 0.03) * u, -u * 0.75, u * 0.035, u * 0.035, "#fff");
    });
  }

  // Bracito con la pistola de corazón
  c.save();
  c.translate(u * 0.55, u * 0.35);
  c.rotate(apunte);
  c.translate(-oso.retroceso * u * 0.3, 0);
  c.fillStyle = oso.arma;
  c.strokeStyle = "#fff";
  c.lineWidth = u * 0.07;
  c.beginPath();
  c.roundRect(u * 0.15, -u * 0.18, u * 1.05, u * 0.36, u * 0.14);
  c.stroke();
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.65)";
  c.fillRect(u * 0.3, -u * 0.1, u * 0.7, u * 0.06);
  c.fillStyle = "#fff";
  corazonEn(c, u * 0.62, u * 0.1, u * 0.2);                       // corazoncito en la pistola
  c.fillStyle = oso.arma;
  corazonEn(c, u * 0.28, u * 0.42, u * 0.38);                     // empuñadura de corazón
  elipse(c, u * 0.25, u * 0.12, u * 0.25, u * 0.23, oso.cuerpo); // patita
  c.restore();

  c.restore();
}

function disparar(tirador, pos, blanco, apunte) {
  const u = unidadOso();
  const ang = tirador.lado === 1 ? apunte : Math.PI - apunte;
  const largo = u * 1.1;
  const vel = Math.max(220, innerWidth * 0.42);
  ositos.balas.push({
    x: pos.x + tirador.lado * u * 0.55 + Math.cos(ang) * largo,
    y: pos.y + u * 0.35 + Math.sin(ang) * largo,
    vx: Math.cos(ang) * vel,
    vy: Math.sin(ang) * vel,
    color: tirador.arma,
    blanco,
    giro: 0,
  });
  tirador.retroceso = 1;
}

function chispasDe(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
    ositos.chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, vida: 1, color });
  }
}

let ultimoOsitos = performance.now();
function animarOsitos(ahora) {
  const dt = Math.min(0.05, (ahora - ultimoOsitos) / 1000);
  ultimoOsitos = ahora;
  const t = ahora / 1000;
  ositos.alfa += ((ositos.activo ? 1 : 0) - ositos.alfa) * Math.min(1, dt * 3);
  cOs.clearRect(0, 0, innerWidth, innerHeight);

  if (ositos.alfa > 0.01) {
    const u = unidadOso();
    const posiciones = ositos.osos.map(oso => posicionOso(oso, t));

    ositos.osos.forEach((oso, k) => {
      const yo = posiciones[k], otro = posiciones[1 - k];
      const apunte = Math.max(-0.6, Math.min(0.6,
        Math.atan2(otro.y - (yo.y + u * 0.35), Math.abs(otro.x - yo.x))));
      oso.golpe = Math.max(0, oso.golpe - dt * 1.8);
      oso.retroceso = Math.max(0, oso.retroceso - dt * 5);
      if (ositos.activo && !audio.paused) {
        oso.proximo -= dt;
        if (oso.proximo <= 0) {
          disparar(oso, yo, ositos.osos[1 - k], apunte);
          oso.proximo = 1.4 + Math.random() * 1.8;
        }
      }
      cOs.globalAlpha = ositos.alfa;
      dibujarOso(oso, yo, apunte, t);
    });

    // Balas de corazón que persiguen al otro osito
    ositos.balas = ositos.balas.filter(b => {
      const destino = posiciones[ositos.osos.indexOf(b.blanco)];
      const dx = destino.x - b.x, dy = destino.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const vel = Math.hypot(b.vx, b.vy);
      b.vx += (dx / dist * vel - b.vx) * dt * 2;
      b.vy += (dy / dist * vel - b.vy) * dt * 2;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.giro += dt * 6;
      if (dist < u * 1.2) {
        b.blanco.golpe = 1;
        chispasDe(b.x, b.y, b.color);
        return false;
      }
      cOs.save();
      cOs.globalAlpha = ositos.alfa;
      cOs.shadowColor = b.color;
      cOs.shadowBlur = 12;
      cOs.translate(b.x, b.y);
      cOs.rotate(Math.atan2(b.vy, b.vx) * 0.15 + Math.sin(b.giro) * 0.3);
      cOs.fillStyle = b.color;
      corazonEn(cOs, 0, 0, u * 0.5);
      cOs.shadowBlur = 0;
      cOs.strokeStyle = "#fff"; // borde blanco para que no se confunda con el fondo
      cOs.lineWidth = u * 0.1;
      cOs.lineJoin = "round";
      cOs.stroke();
      cOs.restore();
      return b.x > -50 && b.x < innerWidth + 50;
    });

    // Mini corazones cuando le pegan a un osito
    ositos.chispas = ositos.chispas.filter(ch => {
      ch.vida -= dt * 1.6;
      ch.x += ch.vx * dt;
      ch.y += ch.vy * dt;
      ch.vy += 120 * dt;
      cOs.globalAlpha = ositos.alfa * Math.max(0, ch.vida);
      cOs.fillStyle = ch.color;
      corazonEn(cOs, ch.x, ch.y, u * 0.2);
      return ch.vida > 0;
    });
    cOs.globalAlpha = 1;
  } else if (!ositos.activo) {
    ositos.balas = [];
    ositos.chispas = [];
  }

  requestAnimationFrame(animarOsitos);
}

ajustarOsitos();
addEventListener("resize", ajustarOsitos);
if (!reducirMovimiento) requestAnimationFrame(animarOsitos);

/* ------------------------------------------------------------
   2. PREGUNTA INICIAL
------------------------------------------------------------ */
const btnSi = document.getElementById("btn-si");
const btnNo = document.getElementById("btn-no");
const mensajeNo = document.getElementById("mensaje-no");
const frasesNo = [
  "¿Segura? 🥺",
  "Ese botón no funciona 😌",
  "Inténtalo de nuevo…",
  "Mejor dale al otro 💗",
  "No te vas a escapar 😏",
];
let intentosNo = 0;

function escaparBoton() {
  const rect = btnNo.getBoundingClientRect();
  btnNo.classList.add("escapando");
  const margen = 20;
  const x = margen + Math.random() * (innerWidth - rect.width - margen * 2);
  const y = margen + Math.random() * (innerHeight - rect.height - margen * 2);
  btnNo.style.left = x + "px";
  btnNo.style.top = y + "px";
  mensajeNo.textContent = frasesNo[intentosNo % frasesNo.length];
  intentosNo++;
  // El "Sí" crece un poquito cada vez
  btnSi.style.transform = `scale(${Math.min(1 + intentosNo * 0.08, 1.5)})`;
}
btnNo.addEventListener("mouseenter", escaparBoton);
btnNo.addEventListener("click", e => { e.preventDefault(); escaparBoton(); });
btnNo.addEventListener("touchstart", e => { e.preventDefault(); escaparBoton(); }, { passive: false });

btnSi.addEventListener("click", () => {
  explosionDeCorazones();
  btnNo.style.display = "none";
  setTimeout(iniciarKaraoke, 700);
});

/* ------------------------------------------------------------
   3. KARAOKE
------------------------------------------------------------ */
const contLetra = document.getElementById("letra");
const btnPlay = document.getElementById("btn-play");
const barra = document.getElementById("barra");
const barraRelleno = document.getElementById("barra-relleno");
const tiempoTxt = document.getElementById("tiempo");
let indiceActual = -2;
let animandoLetra = false;

function esInstrumental(texto) {
  return /^[\s♪♫…\.]*$/.test(texto);
}

function crearLinea(texto, clase) {
  const el = document.createElement("p");
  el.className = "linea " + clase + (esInstrumental(texto) ? " instrumental" : "");
  el.textContent = texto || "\u00a0";
  return el;
}

function pintarLineas(i) {
  contLetra.innerHTML = "";
  const anterior = LETRA[i - 1];
  const actual = LETRA[i];
  const siguiente = LETRA[i + 1];
  contLetra.appendChild(crearLinea(anterior ? anterior.texto : "", "anterior"));
  contLetra.appendChild(crearLinea(actual ? actual.texto : "", "actual"));
  contLetra.appendChild(crearLinea(siguiente ? siguiente.texto : "", "siguiente"));
}

function buscarIndice(t) {
  let i = -1;
  for (let k = 0; k < LETRA.length; k++) {
    if (t >= LETRA[k].t) i = k; else break;
  }
  return i;
}

function formatear(seg) {
  seg = Math.max(0, Math.floor(seg));
  return Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0");
}

function cicloKaraoke() {
  const t = audio.currentTime;
  const dur = audio.duration || 28;
  const i = buscarIndice(t);

  if (i !== indiceActual) {
    indiceActual = i;
    pintarLineas(Math.max(i, 0));
  }

  // Progreso dentro de la línea actual -> relleno rosado del karaoke
  const lineaEl = contLetra.querySelector(".linea.actual");
  if (lineaEl) {
    let p = 0;
    if (i >= 0) {
      const inicio = LETRA[i].t;
      if (LETRA[i].fin) {
        // Se llena exactamente mientras se canta la línea
        p = Math.min(1, (t - inicio) / Math.max(0.3, LETRA[i].fin - inicio));
      } else {
        const fin = LETRA[i + 1] ? LETRA[i + 1].t : dur;
        // La línea se termina de llenar un poco antes de cambiar
        p = Math.min(1, (t - inicio) / Math.max(0.3, (fin - inicio) * 0.92));
      }
    }
    lineaEl.style.setProperty("--p", (p * 100).toFixed(1) + "%");
  }

  barraRelleno.style.width = (t / dur * 100) + "%";
  tiempoTxt.textContent = formatear(t);

  if (animandoLetra) requestAnimationFrame(cicloKaraoke);
}

function iniciarKaraoke() {
  prepararAnalizador();
  mostrar("karaoke");
  intensidad = 1.6;
  ositos.activo = true;
  indiceActual = -2;
  audio.currentTime = 0;
  audio.play().catch(() => {
    btnPlay.textContent = "▶";
    btnPlay.setAttribute("aria-label", "Reproducir");
  });
  animandoLetra = true;
  cicloKaraoke();
}

btnPlay.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});
audio.addEventListener("play", () => {
  btnPlay.textContent = "❚❚";
  btnPlay.setAttribute("aria-label", "Pausar");
});
audio.addEventListener("pause", () => {
  btnPlay.textContent = "▶";
  btnPlay.setAttribute("aria-label", "Reproducir");
});

barra.addEventListener("click", e => {
  const r = barra.getBoundingClientRect();
  const dur = audio.duration || 28;
  audio.currentTime = ((e.clientX - r.left) / r.width) * dur;
});

audio.addEventListener("ended", () => {
  if (modoSync) return;
  animandoLetra = false;
  intensidad = 1;
  ositos.activo = false;
  explosionDeCorazones();
  mostrar("final");
});

document.getElementById("btn-repetir").addEventListener("click", iniciarKaraoke);

/* ------------------------------------------------------------
   4. MODO SINCRONIZAR  (abrir index.html?sync)
   Sirve para sacar los tiempos exactos de cada línea.
------------------------------------------------------------ */
const modoSync = new URLSearchParams(location.search).has("sync");

if (modoSync) {
  mostrar("sync");
  const lineaEl = document.getElementById("sync-linea");
  const sigEl = document.getElementById("sync-siguiente");
  const btnEmpezar = document.getElementById("btn-sync-empezar");
  const resultado = document.getElementById("sync-resultado");
  const btnCopiar = document.getElementById("btn-sync-copiar");
  const textos = lineasTexto;
  let tiempos = [];
  let grabando = false;

  function mostrarPendiente() {
    const k = tiempos.length;
    lineaEl.textContent = k < textos.length ? "Siguiente: " + textos[k] : "¡Listo! Espera que termine la canción…";
    sigEl.textContent = textos[k + 1] ? "Después: " + textos[k + 1] : "";
  }

  function marcar() {
    if (!grabando || tiempos.length >= textos.length) return;
    tiempos.push(audio.currentTime);
    mostrarPendiente();
  }

  function terminar() {
    grabando = false;
    const nums = textos.map((_, k) =>
      (tiempos[k] !== undefined ? tiempos[k] : (tiempos[tiempos.length - 1] || 0) + 1).toFixed(2));
    resultado.value = "const TIEMPOS = [" + nums.join(", ") + "];\n";
    resultado.hidden = false;
    btnCopiar.hidden = false;
    btnEmpezar.textContent = "Repetir";
    btnEmpezar.hidden = false;
    lineaEl.textContent = "Copia esto y reemplaza const TIEMPOS en letra.js";
    sigEl.textContent = "";
  }

  btnEmpezar.addEventListener("click", () => {
    tiempos = [];
    grabando = true;
    resultado.hidden = true;
    btnCopiar.hidden = true;
    btnEmpezar.hidden = true;
    audio.currentTime = 0;
    audio.play();
    mostrarPendiente();
  });

  document.addEventListener("keydown", e => {
    if (e.code === "Space") { e.preventDefault(); marcar(); }
  });
  pantallas.sync.addEventListener("pointerdown", e => {
    if (e.target.closest("button, textarea")) return;
    marcar();
  });
  audio.addEventListener("ended", terminar);

  btnCopiar.addEventListener("click", () => {
    resultado.select();
    navigator.clipboard?.writeText(resultado.value)
      .then(() => (btnCopiar.textContent = "Copiado ✓"))
      .catch(() => document.execCommand("copy"));
  });
}
