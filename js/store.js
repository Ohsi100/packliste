// Packliste: liegt nur im Browser des Handys (localStorage).
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

// Startliste beim allerersten Öffnen. Alles lässt sich in der App ändern oder löschen.
// "beide": je ein Eintrag für jede Person (wird getrennt gepackt), sonst ein gemeinsamer Eintrag.
const START_SACHEN = {
  kleidung: { beide: ['Unterhosen', 'Socken', 'T-Shirts', 'Hosen', 'Shorts', 'Pullover', 'Schlafanzug', 'Schuhe', 'Badelatschen'] },
  bad: { beide: ['Zahnbürste', 'Deo', 'Haarbürste'], gemeinsam: ['Zahnpasta', 'Duschgel', 'Shampoo'] },
  strand: { beide: ['Badesachen', 'Sonnenbrille', 'Sonnenhut', 'Strandtuch'], gemeinsam: ['Sonnencreme'] },
  technik: { beide: ['Handy-Ladekabel', 'Kopfhörer'], gemeinsam: ['Powerbank', 'Reiseadapter'] },
  dokumente: { beide: ['Personalausweis', 'Krankenkassenkarte'], gemeinsam: ['Buchungsbestätigung', 'Geldbeutel'] },
  gesundheit: { gemeinsam: ['Reiseapotheke', 'Medikamente', 'Pflaster'] },
  sonstiges: { beide: ['Buch'], gemeinsam: ['Snacks für die Fahrt'] }
};

export const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function startDaten() {
  const personen = [
    { id: 'p1', name: 'Christian' },
    { id: 'p2', name: 'Lena' }
  ];
  const sachen = [];
  for (const [kategorie, teile] of Object.entries(START_SACHEN)) {
    for (const name of teile.beide ?? []) {
      for (const p of personen) sachen.push({ id: neueId(), name, anzahl: 1, kategorie, person: p.id, ort: null });
    }
    for (const name of teile.gemeinsam ?? []) sachen.push({ id: neueId(), name, anzahl: 1, kategorie, person: null, ort: null });
  }
  return {
    format: 1,
    etappe: 'hin',   // 'hin' oder 'rueck'
    personen,        // person: null bei einer Sache heißt "gemeinsam"
    gepaeck: [
      { id: 'koffer1', name: 'Koffer 1', art: 'koffer', farbe: 1, in: null },
      { id: 'koffer2', name: 'Koffer 2', art: 'koffer', farbe: 2, in: null },
      { id: 'rucksack', name: 'Rucksack', art: 'rucksack', farbe: 3, in: null },
      { id: 'kosmetik', name: 'Kosmetiktasche', art: 'tasche', farbe: 4, in: null }
    ],
    sachen
  };
}

let daten = startDaten();
let speicherOk = true;

export function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (roh) daten = Object.assign(startDaten(), JSON.parse(roh));
    else speichern();
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

export const gepaeck = id => daten.gepaeck.find(g => g.id === id);
export const sache = id => daten.sachen.find(s => s.id === id);
export const person = id => daten.personen.find(p => p.id === id);

// Alles wieder auf "noch nicht gepackt" – z. B. für den Rückweg.
export function neuPacken(etappe) {
  daten.sachen.forEach(s => { s.ort = null; });
  daten.gepaeck.forEach(g => { if (g.art === 'tasche') g.in = null; });
  daten.etappe = etappe;
  speichern();
}

export function gepaeckLoeschen(id) {
  daten.sachen.forEach(s => { if (s.ort === id) s.ort = null; });
  daten.gepaeck.forEach(g => { if (g.in === id) g.in = null; });
  daten.gepaeck = daten.gepaeck.filter(g => g.id !== id);
  speichern();
}

export function exportieren() {
  return JSON.stringify({ app: 'packliste', exportiert: new Date().toISOString(), version: self.APP_VERSION, daten }, null, 2);
}

export function importieren(text) {
  const obj = JSON.parse(text);
  if (obj?.app !== 'packliste' || !Array.isArray(obj.daten?.sachen)) {
    throw new Error('Das ist keine Sicherungsdatei der Packliste.');
  }
  daten = Object.assign(startDaten(), obj.daten);
  speichern();
}

export function startlisteLaden() {
  daten = startDaten();
  speichern();
}
