export interface ReferenceTableRow {
  begriff: string;
  erklaerung: string;
}

export interface ReferenceTable {
  columns: [string, string];
  rows: ReferenceTableRow[];
}

export interface ReferenceSection {
  id: string;
  heading: string;
  intro?: string;
  table?: ReferenceTable;
}
