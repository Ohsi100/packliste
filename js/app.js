// Hauptprogramm: verwaltet die drei Seiten (Packliste, Gepäck, Mehr) und die Bottom Sheets.
import * as store from './store.js';
import { KATEGORIEN, ARTEN } from './store.js';
import { icon } from './icons.js';
import { toast, bestaetigen, frageText, sheet, vibriere } from './ui.js';
import { esc } from './util.js';

const app = document.getElementById('app');
const titelEl = document.getElementById('titel');
const tabbar = document.getElementById('tabbar');
const fab = document.getElementById('fab');

// Anzeige-Einstellungen der Packliste (nur solange die App offen ist)
const ansicht = { status: 'offen', person: 'alle', suche: '' };

// ---------- Start ----------
function start() {
  store.laden();
  const tabs = [
    ['liste', '#/', 'list-checks', 'Packliste'],
    ['gepaeck', '#/gepaeck', 'luggage', 'Gepäck'],
    ['mehr', '#/mehr', 'settings', 'Mehr']
  ];
  tabbar.innerHTML = tabs.map(([tab, , ico, name]) => `<ion-tab-button tab="${tab}">${icon(ico, 22)}<ion-label>${name}</ion-label></ion-tab-button>`).join('');
  // Ohne <ion-tabs> wechselt Ionic die Seite nicht selbst. Wir hören auf das Tipp-Ereignis und wechseln selbst.
  tabbar.addEventListener('ionTabButtonClick', e => {
    const ziel = tabs.find(t => t[0] === e.detail.tab)?.[1];
    if (ziel) location.hash = ziel;
  });
  fab.innerHTML = `<ion-fab-button aria-label="Sache hinzufügen">${icon('plus', 26)}</ion-fab-button>`;
  fab.addEventListener('click', () => sacheBearbeiten(null));
  app.addEventListener('click', klick);
  window.addEventListener('hashchange', zeichnen);
  zeichnen();
  if (!store.istSpeicherOk()) toast('Achtung: Der Browser speichert gerade nichts. Änderungen gehen beim Schließen verloren.', { dauer: 6000, farbe: 'danger' });
  serviceWorker();
}

