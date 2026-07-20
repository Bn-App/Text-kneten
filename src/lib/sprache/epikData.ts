import type { ReferenceSection } from '../reference/types';

// Eigenständig formulierte Kurzübersicht zu Grundbegriffen der Epik-Analyse
// (keine Übernahme aus einem bestimmten Lehrbuch).
export const EPIK_SECTIONS: ReferenceSection[] = [
  {
    id: 'leitfragen',
    heading: 'Leitfragen der Epik-Analyse',
    intro:
      'Bei der Analyse eines erzählenden Textes helfen vier Leitfragen: Was wird erzählt? (Thema, Handlung, Figuren, Ort, Zeit) — Wer erzählt wem? (Erzähler, Adressat) — Wie wird erzählt? (Erzählperspektive, Darstellungsweise, Zeitgestaltung) — Welche Bedeutung hat das Erzählte?',
  },
  {
    id: 'thema-handlung-figuren',
    heading: 'Thema, Handlung, Figuren (WAS)',
    intro:
      'Das Thema ist die durchgehende Grundidee des Textes. Die Handlung umfasst die erzählten Ereignisse — man unterscheidet die äußere Handlung (sichtbare Vorgänge und Taten) von der inneren Handlung (Gedanken und Gefühle der Figuren). Figuren werden direkt charakterisiert (Selbst- oder Fremdaussagen) oder indirekt (durch Verhalten, Rede, Namensgebung).',
  },
  {
    id: 'handlungsraum',
    heading: 'Der Handlungsraum',
    table: {
      columns: ['Raumtyp', 'Erklärung'],
      rows: [
        { begriff: 'charakterisierender Raum', erklaerung: 'Das Ambiente spiegelt sozialen Status oder Charakter einer Figur.' },
        { begriff: 'Lebensraum', erklaerung: 'vertrauter Raum, der Verhalten und Weltsicht der Figur prägt (Heimat, soziales Milieu)' },
        { begriff: 'atmosphärischer Raum', erklaerung: 'unterstreicht die Gemütslage einer Figur, z. B. durch Wetter oder Landschaft' },
        { begriff: 'Kontrastraum', erklaerung: 'räumliche Gegensätze, die die Handlung strukturieren (z. B. Stadt/Land)' },
        { begriff: 'symbolischer Raum', erklaerung: 'verdichtet zentrale Themen und Motive der Erzählung in einem Bild' },
      ],
    },
  },
  {
    id: 'erzaehler',
    heading: 'Der Erzähler (WER)',
    table: {
      columns: ['Begriff', 'Erklärung'],
      rows: [
        { begriff: 'homodiegetischer Erzähler', erklaerung: 'Teil der erzählten Welt, erzählt rückblickend als erlebendes/erzählendes Ich' },
        { begriff: 'autodiegetischer Erzähler', erklaerung: 'Sonderform: der Erzähler ist zugleich die Hauptfigur des Geschehens' },
        { begriff: 'heterodiegetischer Erzähler', erklaerung: 'steht außerhalb der erzählten Welt und ist selbst keine Figur der Handlung' },
        { begriff: 'offener Erzähler', erklaerung: 'tritt sichtbar mit Kommentaren, Wertungen oder Reflexionen in Erscheinung' },
        { begriff: 'verborgener Erzähler', erklaerung: 'hält sich mit eigenen Kommentaren stark zurück, tritt kaum hervor' },
      ],
    },
  },
  {
    id: 'erzaehlzeitpunkt',
    heading: 'Erzählzeitpunkt',
    table: {
      columns: ['Form', 'Erklärung'],
      rows: [
        { begriff: 'retrospektives Erzählen', erklaerung: 'das Geschehen wird rückblickend erzählt (häufigste Form, meist am Präteritum erkennbar)' },
        { begriff: 'gleichzeitiges Erzählen', erklaerung: 'das Erzählte findet im selben Moment wie das Erzählen statt (meist im Präsens)' },
        { begriff: 'prospektives Erzählen', erklaerung: 'vorausschauendes Erzählen — Prophezeiungen, Pläne, Befürchtungen' },
      ],
    },
  },
  {
    id: 'erzaehlperspektive',
    heading: 'Erzählperspektive (WIE)',
    table: {
      columns: ['Perspektive', 'Erklärung'],
      rows: [
        { begriff: 'Allsicht (auktorial)', erklaerung: 'Der Erzähler steht über dem Geschehen, kennt Hintergründe und Gedanken aller Figuren, kann frei kommentieren und werten.' },
        { begriff: 'Mitsicht (personal)', erklaerung: 'Der Erzähler ist an eine Reflektorfigur gebunden und weiß nur, was diese weiß oder wahrnimmt.' },
        { begriff: 'Außensicht (neutral)', erklaerung: 'Der Erzähler bleibt außerhalb des Geschehens, ohne Einblick in Gedanken oder Gefühle, und erzählt sachlich-beobachtend.' },
      ],
    },
  },
  {
    id: 'erzaehler-figurenrede',
    heading: 'Erzähler- und Figurenrede',
    table: {
      columns: ['Form', 'Erklärung'],
      rows: [
        { begriff: 'Erzählerbericht', erklaerung: 'raffende Darstellung des Geschehens durch den Erzähler' },
        { begriff: 'Beschreibung/Schilderung', erklaerung: 'ausführliche Darstellung von Orten, Figuren oder Stimmungen' },
        { begriff: 'direkte Rede', erklaerung: 'wörtliche Wiedergabe einer Figurenäußerung' },
        { begriff: 'innerer Monolog', erklaerung: 'direkte Wiedergabe von Gedanken und Gefühlen in der Ich-Form' },
        { begriff: 'erlebte Rede', erklaerung: 'Gedanken einer Figur, vom Erzähler in 3. Person und Präteritum vermittelt' },
        { begriff: 'indirekte Rede', erklaerung: 'Wiedergabe des Gesagten im Konjunktiv, durch den Erzähler vermittelt' },
      ],
    },
  },
  {
    id: 'zeitgestaltung',
    heading: 'Zeitgestaltung',
    intro: 'Erzähltexte sind durch zwei Zeitebenen gekennzeichnet: die erzählte Zeit (Zeitraum der Geschichte) und die Erzählzeit (Zeit, die das Erzählen selbst beansprucht).',
    table: {
      columns: ['Begriff', 'Erklärung'],
      rows: [
        { begriff: 'chronologisch', erklaerung: 'die Ereignisse werden in ihrer natürlichen Reihenfolge erzählt' },
        { begriff: 'anachronisch', erklaerung: 'die natürliche Zeitfolge wird durchbrochen (Rückblende/Analepse, Vorausdeutung/Prolepse)' },
        { begriff: 'Zeitraffung', erklaerung: 'Erzählzeit kürzer als erzählte Zeit — das Geschehen wird beschleunigt wiedergegeben' },
        { begriff: 'Zeitdeckung', erklaerung: 'Erzählzeit entspricht der erzählten Zeit, z. B. bei Dialogpassagen' },
        { begriff: 'Zeitdehnung', erklaerung: 'Erzählzeit länger als erzählte Zeit — das Geschehen wird verlangsamt dargestellt' },
        { begriff: 'Zeitsprung (Ellipse)', erklaerung: 'ein Ereignis oder Zeitraum wird ausgespart' },
        { begriff: 'singulatives Erzählen', erklaerung: 'was einmal geschah, wird einmal erzählt (Regelfall)' },
        { begriff: 'iteratives Erzählen', erklaerung: 'was sich mehrmals ereignet hat, wird nur einmal zusammenfassend erzählt' },
        { begriff: 'repetitives Erzählen', erklaerung: 'ein einmaliges Ereignis wird mehrfach erzählt, z. B. aus verschiedenen Perspektiven' },
      ],
    },
  },
];
