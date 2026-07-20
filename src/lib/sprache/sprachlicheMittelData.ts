export interface SprachlichesMittel {
  id: string;
  begriff: string;
  erklaerung: string;
  beispiel: string;
}

// Alphabetisch geordnete Übersicht gängiger sprachlicher Mittel. Erklärungen
// und Beispiele sind eigenständig formuliert (keine Übernahme aus einem
// bestimmten Lehrbuch).
export const SPRACHLICHE_MITTEL: SprachlichesMittel[] = [
  { id: 'akkumulation', begriff: 'Akkumulation', erklaerung: 'Aneinanderreihung mehrerer Begriffe, ohne dass ein Oberbegriff genannt wird', beispiel: 'Berg und Tal und Fluss und Feld' },
  { id: 'anapher', begriff: 'Anapher', erklaerung: 'Wiederholung derselben Wörter am Anfang aufeinanderfolgender Sätze oder Verse', beispiel: 'Er kam. Er sah. Er blieb.' },
  { id: 'antithese', begriff: 'Antithese', erklaerung: 'Gegenüberstellung zweier gegensätzlicher Begriffe oder Aussagen', beispiel: 'Der eine lacht, der andere weint.' },
  { id: 'chiasmus', begriff: 'Chiasmus', erklaerung: 'Überkreuzstellung einander zugeordneter Satzglieder (Wortstellung ABBA)', beispiel: 'Schön ist die Jugend, die Jugend ist schön.' },
  { id: 'ellipse', begriff: 'Ellipse', erklaerung: 'Auslassung von Satzteilen, die sich aus dem Zusammenhang erschließen', beispiel: 'Je früher, desto besser.' },
  { id: 'euphemismus', begriff: 'Euphemismus', erklaerung: 'beschönigende, verharmlosende Umschreibung eines unangenehmen Sachverhalts', beispiel: '„entschlafen“ statt „sterben“' },
  { id: 'epipher', begriff: 'Epipher (Epiphora)', erklaerung: 'Wiederholung desselben Wortes am Ende aufeinanderfolgender Sätze oder Verse', beispiel: 'Ich will es. Ich muss es.' },
  { id: 'hyperbel', begriff: 'Hyperbel', erklaerung: 'starke Übertreibung zur Verstärkung einer Aussage', beispiel: 'Ich habe dir das schon tausendmal gesagt.' },
  { id: 'interjektion', begriff: 'Interjektion', erklaerung: 'kurzer Ausruf, der ein Gefühl ausdrückt', beispiel: 'Ach! Oh! Hurra!' },
  { id: 'inversion', begriff: 'Inversion (Hyperbaton)', erklaerung: 'Umstellung der üblichen Wortstellung', beispiel: 'Selten sah man ihn lachen.' },
  { id: 'ironie', begriff: 'Ironie', erklaerung: 'Aussage, die das Gegenteil des eigentlich Gemeinten ausdrückt', beispiel: '„Das hast du ja großartig gemacht“ (bei einem Missgeschick)' },
  { id: 'klimax', begriff: 'Klimax', erklaerung: 'stufenweise Steigerung innerhalb einer Aufzählung', beispiel: 'klein, kleiner, am kleinsten' },
  { id: 'litotes', begriff: 'Litotes', erklaerung: 'Bejahung durch doppelte Verneinung', beispiel: '„nicht unklug“ (für „klug“)' },
  { id: 'metapher', begriff: 'Metapher', erklaerung: 'bildhafte Übertragung: ein Wort wird durch einen Ausdruck aus einem anderen Bedeutungsbereich ersetzt', beispiel: 'das Meer der Zeit' },
  { id: 'metonymie', begriff: 'Metonymie', erklaerung: 'Ersetzen eines Begriffs durch einen anderen, der in enger sachlicher Beziehung zu ihm steht', beispiel: '„die Krone“ für „der König“' },
  { id: 'neologismus', begriff: 'Neologismus', erklaerung: 'neu gebildetes Wort', beispiel: '„simsen“, „googeln“' },
  { id: 'oxymoron', begriff: 'Oxymoron', erklaerung: 'Verbindung zweier sich eigentlich widersprechender Begriffe', beispiel: 'beredtes Schweigen' },
  { id: 'paradoxon', begriff: 'Paradoxon', erklaerung: 'scheinbar widersprüchliche Aussage, die bei genauerem Hinsehen einen Sinn ergibt', beispiel: 'Weniger ist mehr.' },
  { id: 'parallelismus', begriff: 'Parallelismus', erklaerung: 'gleicher Satzbau in aufeinanderfolgenden Sätzen oder Versen', beispiel: 'Der Wind weht, die Blätter fallen.' },
  { id: 'personifikation', begriff: 'Personifikation', erklaerung: 'Vermenschlichung von Dingen, Tieren oder Naturerscheinungen', beispiel: 'die Sonne lacht' },
  { id: 'pleonasmus', begriff: 'Pleonasmus', erklaerung: 'Häufung bedeutungsgleicher oder bedeutungsähnlicher Wörter', beispiel: 'weißer Schimmel' },
  { id: 'reihung', begriff: 'Reihung', erklaerung: 'Aneinanderreihung gleichartiger Satzglieder', beispiel: 'groß, stark, mutig' },
  { id: 'rhetorische-frage', begriff: 'rhetorische Frage', erklaerung: 'Frage, auf die keine Antwort erwartet wird, da sie bereits feststeht', beispiel: 'Ist das nicht wunderbar?' },
  { id: 'symbol', begriff: 'Symbol', erklaerung: 'sinnlich wahrnehmbares Zeichen mit einer kulturell festgelegten, tieferen Bedeutung', beispiel: '„die Taube“ für Frieden' },
  { id: 'vergleich', begriff: 'Vergleich', erklaerung: 'Gegenüberstellung zweier Sachverhalte mit „wie“ oder „als“', beispiel: 'stark wie ein Bär' },
];