function zeichnen() {
  const seite = location.hash.replace(/^#\/?/, '') || 'liste';
  tabbar.selectedTab = seite;
  fab.hidden = seite === 'mehr';
  if (seite === 'gepaeck') seiteGepaeck();
  else if (seite === 'mehr') seiteMehr();
  else seiteListe();
}

// ---------- Bausteine ----------
const gepackteZahl = () => store.d().sachen.filter(s => s.ort).length;
const personNr = id => store.d().personen.findIndex(p => p.id === id) + 1;
const art = g => ARTEN.find(a => a.id === g.art) ?? ARTEN[0];
const kofferListe = () => store.d().gepaeck.filter(g => g.art !== 'tasche');

// Kreis mit Anfangsbuchstaben der Person
function avatar(personId, groesse = '') {
  const p = store.person(personId);
  if (!p) return '';
  return `<span class="avatar p${personNr(personId)} ${groesse}" title="${esc(p.name)}" aria-label="${esc(p.name)}">${esc(p.name.charAt(0).toUpperCase())}</span>`;
}

// "Kosmetiktasche in Koffer 1"
function ortText(g) {
  const aussen = g.in && store.gepaeck(g.in);
  return aussen ? `${g.name} (in ${aussen.name})` : g.name;
}

const ortChip = g => `<span class="ort-chip g${g.farbe}">${icon(art(g).icon, 14)}${esc(ortText(g))}</span>`;

function leer(ico, titel, text, aktion = '') {
  return `<div class="leer">${icon(ico, 40)}<h3>${titel}</h3><p>${text}</p>${aktion}</div>`;
}

const balken = x => `<ion-progress-bar value="${Math.min(1, x).toFixed(3)}"></ion-progress-bar>`;
const etappeName = () => store.d().etappe === 'rueck' ? 'Rückweg' : 'Hinweg';

// ---------- Seite: Packliste ----------
function seiteListe() {
  titelEl.textContent = 'Packliste';
  const { sachen, personen } = store.d();
  const gepackt = gepackteZahl();
  const fertig = sachen.length > 0 && gepackt === sachen.length;

  const kopf = fertig
    ? `<div class="karte fertig-karte">${icon('party-popper', 32)}<div><h3>Alles eingepackt!</h3><p>Gute Reise – ${etappeName()} kann losgehen.</p></div></div>`
    : `<div class="karte fortschritt-karte">
        <div class="zeile"><div class="wachsen">
          <div class="gross zahlen">${gepackt} <span>von ${sachen.length}</span></div>
          <div class="hinweis">Sachen eingepackt</div>
        </div><ion-chip class="akzent">${icon(store.d().etappe === 'rueck' ? 'rotate-ccw' : 'luggage', 16)}${etappeName()}</ion-chip></div>
        ${balken(sachen.length ? gepackt / sachen.length : 0)}
      </div>`;

  const status = ['offen', 'gepackt', 'alle'];
  const statusZahl = { offen: sachen.length - gepackt, gepackt, alle: sachen.length };
  const statusName = { offen: 'Offen', gepackt: 'Gepackt', alle: 'Alle' };
  const filterPersonen = [['alle', 'Alle'], ...personen.map(p => [p.id, p.name]), ['gemeinsam', 'Gemeinsam']];

  app.innerHTML = `${kopf}
    <ion-segment value="${ansicht.status}" id="status">
      ${status.map(s => `<ion-segment-button value="${s}"><ion-label>${statusName[s]} <span class="zahlen">${statusZahl[s]}</span></ion-label></ion-segment-button>`).join('')}
    </ion-segment>
    <div class="chip-reihe" role="group" aria-label="Für wen">
      ${filterPersonen.map(([id, name]) => `<button class="wahl ${ansicht.person === id ? 'an' : ''}" data-person-filter="${id}">${id.startsWith('p') ? avatar(id, 'klein') : ''}${esc(name)}</button>`).join('')}
    </div>
    <ion-searchbar id="suche" placeholder="Suchen" value="${esc(ansicht.suche)}" debounce="100"></ion-searchbar>
    <div id="liste"></div>`;

  app.querySelector('#status').addEventListener('ionChange', e => { ansicht.status = e.detail.value; seiteListe(); });
  app.querySelector('#suche').addEventListener('ionInput', e => { ansicht.suche = e.detail.value ?? ''; listeZeichnen(); });
  listeZeichnen();
}

function listeZeichnen() {
  const ziel = app.querySelector('#liste');
  const suche = ansicht.suche.trim().toLowerCase();
  const sichtbar = store.d().sachen.filter(s =>
    (ansicht.status === 'alle' || (ansicht.status === 'offen') === !s.ort) &&
    (ansicht.person === 'alle' || (ansicht.person === 'gemeinsam' ? !s.person : s.person === ansicht.person)) &&
    (!suche || s.name.toLowerCase().includes(suche))
  );

  if (!sichtbar.length) {
    if (suche) {
      ziel.innerHTML = leer('search', 'Nichts gefunden', `„${esc(ansicht.suche)}“ steht nicht in dieser Ansicht.`,
        `<ion-button data-neu-aus-suche>${icon('plus', 20)}„${esc(ansicht.suche)}“ hinzufügen</ion-button>`);
    } else if (ansicht.status === 'offen' && store.d().sachen.length) {
      ziel.innerHTML = leer('package-check', 'Hier ist alles eingepackt', 'Unter „Gepackt“ siehst du, was wo steckt.');
    } else {
      ziel.innerHTML = leer('package-open', 'Noch nichts da', 'Leg los mit der ersten Sache für den Koffer.',
        `<ion-button data-neu>${icon('plus', 20)}Sache hinzufügen</ion-button>`);
    }
    return;
  }

  const [rechts, ...links] = kofferListe();
  ziel.innerHTML = KATEGORIEN.map(k => {
    const teil = sichtbar.filter(s => s.kategorie === k.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'de') || personNr(a.person) - personNr(b.person));
    if (!teil.length) return '';
    return `<h2 class="abschnitt">${icon(k.icon, 20)}${k.name}</h2>
      <ion-list class="gruppe" lines="full">${teil.map(s => sacheZeile(s, rechts, links.slice(0, 2))).join('')}</ion-list>`;
  }).join('') + `<p class="hinweis mittig wisch-tipp">${icon('info', 16)}Tippen: Gepäck wählen · Wischen: ${rechts ? `→ ${esc(rechts.name)}` : ''}${links[0] ? `, ← ${esc(links[0].name)}` : ''}</p>`;
}

