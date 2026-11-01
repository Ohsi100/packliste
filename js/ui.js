// Kleine Helfer für Ionic-Bausteine: Toasts, Bestätigungsdialoge, Bottom Sheets, Vibration.

// Overlay einblenden und nach dem Schließen aus der Seite entfernen. Liefert das Ergebnis von onDidDismiss.
async function zeige(el) {
  document.querySelector('ion-app').append(el);
  await customElements.whenDefined(el.tagName.toLowerCase());
  await el.present();
  const ergebnis = await el.onDidDismiss();
  setTimeout(() => el.remove(), 0);
  return ergebnis;
}

export function toast(nachricht, { dauer = 2500, farbe, knopf } = {}) {
  document.querySelectorAll('ion-toast').forEach(t => t.dismiss());
  const t = document.createElement('ion-toast');
  t.message = nachricht;
  t.duration = dauer;
  t.position = 'bottom';
  t.positionAnchor = 'tabbar';
  if (farbe) t.color = farbe;
  if (knopf) t.buttons = [{ text: knopf.text, handler: knopf.aktion }];
  zeige(t);
}

// Bestätigung nur bei Löschen bzw. Zurücksetzen (siehe Designvorgaben).
export async function bestaetigen(titel, text, knopfText, gefahr = true) {
  const a = document.createElement('ion-alert');
  a.header = titel;
  a.message = text;
  a.buttons = [
    { text: 'Abbrechen', role: 'cancel' },
    { text: knopfText, role: 'destructive', cssClass: gefahr ? 'alert-gefahr' : '' }
  ];
  const { role } = await zeige(a);
  return role === 'destructive';
}

// Kurzer Eingabedialog mit einem Textfeld. Liefert den Text oder null.
export async function frageText(titel, wert) {
  const a = document.createElement('ion-alert');
  a.header = titel;
  a.inputs = [{ name: 'text', value: wert, attributes: { maxlength: 20 } }];
  a.buttons = [{ text: 'Abbrechen', role: 'cancel' }, { text: 'Speichern', role: 'ok' }];
  const { role, data } = await zeige(a);
  const text = String(data?.values?.text ?? '').trim();
  return role === 'ok' && text ? text : null;
}

// Bottom Sheet, das sich der Höhe des Inhalts anpasst. Gibt das Modal sofort zurück,
// damit die Seite ihre Knöpfe darin verdrahten kann.
export function sheet(html) {
  const m = document.createElement('ion-modal');
  m.className = 'sheet';
  m.breakpoints = [0, 1];
  m.initialBreakpoint = 1;
  m.handle = true;
  m.innerHTML = `<div class="sheet-inhalt">${html}</div>`;
  zeige(m);
  return m;
}

// Kurze Vibration (nur Android).
const MUSTER = { tipp: 8, gepackt: 18, fertig: [20, 40, 20, 40, 60] };
export function vibriere(art) {
  try { navigator.vibrate?.(MUSTER[art] ?? 10); } catch { /* nicht unterstützt */ }
}
