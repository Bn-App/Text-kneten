export interface LyrikTableRow {
  begriff: string;
  erklaerung: string;
}

export interface LyrikTable {
  columns: [string, string];
  rows: LyrikTableRow[];
}

export interface LyrikSection {
  id: string;
  heading: string;
  intro?: string;
  table?: LyrikTable;
}

// Eigenständig formulierte Kurzübersicht zu Grundbegriffen der Gedichtanalyse
// (keine Übernahme aus einem bestimmten Lehrbuch).
export const LYRIK_SECTIONS: LyrikSection[] = [
  {
    id: 'sprecherinstanz',
    heading: 'Die Sprecherinstanz in Gedichten',
    intro:
      'Das lyrische Ich ist die sprechende Instanz im Gedicht — nicht automatisch mit dem Autor oder der Autorin gleichzusetzen. Wird im Gedicht eine angesprochene Person sichtbar, spricht man vom lyrischen Du. Fehlen die Pronomen „ich“/„wir“ ganz, spricht man vom lyrischen Sprecher. Eine Gleichsetzung mit dem realen Autor/der Autorin muss immer konkret am Text belegt werden.',
  },
  {
    id: 'vers-satz',
    heading: 'Vers und Satz',
    intro: 'Der Vers (die Gedichtzeile) wird durch den Zeilenbruch definiert, nicht durch den Reim.',
    table: {
      columns: ['Begriff', 'Erklärung'],
      rows: [
        { begriff: 'Zeilenstil', erklaerung: 'Satzende und Versende fallen zusammen; der Vers schließt mit einer Pause.' },
        { begriff: 'Enjambement (Zeilensprung)', erklaerung: 'Der Satz läuft über das Versende hinweg und setzt sich im nächsten Vers fort.' },
        { begriff: 'Hakenstil', erklaerung: 'Mehrere aufeinanderfolgende Enjambements, die die Verse eng miteinander verhaken.' },
      ],
    },
  },
  {
    id: 'reimschemata',
    heading: 'Reimschemata (Endreim)',
    table: {
      columns: ['Schema', 'Bezeichnung'],
      rows: [
        { begriff: 'aabb', erklaerung: 'Paarreim' },
        { begriff: 'abab', erklaerung: 'Kreuzreim' },
        { begriff: 'abba', erklaerung: 'umarmender Reim' },
        { begriff: 'aabccb', erklaerung: 'Schweifreim' },
        { begriff: 'abcabc', erklaerung: 'Kettenreim (dreifache Reimreihe)' },
        { begriff: 'aaa', erklaerung: 'Haufenreim' },
        { begriff: 'x (ungereimt)', erklaerung: 'Waise: reimloser Vers in einem sonst gereimten Gedicht' },
      ],
    },
  },
  {
    id: 'weitere-reimformen',
    heading: 'Weitere Reim- und Klangformen',
    table: {
      columns: ['Begriff', 'Erklärung'],
      rows: [
        { begriff: 'Binnenreim', erklaerung: 'Zwei Wörter reimen sich innerhalb derselben Verszeile.' },
        { begriff: 'Anfangsreim', erklaerung: 'Die ersten Wörter zweier Verse reimen sich.' },
        { begriff: 'Schlagreim', erklaerung: 'Zwei unmittelbar aufeinanderfolgende Wörter reimen sich.' },
        { begriff: 'Assonanz (unreiner Reim)', erklaerung: 'Nur die Vokale stimmen überein, die Konsonanten nicht (z. B. „tragen – Straßen“).' },
        { begriff: 'Alliteration (Stabreim)', erklaerung: 'Mehrere Wörter beginnen mit demselben Laut (z. B. „Milch und Mehl“).' },
      ],
    },
  },
  {
    id: 'versmass',
    heading: 'Versmaß (Metrum)',
    intro: 'Betonte Silben heißen Hebung (X), unbetonte Senkung (x). Das regelmäßige Muster ergibt das Metrum.',
    table: {
      columns: ['Metrum', 'Muster / Beispiel'],
      rows: [
        { begriff: 'Jambus (steigend)', erklaerung: 'x X — z. B. „der Baum“' },
        { begriff: 'Trochäus (fallend)', erklaerung: 'X x — z. B. „Sommer“' },
        { begriff: 'Spondäus', erklaerung: 'X X — z. B. „Schlussstrich“' },
        { begriff: 'Anapäst (steigend)', erklaerung: 'x x X — z. B. „es lacht“' },
        { begriff: 'Daktylus (fallend)', erklaerung: 'X x x — z. B. „Sonnenschein“' },
      ],
    },
  },
  {
    id: 'kadenz',
    heading: 'Kadenz',
    intro: 'Die Kadenz beschreibt, wie ein Vers klanglich endet (Betonung der letzten Silben).',
    table: {
      columns: ['Kadenz', 'Erklärung'],
      rows: [
        { begriff: 'stumpfe Kadenz', erklaerung: 'letzte Silbe betont, meist einsilbige Reimwörter (z. B. „Licht – Pflicht“)' },
        { begriff: 'klingende Kadenz', erklaerung: 'letzte Silbe unbetont, meist zweisilbige Reimwörter (z. B. „Wiese – Riese“)' },
        { begriff: 'reiche/gleitende Kadenz', erklaerung: 'die letzten beiden Silben unbetont, meist dreisilbige Reimwörter (z. B. „Träumerei – Zauberei“)' },
      ],
    },
  },
  {
    id: 'strophenformen',
    heading: 'Strophenformen',
    intro: 'Die Strophe bündelt mehrere Verse zu einer Klang- und Sinneinheit.',
    table: {
      columns: ['Form', 'Erklärung'],
      rows: [
        { begriff: 'Distichon', erklaerung: 'zweizeilige Einheit aus Hexameter und Pentameter' },
        { begriff: 'Einfache Liedstrophe', erklaerung: 'meist vierzeilige Strophe mit regelmäßigem Metrum' },
        { begriff: 'Terzett', erklaerung: 'dreizeilige Strophe' },
        { begriff: 'Quartett', erklaerung: 'vierzeilige Strophe' },
        { begriff: 'Sestine', erklaerung: 'sechszeilige Strophe mit festem Reimschema (z. B. aabbcc)' },
        { begriff: 'Verspaarkette', erklaerung: 'eine Folge von Verspaaren, oft durch Paarreim verbunden' },
      ],
    },
  },
];