// Eine Zeile der Packliste. Nach rechts wischen: erstes Gepäck. Nach links: zweites (ganz durchwischen) und drittes.
function sacheZeile(s, rechts, links) {
  const g = s.ort && store.gepaeck(s.ort);
  const option = (ziel, ganz) => `<ion-item-option class="g${ziel.farbe}" data-wisch="${ziel.id}" ${ganz ? 'expandable' : ''}>
    <span class="option-inhalt">${icon(art(ziel).icon, 22)}<span>${s.ort === ziel.id ? 'Raus' : esc(ziel.name)}</span></span></ion-item-option>`;
  // Die äußerste Option links wird beim ganzen Durchwischen ausgelöst, sie muss also zuletzt stehen.
  const linksOptionen = links.slice().reverse();
  return `<ion-item-sliding data-sache="${s.id}">
    ${rechts ? `<ion-item-options side="start">${option(rechts, true)}</ion-item-options>` : ''}
    <ion-item button detail="false" class="sache ${g ? 'gepackt' : ''}" data-packen="${s.id}">
      <span slot="start" class="haken ${g ? 'g' + g.farbe : ''}">${g ? icon('check', 18) : ''}</span>
      <ion-label>
        <h3>${esc(s.name)}${s.anzahl > 1 ? ` <span class="anzahl zahlen">× ${s.anzahl}</span>` : ''}</h3>
        <p class="unterzeile">${s.person ? avatar(s.person, 'klein') + esc(store.person(s.person).name) : '<span class="gemeinsam">Gemeinsam</span>'}${g ? ortChip(g) : ''}</p>
      </ion-label>
      <ion-button slot="end" fill="clear" class="stift" data-bearbeiten="${s.id}" aria-label="${esc(s.name)} bearbeiten">${icon('pencil', 20)}</ion-button>
    </ion-item>
    ${linksOptionen.length ? `<ion-item-options side="end">${linksOptionen.map((z, i) => option(z, i === linksOptionen.length - 1)).join('')}</ion-item-options>` : ''}
  </ion-item-sliding>`;
}

// Ganzes Durchwischen löst ionSwipe aus (nicht click)
app.addEventListener('ionSwipe', e => {
  const option = e.target.querySelector('ion-item-option[expandable]');
  const zeile = e.target.closest('[data-sache]');
  if (option && zeile) wischPacken(zeile.dataset.sache, option.dataset.wisch, zeile);
});

function wischPacken(sacheId, gepaeckId, zeile) {
  const s = store.sache(sacheId);
  einpacken(s, s.ort === gepaeckId ? null : gepaeckId);
  zeile?.close?.();
}

// Sache einpacken (oder mit null wieder auspacken), mit "Rückgängig"
function einpacken(s, ort) {
  const vorher = s.ort;
  if (vorher === ort) return;
  s.ort = ort;
  store.speichern();
  const alle = gepackteZahl() === store.d().sachen.length;
  vibriere(alle ? 'fertig' : 'gepackt');
  const g = ort && store.gepaeck(ort);
  toast(g ? `${s.name} → ${ortText(g)}` : `${s.name}: wieder ausgepackt`, {
    knopf: { text: 'Rückgängig', aktion: () => { s.ort = vorher; store.speichern(); zeichnen(); } }
  });
  zeichnen();
}

