// Reisen und Packlisten: liegen nur im Browser des Handys (localStorage).
// Falls der Speicher gesperrt ist, läuft die App trotzdem (dann nur bis zum Schließen).

const SCHLUESSEL = 'packliste-v1';

export const KATEGORIEN = [
  { id: 'kleidung', name: 'Kleidung', icon: 'shirt' },
  { id: 'bad', name: 'Bad & Kosmetik', icon: 'bath' },
  { id: 'strand', name: 'Strand & Sonne', icon: 'sun-medium' },
  { id: 'technik', name: 'Technik', icon: 'smartphone' },
  { id: 'dokumente', name: 'Dokumente & Geld', icon: 'file-text' },
  { id: 'gesundheit', name: 'Gesundheit', icon: 'pill' },
  { id: 'sonstiges', name: 'Sonstiges', icon: 'package' }
];

// Arten von Gepäck. Eine "Tasche" (z. B. Kosmetiktasche) kann selbst in einem Koffer stecken.
export const ARTEN = [
  { id: 'koffer', name: 'Koffer', icon: 'luggage' },
  { id: 'rucksack', name: 'Rucksack', icon: 'backpack' },
  { id: 'tasche', name: 'Tasche', icon: 'shopping-bag' }
];

// Beispiel-Liste für eine neue Reise. Alles lässt sich in der App ändern oder löschen.
// "beide": je ein Eintrag für jede Person (wird getrennt gepackt), sonst ein gemeinsamer Eintrag.
const BEISPIEL_SACHEN = {
  kleidung: { beide: ['Unterhosen', 'Socken', 'T-Shirts', 'Hosen', 'Shorts', 'Pullover', 'Schlafanzug', 'Schuhe', 'Badelatschen'] },
  bad: { beide: ['Zahnbürste', 'Deo', 'Haarbürste'], gemeinsam: ['Zahnpasta', 'Duschgel', 'Shampoo'] },
  strand: { beide: ['Badesachen', 'Sonnenbrille', 'Sonnenhut', 'Strandtuch'], gemeinsam: ['Sonnencreme'] },
  technik: { beide: ['Handy-Ladekabel', 'Kopfhörer'], gemeinsam: ['Powerbank', 'Reiseadapter'] },
  dokumente: { beide: ['Personalausweis', 'Krankenkassenkarte'], gemeinsam: ['Buchungsbestätigung', 'Geldbeutel'] },
  gesundheit: { gemeinsam: ['Reiseapotheke', 'Medikamente', 'Pflaster'] },
  sonstiges: { beide: ['Buch'], gemeinsam: ['Snacks für die Fahrt'] }
};

export const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const kopie = x => JSON.parse(JSON.stringify(x));
const kuerzel = p => p.name.charAt(0).toUpperCase();

function startPersonen() {
  return [
    { id: 'p1', name: 'Christian' },
    { id: 'p2', name: 'Lena' }
  ];
}

// Je Person ein Koffer und ein Rucksack, dazu eine gemeinsame Kosmetiktasche
function standardGepaeck(personen) {
  const farben = [[1, 6], [2, 3], [5, 6]];
  const gepaeck = [];
  personen.forEach((p, i) => {
    const [fk, fr] = farben[i % farben.length];
    gepaeck.push({ id: neueId(), name: `Koffer ${kuerzel(p)}`, art: 'koffer', farbe: fk, person: p.id, in: null });
    gepaeck.push({ id: neueId(), name: `Rucksack ${kuerzel(p)}`, art: 'rucksack', farbe: fr, person: p.id, in: null });
  });
  gepaeck.push({ id: neueId(), name: 'Kosmetiktasche', art: 'tasche', farbe: 4, person: null, in: null });
  return gepaeck;
}

function beispielSachen(personen) {
  const sachen = [];
  for (const [kategorie, teile] of Object.entries(BEISPIEL_SACHEN)) {
    for (const name of teile.beide ?? []) {
      for (const p of personen) sachen.push({ id: neueId(), name, anzahl: 1, kategorie, person: p.id, ort: null });
    }
    for (const name of teile.gemeinsam ?? []) sachen.push({ id: neueId(), name, anzahl: 1, kategorie, person: null, ort: null });
  }
  return sachen;
}

const leer = () => ({ format: 2, personen: startPersonen(), reisen: [], aktiv: null });

