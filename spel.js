// Ordleik – dagens nynorske ord
"use strict";

const LENGD = 5;
const FORSOK = 6;
const STARTDATO = new Date(2026, 10, 18); // dag 1 = 18. november 2026
const LAGRING = "ordleik-nn";

// ---------- Dagens ord ----------

// Deterministisk stokking (same rekkjefølgje for alle) – Mulberry32
function lagTilfeldig(fro) {
  return function () {
    fro |= 0; fro = (fro + 0x6d2b79f5) | 0;
    let t = Math.imul(fro ^ (fro >>> 15), 1 | fro);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stokk(liste, fro) {
  const r = lagTilfeldig(fro);
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dagnummer(dato = new Date()) {
  const idag = new Date(dato.getFullYear(), dato.getMonth(), dato.getDate());
  return Math.round((idag - STARTDATO) / 86400000) + 1;
}

const STOKKA = stokk(SVAR, 20261118);
const DAG = dagnummer();
const SVARORD = STOKKA[(((DAG - 1) % STOKKA.length) + STOKKA.length) % STOKKA.length];

// ---------- Tilstand ----------

function lesLagra() {
  try {
    return JSON.parse(localStorage.getItem(LAGRING)) || {};
  } catch {
    return {};
  }
}
const lagra = lesLagra();
const stat = lagra.stat || { spelt: 0, vunne: 0, rekkje: 0, best: 0, fordeling: [0, 0, 0, 0, 0, 0], sisteDag: 0 };
let spel = lagra.spel && lagra.spel.dag === DAG ? lagra.spel : { dag: DAG, gjettingar: [], ferdig: false, vunne: false };
let noverande = "";
let opptatt = false;

function lagre() {
  localStorage.setItem(LAGRING, JSON.stringify({ spel, stat }));
}

// ---------- Vurdering ----------

function vurder(gjett, svar) {
  const res = Array(LENGD).fill("feil");
  const att = {};
  for (let i = 0; i < LENGD; i++) {
    if (gjett[i] === svar[i]) res[i] = "riktig";
    else att[svar[i]] = (att[svar[i]] || 0) + 1;
  }
  for (let i = 0; i < LENGD; i++) {
    if (res[i] !== "riktig" && att[gjett[i]] > 0) {
      res[i] = "finst";
      att[gjett[i]]--;
    }
  }
  return res;
}

// ---------- Brett og tastatur ----------

const brett = document.getElementById("brett");
const tastatur = document.getElementById("tastatur");
const meldingEl = document.getElementById("melding");

for (let r = 0; r < FORSOK; r++) {
  const rad = document.createElement("div");
  rad.className = "rad";
  for (let k = 0; k < LENGD; k++) {
    const rute = document.createElement("div");
    rute.className = "rute";
    rad.appendChild(rute);
  }
  brett.appendChild(rad);
}

const TASTRADER = [
  "qwertyuiopå".split(""),
  "asdfghjkløæ".split(""),
  ["enter", ..."zxcvbnm".split(""), "slett"],
];
const tastar = {};
for (const rad of TASTRADER) {
  const div = document.createElement("div");
  div.className = "tastrad";
  for (const t of rad) {
    const b = document.createElement("button");
    b.className = "tast";
    b.dataset.tast = t;
    if (t === "enter") { b.textContent = "Gjett"; b.classList.add("brei"); }
    else if (t === "slett") { b.textContent = "⌫"; b.classList.add("brei"); b.setAttribute("aria-label", "Slett"); }
    else { b.textContent = t; tastar[t] = b; }
    b.addEventListener("click", () => { b.blur(); trykk(t); });
    div.appendChild(b);
  }
  tastatur.appendChild(div);
}

const RANG = { feil: 1, finst: 2, riktig: 3 };
function fargeTast(bokstav, farge) {
  const b = tastar[bokstav];
  if (!b) return;
  const no = b.dataset.farge;
  if (!no || RANG[farge] > RANG[no]) {
    if (no) b.classList.remove(no);
    b.classList.add(farge);
    b.dataset.farge = farge;
  }
}

function radEl(r) { return brett.children[r]; }

function teiknNoverande() {
  const rad = radEl(spel.gjettingar.length);
  if (!rad) return;
  for (let k = 0; k < LENGD; k++) {
    const rute = rad.children[k];
    rute.textContent = noverande[k] || "";
    rute.classList.toggle("fylt", !!noverande[k]);
  }
}

function visRad(r, ord, animer) {
  const fargar = vurder(ord, SVARORD);
  const rad = radEl(r);
  return new Promise((ferdig) => {
    for (let k = 0; k < LENGD; k++) {
      const rute = rad.children[k];
      rute.textContent = ord[k];
      const set = () => { rute.classList.add(fargar[k]); fargeTast(ord[k], fargar[k]); };
      if (animer) {
        setTimeout(() => {
          rute.classList.add("snu");
          setTimeout(set, 250);
        }, k * 300);
      } else set();
    }
    setTimeout(ferdig, animer ? LENGD * 300 + 300 : 0);
  });
}


let meldingTid;
function melding(tekst, ms = 1500, html = false) {
  if (html) meldingEl.innerHTML = tekst; else meldingEl.textContent = tekst;
  meldingEl.classList.add("syn");
  clearTimeout(meldingTid);
  if (ms) meldingTid = setTimeout(() => meldingEl.classList.remove("syn"), ms);
}

function rist() {
  const rad = radEl(spel.gjettingar.length);
  rad.classList.remove("rist");
  void rad.offsetWidth;
  rad.classList.add("rist");
}


function trykk(t) {
  if (spel.ferdig || opptatt) return;
  if (t === "enter") return send();
  if (t === "slett") { noverande = noverande.slice(0, -1); return teiknNoverande(); }
  if (/^[a-zæøå]$/.test(t) && noverande.length < LENGD) {
    noverande += t;
    teiknNoverande();
  }
}

async function send() {
  if (noverande.length < LENGD) { melding("For få bokstavar"); return rist(); }
  if (!GYLDIGE.has(noverande)) { melding("Finst ikkje i Nynorskordboka"); return rist(); }

  opptatt = true;
  const r = spel.gjettingar.length;
  const ord = noverande;
  spel.gjettingar.push(ord);
  noverande = "";
  lagre();
  await visRad(r, ord, true);

  if (ord === SVARORD) {
    avslutt(true);
    for (let k = 0; k < LENGD; k++) {
      setTimeout(() => radEl(r).children[k].classList.add("hopp"), k * 100);
    }
    const ros = ["Genialt!", "Storarta!", "Imponerande!", "Flott!", "Bra!", "Puh, det var nære!"];
    melding(ros[r], 2000);
  } else if (spel.gjettingar.length === FORSOK) {
    avslutt(false);
    visSvar();
  }
  opptatt = false;
  if (spel.ferdig) setTimeout(opneStatistikk, 2200);
}

function avslutt(vann) {
  spel.ferdig = true;
  spel.vunne = vann;
  stat.spelt++;
  if (vann) {
    stat.vunne++;
    stat.rekkje = stat.sisteDag === DAG - 1 ? stat.rekkje + 1 : 1;
    stat.best = Math.max(stat.best, stat.rekkje);
    stat.fordeling[spel.gjettingar.length - 1]++;
  } else {
    stat.rekkje = 0;
  }
  stat.sisteDag = DAG;
  lagre();
}

function ordbokLenke(ord) {
  return `https://ordbokene.no/nn/search?q=${encodeURIComponent(ord)}&dict=nn`;
}

function visSvar() {
  melding(`Ordet var <a href="${ordbokLenke(SVARORD)}" target="_blank" rel="noopener">${SVARORD.toUpperCase()}</a>`, 0, true);
}

// ---------- Statistikk og deling ----------

const statDlg = document.getElementById("statistikk");
const hjelpDlg = document.getElementById("hjelp");

function opneStatistikk() {
  document.getElementById("s-spelt").textContent = stat.spelt;
  document.getElementById("s-vunne").textContent = stat.spelt ? Math.round((100 * stat.vunne) / stat.spelt) : 0;
  const rekkje = stat.sisteDag >= DAG - 1 ? stat.rekkje : 0;
  document.getElementById("s-rekkje").textContent = rekkje;
  document.getElementById("s-best").textContent = stat.best;

  const maks = Math.max(1, ...stat.fordeling);
  const ford = document.getElementById("fordeling");
  ford.innerHTML = "";
  stat.fordeling.forEach((n, i) => {
    const l = document.createElement("div");
    l.className = "linje";
    const no = spel.ferdig && spel.vunne && spel.gjettingar.length === i + 1;
    l.innerHTML = `<span>${i + 1}</span><div class="stolpe${no ? " no" : ""}" style="width:${Math.max(7, (100 * n) / maks)}%">${n}</div>`;
    ford.appendChild(l);
  });

  const res = document.getElementById("resultat");
  res.innerHTML = "";
  if (spel.ferdig) {
    res.innerHTML =
      `<p>Dagens ord: <a href="${ordbokLenke(SVARORD)}" target="_blank" rel="noopener"><b>${SVARORD.toUpperCase()}</b></a> (sjå i ordboka)</p>` +
      `<p>Neste ord om</p><div class="nedtelling" id="nedtelling"></div>`;
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "Del resultat";
    del.addEventListener("click", delResultat);
    res.appendChild(del);
    oppdaterNedtelling();
  }
  if (!statDlg.open) statDlg.showModal();
}

function oppdaterNedtelling() {
  const el = document.getElementById("nedtelling");
  if (!el) return;
  const no = new Date();
  const midnatt = new Date(no.getFullYear(), no.getMonth(), no.getDate() + 1);
  const s = Math.max(0, Math.floor((midnatt - no) / 1000));
  const p = (n) => String(n).padStart(2, "0");
  el.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  if (s === 0) location.reload();
}
setInterval(oppdaterNedtelling, 1000);

async function delResultat() {
  const emoji = { riktig: "🟩", finst: "🟨", feil: "⬛" };
  const rader = spel.gjettingar.map((g) => vurder(g, SVARORD).map((f) => emoji[f]).join(""));
  const tekst = `Ordleik nynorsk #${DAG} ${spel.vunne ? spel.gjettingar.length : "X"}/${FORSOK}\n\n${rader.join("\n")}`;
  try {
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ text: tekst });
    else { await navigator.clipboard.writeText(tekst); melding("Kopiert til utklippstavla"); }
  } catch {
    melding("Klarte ikkje å dele");
  }
}


document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || statDlg.open || hjelpDlg.open) return;
  if (e.key === "Enter") trykk("enter");
  else if (e.key === "Backspace") trykk("slett");
  else if (e.key.length === 1) trykk(e.key.toLowerCase());
});

document.getElementById("stat-knapp").addEventListener("click", opneStatistikk);
document.getElementById("hjelp-knapp").addEventListener("click", () => hjelpDlg.showModal());
document.querySelectorAll("dialog .lukk").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); })
);


(async function start() {
  for (let r = 0; r < spel.gjettingar.length; r++) await visRad(r, spel.gjettingar[r], false);
  if (spel.ferdig) {
    if (!spel.vunne) visSvar();
    setTimeout(opneStatistikk, 400);
  } else if (!localStorage.getItem(LAGRING)) {
    hjelpDlg.showModal();
  }
})();