// ---------- Sheet: Wohin gepackt? ----------
async function packenSheet(id) {
  const s = store.sache(id);
  const { gepaeck } = store.d();
  const knopf = g => `<button class="ziel-knopf g${g.farbe} ${s.ort === g.id ? 'an' : ''}" data-ziel="${g.id}">
    <span class="ziel-icon">${icon(art(g).icon, 28)}</span>
    <span class="ziel-name">${esc(g.name)}</span>
    ${g.in && store.gepaeck(g.in) ? `<span class="ziel-unter">in ${esc(store.gepaeck(g.in).name)}</span>` : ''}
    ${s.ort === g.id ? `<span class="ziel-haken">${icon('check', 18)}</span>` : ''}
  </button>`;
  const m = sheet(`
    <div class="sheet-kopf">
      <h2>${esc(s.name)}${s.anzahl > 1 ? ` <span class="anzahl zahlen">× ${s.anzahl}</span>` : ''}</h2>
      <p class="hinweis">${s.person ? `Für ${esc(store.person(s.person).name)} · ` : ''}Wohin hast du es gepackt?</p>
    </div>
    <div class="ziel-raster">${gepaeck.map(knopf).join('')}</div>
    <div class="sheet-knoepfe">
      ${s.ort ? `<ion-button expand="block" fill="outline" data-ziel="">${icon('rotate-ccw', 20)}Wieder auspacken</ion-button>` : ''}
      <ion-button expand="block" fill="clear" data-bearbeiten-sheet>${icon('pencil', 20)}Bearbeiten</ion-button>
    </div>`);
  m.addEventListener('click', e => {
    const z = e.target.closest('[data-ziel]');
    if (z) { m.dismiss(); einpacken(s, z.dataset.ziel || null); return; }
    if (e.target.closest('[data-bearbeiten-sheet]')) { m.dismiss(); sacheBearbeiten(s.id); }
  });
}

// ---------- Sheet: Sache anlegen / bearbeiten ----------
async function sacheBearbeiten(id, vorschlagName = '') {
  const daten = store.d();
  const s = id ? store.sache(id) : null;
  const wahl = {
    name: s?.name ?? vorschlagName,
    anzahl: s?.anzahl ?? 1,
    kategorie: s?.kategorie ?? 'kleidung',
    person: s ? (s.person ?? 'gemeinsam') : (ansicht.person !== 'alle' ? ansicht.person : 'beide'),
    ort: s?.ort ?? ''
  };
  const personWahl = [...daten.personen.map(p => [p.id, p.name]), ...(s ? [] : [['beide', 'Beide']]), ['gemeinsam', 'Gemeinsam']];
  const chips = (feld, optionen) => optionen.map(([wert, text, extra = '']) =>
    `<button class="wahl ${wahl[feld] === wert ? 'an' : ''}" data-feld="${feld}" data-wert="${wert}">${extra}${esc(text)}</button>`).join('');

  const m = sheet(`
    <div class="sheet-kopf"><h2>${s ? 'Sache bearbeiten' : 'Neue Sache'}</h2></div>
    <ion-input id="name" label="Was?" label-placement="stacked" fill="outline" placeholder="z. B. T-Shirts" value="${esc(wahl.name)}" maxlength="60" autocapitalize="sentences" enterkeyhint="done"></ion-input>
    <div class="feld-titel">Anzahl</div>
    <div class="stepper">
      <ion-button fill="outline" data-schritt="-1" aria-label="Weniger">${icon('minus', 20)}</ion-button>
      <span id="anzahl" class="zahlen">${wahl.anzahl}</span>
      <ion-button fill="outline" data-schritt="1" aria-label="Mehr">${icon('plus', 20)}</ion-button>
    </div>
    <div class="feld-titel">Für wen?</div>
    <div class="chip-reihe umbruch">${chips('person', personWahl.map(([wert, name]) => [wert, name, wert.startsWith('p') ? avatar(wert, 'klein') : '']))}</div>
    <p class="hinweis klein-text" id="beide-hinweis" ${wahl.person === 'beide' ? '' : 'hidden'}>Legt zwei Einträge an, die ihr getrennt einpacken könnt.</p>
    <div class="feld-titel">Kategorie</div>
    <div class="chip-reihe umbruch">${chips('kategorie', KATEGORIEN.map(k => [k.id, k.name, icon(k.icon, 16)]))}</div>
    <div class="feld-titel">Eingepackt in</div>
    <div class="chip-reihe umbruch">${chips('ort', [['', 'Noch nicht'], ...daten.gepaeck.map(g => [g.id, g.name, icon(art(g).icon, 16)])])}</div>
    <div class="sheet-knoepfe">
      <ion-button expand="block" data-speichern>${icon('check', 20)}Speichern</ion-button>
      ${s ? `<ion-button expand="block" fill="clear" color="danger" data-loeschen>${icon('trash-2', 20)}Löschen</ion-button>` : ''}
    </div>`);

  const nameEl = m.querySelector('#name');
  if (!s) setTimeout(() => nameEl.setFocus?.(), 350);
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') speichern(); });

  function speichern() {
    const name = String(nameEl.value ?? '').trim();
    if (!name) {
      nameEl.classList.add('ion-invalid', 'ion-touched');
      nameEl.errorText = 'Bitte einen Namen eingeben';
      nameEl.setFocus?.();
      return;
    }
    const basis = { name, anzahl: wahl.anzahl, kategorie: wahl.kategorie, ort: wahl.ort || null };
    if (s) {
      Object.assign(s, basis, { person: wahl.person === 'gemeinsam' ? null : wahl.person });
    } else {
      const fuer = wahl.person === 'beide' ? daten.personen.map(p => p.id) : [wahl.person === 'gemeinsam' ? null : wahl.person];
      for (const p of fuer) daten.sachen.push({ id: store.neueId(), ...basis, person: p });
    }
    store.speichern();
    m.dismiss();
    toast(s ? 'Gespeichert' : wahl.person === 'beide' ? `${name} für beide hinzugefügt` : `${name} hinzugefügt`);
    ansicht.suche = '';
    zeichnen();
  }

  m.addEventListener('click', async e => {
    const chip = e.target.closest('[data-feld]');
    if (chip) {
      wahl[chip.dataset.feld] = chip.dataset.wert;
      chip.parentElement.querySelectorAll('.wahl').forEach(c => c.classList.toggle('an', c === chip));
      m.querySelector('#beide-hinweis').hidden = wahl.person !== 'beide';
      vibriere('tipp');
      return;
    }
    const schritt = e.target.closest('[data-schritt]');
    if (schritt) {
      wahl.anzahl = Math.max(1, Math.min(99, wahl.anzahl + Number(schritt.dataset.schritt)));
      m.querySelector('#anzahl').textContent = wahl.anzahl;
      return;
    }
    if (e.target.closest('[data-speichern]')) speichern();
    if (e.target.closest('[data-loeschen]')) {
      if (!await bestaetigen(`${s.name} löschen?`, 'Die Sache verschwindet aus der Packliste.', 'Löschen')) return;
      daten.sachen = daten.sachen.filter(x => x !== s);
      store.speichern();
      m.dismiss();
      toast(`${s.name} gelöscht`, { knopf: { text: 'Rückgängig', aktion: () => { daten.sachen.push(s); store.speichern(); zeichnen(); } } });
      zeichnen();
    }
  });
}