// Daten aus Version 0.1 (eine einzige Liste) werden zur ersten Reise "Urlaub"
function umziehen(alt) {
  if (alt.format === 2) return Object.assign(leer(), alt);
  const daten = leer();
  if (Array.isArray(alt.personen)) daten.personen = alt.personen;
  if (Array.isArray(alt.sachen)) {
    const reise = {
      id: neueId(), name: 'Urlaub', erstellt: Date.now(), etappe: alt.etappe ?? 'hin',
      gepaeck: (alt.gepaeck ?? []).map(g => ({ person: null, ...g })),
      sachen: alt.sachen
    };
    daten.reisen.push(reise);
  }
  return daten;
}

let daten = leer();
let speicherOk = true;

export function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (roh) daten = umziehen(JSON.parse(roh));
  } catch {
    speicherOk = false;
  }
  return daten;
}

export function speichern() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
    speicherOk = true;
  } catch {
    speicherOk = false;
  }
}

export const istSpeicherOk = () => speicherOk;
export const d = () => daten;

// Die gerade geöffnete Reise (oder null auf dem Startbildschirm)
export const r = () => daten.reisen.find(x => x.id === daten.aktiv) ?? null;

export const gepaeck = id => r()?.gepaeck.find(g => g.id === id);
export const sache = id => r()?.sachen.find(s => s.id === id);
export const person = id => daten.personen.find(p => p.id === id);

export function reiseOeffnen(id) {
  daten.aktiv = id;
  speichern();
}

// quelle: 'leer', 'beispiel' oder die ID einer bestehenden Reise (wird kopiert, alles wieder ungepackt)
export function neueReise(name, quelle) {
  const vorlage = daten.reisen.find(x => x.id === quelle);
  const reise = { id: neueId(), name, erstellt: Date.now(), etappe: 'hin', gepaeck: [], sachen: [] };
  if (vorlage) {
    reise.gepaeck = kopie(vorlage.gepaeck).map(g => ({ ...g, in: null }));
    reise.sachen = kopie(vorlage.sachen).map(s => ({ ...s, id: neueId(), ort: null }));
  } else {
    reise.gepaeck = standardGepaeck(daten.personen);
    if (quelle === 'beispiel') reise.sachen = beispielSachen(daten.personen);
  }
  daten.reisen.unshift(reise);
  daten.aktiv = reise.id;
  speichern();
  return reise;
}

export function reiseLoeschen(id) {
  daten.reisen = daten.reisen.filter(x => x.id !== id);
  if (daten.aktiv === id) daten.aktiv = null;
  speichern();
}

// Alles wieder auf "noch nicht gepackt" – z. B. für den Rückweg.
export function neuPacken(etappe) {
  const reise = r();
  reise.sachen.forEach(s => { s.ort = null; });
  reise.gepaeck.forEach(g => { if (g.art === 'tasche') g.in = null; });
  reise.etappe = etappe;
  speichern();
}

export function gepaeckLoeschen(id) {
  const reise = r();
  reise.sachen.forEach(s => { if (s.ort === id) s.ort = null; });
  reise.gepaeck.forEach(g => { if (g.in === id) g.in = null; });
  reise.gepaeck = reise.gepaeck.filter(g => g.id !== id);
  speichern();
}

// Person umbenennen; Gepäcknamen mit dem alten Kürzel ("Koffer C") wandern mit
export function personUmbenennen(id, name) {
  const p = person(id);
  const alt = kuerzel(p);
  p.name = name;
  const neu = kuerzel(p);
  for (const reise of daten.reisen) {
    for (const g of reise.gepaeck) {
      if (g.person === id && g.name.endsWith(' ' + alt)) g.name = g.name.slice(0, -alt.length) + neu;
    }
  }
  speichern();
}

export function exportieren() {
  return JSON.stringify({ app: 'packliste', exportiert: new Date().toISOString(), version: self.APP_VERSION, daten }, null, 2);
}

export function importieren(text) {
  const obj = JSON.parse(text);
  if (obj?.app !== 'packliste' || !(Array.isArray(obj.daten?.reisen) || Array.isArray(obj.daten?.sachen))) {
    throw new Error('Das ist keine Sicherungsdatei der Packliste.');
  }
  daten = umziehen(obj.daten);
  daten.aktiv = null;
  speichern();
}
