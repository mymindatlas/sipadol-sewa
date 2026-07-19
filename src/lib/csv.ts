// Generic CSV builder (§10.7). Pure string work — no React, no DOM, no
// Node APIs — so it runs on the server, in a client component, or in a test,
// and notices/complaints/forms can reuse it as their exports land.

export type CsvColumn = {
  /** Key to read from each row. */
  key: string
  /** Text for the header row. */
  header: string
}

export type CsvRow = Record<string, string | number | null | undefined>

/**
 * Excel does not sniff UTF-8. Without a byte-order mark it decodes a .csv as
 * the system codepage, and every Devanagari name in the file arrives as
 * mojibake — which, for a registrant list the ward office prints and acts on,
 * makes the export useless. The BOM is what makes Nepali survive the round
 * trip, so it is prepended here rather than left to each caller to remember.
 */
const UTF8_BOM = '\uFEFF'

/**
 * Characters that make Excel and Google Sheets read a cell as a FORMULA
 * rather than as text.
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r']

/**
 * Spreadsheet safety — NOT content alteration.
 *
 * full_name and note are typed by residents, and this file is opened by ward
 * staff in Excel. A cell beginning with one of the triggers above is executed
 * rather than displayed, so a resident who submits "=cmd" has their note run
 * on a staff machine instead of read. That is CSV injection, and the resident
 * side of this system is exactly the untrusted input it needs.
 *
 * The leading apostrophe is the spreadsheet's own "treat this cell as text"
 * marker: Excel consumes it on display, so a staff member still sees precisely
 * the characters the resident wrote. That is why it is used here rather than
 * stripping or rewriting the value — these exports are evidence (the ward's
 * accountability record), and silently editing what somebody submitted is not
 * available to us. In a plain text editor the apostrophe IS visible; that is
 * the accepted cost for a file whose purpose is spreadsheet use.
 *
 * Applied to strings only. A number cannot carry a formula, and prefixing one
 * would turn a negative value into text in the spreadsheet.
 */
function neutralizeFormula(value: string): string {
  return FORMULA_TRIGGERS.some((trigger) => value.startsWith(trigger))
    ? `'${value}`
    : value
}

/**
 * One CSV field. Everything is quoted rather than only the fields that need
 * it: the rule "always quote, double any internal quote" is the whole of RFC
 * 4180's escaping, and applying it unconditionally removes the chance of
 * getting the "does this one need quoting?" test wrong for a comma, a
 * newline, or a quote that a resident typed into a note.
 */
function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""'
  // Two layers, in this order. neutralizeFormula changes what the cell's
  // VALUE is; the quoting below changes how that value is WRITTEN into the
  // file. Running the guard first means the apostrophe it may add is then
  // quoted along with everything else, so the two compose instead of one
  // undoing the other.
  const text =
    typeof value === 'string' ? neutralizeFormula(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

/**
 * CSV text for `rows`, with one column per entry of `columns`, in that order.
 * A row missing a key contributes an empty field rather than shifting the
 * remaining columns left.
 */
export function toCsv(rows: CsvRow[], columns: CsvColumn[]): string {
  const header = columns.map((column) => escapeField(column.header)).join(',')

  const body = rows.map((row) =>
    columns.map((column) => escapeField(row[column.key])).join(',')
  )

  // CRLF: the line ending RFC 4180 specifies, and the one Excel is happiest
  // with on the Windows machines in the ward office.
  return UTF8_BOM + [header, ...body].join('\r\n')
}