// ---------- Seite: Gepäck ----------
function seiteGepaeck() {
  titelEl.textContent = 'Gepäck';
  const { gepaeck, sachen } = store.d();
  const inhalt = g => sachen.filter(s => s.ort === g.id).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const sacheChip = s => `<button class="sache-chip" data-packen="${s.id}">${s.person ? avatar(s.person, 'mini') : ''}${esc(s.name)}${s.anzahl > 1 ? ` <span class="zahlen">×${s.anzahl}</span>` : ''}</button>`;

  const karte = (g, verschachtelt = false) => {
    const drin = inhalt(g);
    const taschen = gepaeck.filter(t => t.in === g.id);
    const gesamt = drin.length + taschen.reduce((n, t) => n + inhalt(t).length, 0);
    const aussen = g.in && store.gepaeck(g.in);
    const unter = [`${drin.length} ${drin.length === 1 ? 'Sache' : 'Sachen'}`];
    if (taschen.length) unter[0] = `${gesamt} Sachen insgesamt`;
    if (g.art === 'tasche' && !verschachtelt) unter.push(aussen ? `steckt in ${esc(aussen.name)}` : 'steckt noch in keinem Koffer');
    return `<section class="gepaeck-karte g${g.farbe} ${verschachtelt ? 'innen' : ''}">
      <div class="gepaeck-kopf">
        <span class="gepaeck-icon">${icon(art(g).icon, verschachtelt ? 22 : 28)}</span>
        <div class="wachsen"><h3>${esc(g.name)}</h3><p>${unter.join(' · ')}</p></div>
        <ion-button fill="clear" data-gepaeck="${g.id}" aria-label="${esc(g.name)} bearbeiten">${icon('pencil', 20)}</ion-button>
      </div>
      ${drin.length ? `<div class="chip-reihe umbruch">${drin.map(sacheChip).join('')}</div>` : `<p class="hinweis leer-klein">Noch leer</p>`}
      ${taschen.map(t => karte(t, true)).join('')}
    </section>`;
  };

  // Taschen, die in einem Koffer stecken, erscheinen innerhalb dieses Koffers
  const oben = gepaeck.filter(g => !(g.in && store.gepaeck(g.in)));
  app.innerHTML = `${oben.map(g => karte(g)).join('')}
    <ion-button expand="block" fill="outline" data-gepaeck="neu">${icon('plus', 20)}Gepäckstück hinzufügen</ion-button>
    <p class="hinweis mittig klein-text">Tipp: Eine Tasche (z. B. Kosmetiktasche) kann selbst in einem Koffer stecken.</p>`;
}

async function gepaeckBearbeiten(id) {
  const daten = store.d();
  const g = id === 'neu' ? null : store.gepaeck(id);
  const benutzt = new Set(daten.gepaeck.map(x => x.farbe));
  const wahl = {
    name: g?.name ?? '',
    art: g?.art ?? 'koffer',
    farbe: String(g?.farbe ?? ([1, 2, 3, 4, 5, 6].find(f => !benutzt.has(f)) ?? 1)),
    in: g?.in ?? ''
  };
  const moegliche = daten.gepaeck.filter(x => x.art !== 'tasche' && x.id !== g?.id);
  const chips = (feld, optionen) => optionen.map(([wert, text, extra = '']) =>
    `<button class="wahl ${wahl[feld] === wert ? 'an' : ''}" data-feld="${feld}" data-wert="${wert}">${extra}${esc(text)}</button>`).join('');

  const m = sheet(`
    <div class="sheet-kopf"><h2>${g ? 'Gepäckstück bearbeiten' : 'Neues Gepäckstück'}</h2></div>
    <ion-input id="name" label="Name" label-placement="stacked" fill="outline" placeholder="z. B. Handgepäck" value="${esc(wahl.name)}" maxlength="30"></ion-input>
    <div class="feld-titel">Art</div>
    <div class="chip-reihe umbruch">${chips('art', ARTEN.map(a => [a.id, a.name, icon(a.icon, 16)]))}</div>
    <div id="in-bereich" ${wahl.art === 'tasche' ? '' : 'hidden'}>
      <div class="feld-titel">Steckt in</div>
      <div class="chip-reihe umbruch">${chips('in', [['', 'Noch nirgends'], ...moegliche.map(x => [x.id, x.name, icon(art(x).icon, 16)])])}</div>
    </div>
    <div class="feld-titel">Farbe</div>
    <div class="farben">${[1, 2, 3, 4, 5, 6].map(f => `<button class="farbe g${f} ${wahl.farbe === String(f) ? 'an' : ''}" data-feld="farbe" data-wert="${f}" aria-label="Farbe ${f}">${icon('check', 18)}</button>`).join('')}</div>
    <div class="sheet-knoepfe">
      <ion-button expand="block" data-speichern>${icon('check', 20)}Speichern</ion-button>
      ${g && daten.gepaeck.length > 1 ? `<ion-button expand="block" fill="clear" color="danger" data-loeschen>${icon('trash-2', 20)}Löschen</ion-button>` : ''}
    </div>`);

  const nameEl = m.querySelector('#name');
  m.addEventListener('click', async e => {
    const chip = e.target.closest('[data-feld]');
    if (chip) {
      wahl[chip.dataset.feld] = chip.dataset.wert;
      chip.parentElement.querySelectorAll('[data-feld]').forEach(c => c.classList.toggle('an', c === chip));
      m.querySelector('#in-bereich').hidden = wahl.art !== 'tasche';
      return;
    }
    if (e.target.closest('[data-speichern]')) {
      const name = String(nameEl.value ?? '').trim();
      if (!name) { nameEl.classList.add('ion-invalid', 'ion-touched'); nameEl.errorText = 'Bitte einen Namen eingeben'; return; }
      const neu = { name, art: wahl.art, farbe: Number(wahl.farbe), in: wahl.art === 'tasche' ? (wahl.in || null) : null };
      if (g) Object.assign(g, neu);
      else daten.gepaeck.push({ id: store.neueId(), ...neu });
      // Wird ein Koffer zur Tasche, dürfen keine anderen Taschen mehr darin stecken
      if (g && g.art === 'tasche') daten.gepaeck.forEach(x => { if (x.in === g.id) x.in = null; });
      store.speichern();
      m.dismiss();
      toast('Gespeichert');
      zeichnen();
    }
    if (e.target.closest('[data-loeschen]')) {
      const anzahl = daten.sachen.filter(s => s.ort === g.id).length;
      if (!await bestaetigen(`${g.name} löschen?`, anzahl ? `${anzahl} Sachen darin gelten dann wieder als „noch nicht eingepackt“.` : 'Das Gepäckstück ist leer.', 'Löschen')) return;
      store.gepaeckLoeschen(g.id);
      m.dismiss();
      toast(`${g.name} gelöscht`);
      zeichnen();
    }
  });
}

// ---------- Seite: Mehr ----------
function seiteMehr() {
  titelEl.textContent = 'Mehr';
  const { etappe, personen, sachen } = store.d();
  app.innerHTML = `
    <div class="karte">
      <h3>${icon('rotate-ccw', 22)}Neu packen</h3>
      <p>Für den ${etappe === 'hin' ? 'Rückweg' : 'nächsten Urlaub'}: Alle Sachen gelten wieder als „noch nicht eingepackt“. Die Liste selbst bleibt erhalten.</p>
      <ion-segment value="${etappe}" id="etappe">
        <ion-segment-button value="hin"><ion-label>Hinweg</ion-label></ion-segment-button>
        <ion-segment-button value="rueck"><ion-label>Rückweg</ion-label></ion-segment-button>
      </ion-segment>
      <ion-button expand="block" data-neu-packen>${icon('rotate-ccw', 20)}Jetzt neu packen</ion-button>
    </div>

    <div class="karte">
      <h3>${icon('sparkles', 22)}Wer fährt mit?</h3>
      <ion-list class="gruppe" lines="full">
        ${personen.map(p => `<ion-item button detail="true" data-person="${p.id}">${avatar(p.id)}<ion-label><h3>${esc(p.name)}</h3><p>${sachen.filter(s => s.person === p.id).length} eigene Sachen</p></ion-label></ion-item>`).join('')}
      </ion-list>
    </div>

    <div class="karte">
      <h3>${icon('download', 22)}Sicherung & zweites Handy</h3>
      <p>Die Liste ist nur auf diesem Handy gespeichert. Mit einer Sicherungsdatei könnt ihr sie aufbewahren oder auf das andere Handy übertragen.</p>
      <div class="knopf-reihe">
        <ion-button fill="outline" data-export>${icon('download', 20)}Sichern</ion-button>
        <ion-button fill="outline" data-import>${icon('upload', 20)}Laden</ion-button>
      </div>
      <input type="file" id="datei" accept="application/json,.json" hidden>
    </div>

    <div class="karte">
      <h3>${icon('list-checks', 22)}Startliste</h3>
      <p>Ersetzt eure Liste und euer Gepäck durch die mitgelieferte Beispiel-Liste.</p>
      <ion-button expand="block" fill="clear" color="danger" data-startliste>${icon('trash-2', 20)}Startliste wiederherstellen</ion-button>
    </div>
    <p class="hinweis mittig klein-text">Packliste · Version ${esc(self.APP_VERSION)} · funktioniert auch offline</p>`;

  app.querySelector('#etappe').addEventListener('ionChange', e => { store.d().etappe = e.detail.value; store.speichern(); seiteMehr(); });
  app.querySelector('#datei').addEventListener('change', async e => {
    const datei = e.target.files[0];
    if (!datei) return;
    try {
      const text = await datei.text();
      if (!await bestaetigen('Sicherung laden?', 'Die aktuelle Liste auf diesem Handy wird ersetzt.', 'Laden')) return;
      store.importieren(text);
      toast('Sicherung geladen', { farbe: 'success' });
      zeichnen();
    } catch (fehler) {
      toast(fehler.message.startsWith('Das ist') ? fehler.message : 'Die Datei konnte nicht gelesen werden.', { farbe: 'danger' });
    } finally {
      e.target.value = '';
    }
  });
}

async function neuPacken() {
  const { etappe } = store.d();
  const naechste = etappe === 'hin' ? 'rueck' : 'hin';
  if (!await bestaetigen('Neu packen?', 'Alle Sachen gelten wieder als „noch nicht eingepackt“. Taschen stecken in keinem Koffer mehr.', 'Neu packen')) return;
  store.neuPacken(naechste);
  ansicht.status = 'offen';
  toast(naechste === 'rueck' ? 'Bereit für den Rückweg' : 'Bereit für die nächste Reise', { farbe: 'success' });
  location.hash = '#/';
}

async function personUmbenennen(id) {
  const p = store.person(id);
  const name = await frageText('Name ändern', p.name);
  if (!name) return;
  p.name = name;
  store.speichern();
  seiteMehr();
}

function sicherungSpeichern() {
  const blob = new Blob([store.exportieren()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `packliste-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Sicherung gespeichert (Ordner „Downloads“)');
}

async function startliste() {
  if (!await bestaetigen('Startliste wiederherstellen?', 'Alle eigenen Sachen und Gepäckstücke werden gelöscht.', 'Wiederherstellen')) return;
  store.startlisteLaden();
  toast('Startliste geladen');
  location.hash = '#/';
  zeichnen();
}

// ---------- Klicks auf den Seiten ----------
function klick(e) {
  const t = e.target;
  const wisch = t.closest('[data-wisch]');
  if (wisch) return wischPacken(wisch.closest('[data-sache]').dataset.sache, wisch.dataset.wisch, wisch.closest('ion-item-sliding'));
  const filter = t.closest('[data-person-filter]');
  if (filter) { ansicht.person = filter.dataset.personFilter; return seiteListe(); }
  const bearbeiten = t.closest('[data-bearbeiten]');
  if (bearbeiten) return sacheBearbeiten(bearbeiten.dataset.bearbeiten);
  const packen = t.closest('[data-packen]');
  if (packen) return packenSheet(packen.dataset.packen);
  const gepaeck = t.closest('[data-gepaeck]');
  if (gepaeck) return gepaeckBearbeiten(gepaeck.dataset.gepaeck);
  const person = t.closest('[data-person]');
  if (person) return personUmbenennen(person.dataset.person);
  if (t.closest('[data-neu]')) return sacheBearbeiten(null);
  if (t.closest('[data-neu-aus-suche]')) return sacheBearbeiten(null, ansicht.suche.trim());
  if (t.closest('[data-neu-packen]')) return neuPacken();
  if (t.closest('[data-export]')) return sicherungSpeichern();
  if (t.closest('[data-import]')) return app.querySelector('#datei').click();
  if (t.closest('[data-startliste]')) return startliste();
}

// ---------- Offline & Updates ----------
function serviceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Am PC zum Testen ohne Offline-Speicher, damit Änderungen sofort sichtbar sind
  if (location.hostname === 'localhost') return;
  // updateViaCache 'none': bei der Update-Prüfung nie den Browser-Zwischenspeicher nutzen (sonst bis zu 10 Min. Verzögerung).
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const zeigeHinweis = w => toast('Update verfügbar', { dauer: 0, knopf: { text: 'Jetzt laden', aktion: () => w.postMessage('skipWaiting') } });
    if (reg.waiting && navigator.serviceWorker.controller) zeigeHinweis(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const neu = reg.installing;
      neu?.addEventListener('statechange', () => {
        if (neu.state === 'installed' && navigator.serviceWorker.controller) zeigeHinweis(neu);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  // Nur neu laden, wenn ein Update übernommen wurde (nicht beim allerersten Besuch).
  const hatteController = !!navigator.serviceWorker.controller;
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hatteController || neuGeladen) return;
    neuGeladen = true;
    location.reload();
  });
}

start();
