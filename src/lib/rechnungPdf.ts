import type { Content, TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces'
import logoUrl from '../assets/logo.png?url'
import unterschriftUrl from '../assets/unterschrift.png?url'
import jostRegularUrl from '../assets/fonts/Jost_400Regular.ttf?url'
import jostMediumUrl from '../assets/fonts/Jost_500Medium.ttf?url'
import jostSemiBoldUrl from '../assets/fonts/Jost_600SemiBold.ttf?url'
import { FIRMA } from './firma'
import { formatiereDatumLang, formatiereEuro, formatiereStunden } from './format'
import type { Rechnung } from './typen'

const mm = (wert: number) => (wert * 72) / 25.4

const FARBE = {
  gruen: '#2c6214',
  gruenHell: '#eef4ea',
  orange: '#f97a1f',
  tinte: '#26302b',
  grau: '#6b746f',
  linie: '#dde3da',
}

const RAND = { links: mm(25), rechts: mm(20), oben: mm(14), unten: mm(30) }
const BREITE = mm(210) - RAND.links - RAND.rechts

async function alsBase64(url: string): Promise<string> {
  const puffer = await (await fetch(url)).arrayBuffer()
  let binaer = ''
  const bytes = new Uint8Array(puffer)
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binaer += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binaer)
}

let ressourcen: Promise<{
  vfs: Record<string, string>
  logo: string
  unterschrift: string
}> | null = null

function ladeRessourcen() {
  ressourcen ??= Promise.all([
    alsBase64(jostRegularUrl),
    alsBase64(jostMediumUrl),
    alsBase64(jostSemiBoldUrl),
    alsBase64(logoUrl),
    alsBase64(unterschriftUrl),
  ]).then(([regular, medium, semibold, logo, unterschrift]) => ({
    vfs: { 'Jost-Regular.ttf': regular, 'Jost-Medium.ttf': medium, 'Jost-SemiBold.ttf': semibold },
    logo: `data:image/png;base64,${logo}`,
    unterschrift: `data:image/png;base64,${unterschrift}`,
  }))
  return ressourcen
}

const SCHRIFTEN: TFontDictionary = {
  Jost: {
    normal: 'Jost-Regular.ttf',
    bold: 'Jost-SemiBold.ttf',
    italics: 'Jost-Regular.ttf',
    bolditalics: 'Jost-SemiBold.ttf',
  },
  JostMedium: {
    normal: 'Jost-Medium.ttf',
    bold: 'Jost-SemiBold.ttf',
    italics: 'Jost-Medium.ttf',
    bolditalics: 'Jost-SemiBold.ttf',
  },
}

function anredeZeile(r: Rechnung['recipient']): string {
  const nachname = r.name.trim().split(/\s+/).pop() ?? r.name
  if (r.salutation === 'Frau') return `Sehr geehrte Frau ${nachname},`
  if (r.salutation === 'Herr') return `Sehr geehrter Herr ${nachname},`
  return `Guten Tag ${r.name},`
}

function kleineUeberschrift(text: string, alignment: 'left' | 'right' = 'left'): Content {
  return {
    text: text.toUpperCase(),
    font: 'JostMedium',
    fontSize: 8.5,
    color: FARBE.gruen,
    characterSpacing: 0.5,
    alignment,
  }
}

function dokument(rechnung: Rechnung, logo: string, unterschrift: string): TDocumentDefinitions {
  const r = rechnung.recipient
  const empfaenger = [
    r.salutation,
    r.name,
    r.street,
    [r.postal_code, r.city].filter(Boolean).join(' '),
  ].filter((zeile): zeile is string => Boolean(zeile))

  const positionen = rechnung.items.map((pos) => [
    pos.service,
    formatiereDatumLang(pos.date),
    { text: formatiereStunden(pos.minutes), alignment: 'right' as const },
    { text: formatiereEuro(Number(pos.rate)), alignment: 'right' as const },
    { text: formatiereEuro(Number(pos.amount)), alignment: 'right' as const },
  ])

  const bankZeile = (bezeichnung: string, wert: Content): Content[] => [
    { text: bezeichnung, color: FARBE.grau, fontSize: 10.5, margin: [0, 1.5, 0, 0] },
    wert,
  ]

  return {
    pageSize: 'A4',
    pageMargins: [RAND.links, RAND.oben, RAND.rechts, RAND.unten],
    info: { title: `Rechnung ${rechnung.number}`, author: FIRMA.name },
    defaultStyle: { font: 'Jost', fontSize: 10.5, lineHeight: 1.2, color: FARBE.tinte },

    footer: (seite, seiten) => ({
      margin: [RAND.links, mm(6), RAND.rechts, 0],
      stack: [
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: BREITE, y2: 0, lineWidth: 1.1, lineColor: FARBE.gruen },
          ],
        },
        {
          margin: [0, mm(2.5), 0, 0],
          columns: [
            {
              width: '38%',
              stack: [
                { text: FIRMA.name, font: 'JostMedium', color: FARBE.tinte },
                `Inhaberin: ${FIRMA.inhaberin}`,
                `${FIRMA.strasse}, ${FIRMA.ort}`,
                `Steuernummer: ${FIRMA.steuernummer}`,
              ],
            },
            {
              width: '34%',
              stack: [
                { text: 'Kontakt', font: 'JostMedium', color: FARBE.tinte },
                `Tel.: ${FIRMA.telefon}`,
                FIRMA.email,
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Web', font: 'JostMedium', color: FARBE.tinte },
                FIRMA.web,
                { text: `Seite ${seite} von ${seiten}`, margin: [0, mm(3), 0, 0], alignment: 'right' },
              ],
            },
          ],
          fontSize: 8,
          lineHeight: 1.3,
          color: FARBE.grau,
        },
      ],
    }),

    content: [
      {
        columns: [
          {
            width: '*',
            margin: [0, mm(12), 0, 0],
            stack: [
              {
                text: `${FIRMA.name} · ${FIRMA.strasse} · ${FIRMA.ort}`,
                fontSize: 7.5,
                color: FARBE.grau,
              },
              {
                canvas: [
                  { type: 'line', x1: 0, y1: 2, x2: mm(85), y2: 2, lineWidth: 0.8, lineColor: FARBE.linie },
                ],
              },
            ],
          },
          { width: mm(54), image: logo, fit: [mm(54), mm(30)] },
        ],
      },

      { margin: [0, mm(3), 0, 0], fontSize: 11, lineHeight: 1.3, stack: empfaenger },

      {
        margin: [0, mm(7), 0, 0],
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { stack: [kleineUeberschrift('Rechnung'), rechnung.number] },
              {
                stack: [
                  kleineUeberschrift('Leistungszeitraum'),
                  `${formatiereDatumLang(rechnung.period_start)} – ${formatiereDatumLang(rechnung.period_end)}`,
                ],
              },
              {
                stack: [
                  kleineUeberschrift('Datum', 'right'),
                  { text: formatiereDatumLang(rechnung.invoice_date), alignment: 'right' },
                ],
              },
            ],
          ],
        },
        font: 'JostMedium',
        fontSize: 11.5,
        layout: {
          fillColor: FARBE.gruenHell,
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: (i) => (i === 0 ? mm(5) : mm(2)),
          paddingRight: (i) => (i === 2 ? mm(5) : mm(2)),
          paddingTop: () => mm(3),
          paddingBottom: () => mm(3),
        },
      },

      {
        margin: [0, mm(6), 0, 0],
        stack: [
          anredeZeile(r),
          { text: 'hiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:', margin: [0, mm(1), 0, 0] },
        ],
      },

      {
        margin: [0, mm(4), 0, 0],
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['*', mm(26), mm(19), mm(25), mm(25)],
          body: [
            [
              kleineUeberschrift('Leistung'),
              kleineUeberschrift('Datum'),
              kleineUeberschrift('Stunden', 'right'),
              kleineUeberschrift('Einzelpreis', 'right'),
              kleineUeberschrift('Gesamt', 'right'),
            ],
            ...positionen,
          ],
        },
        layout: {
          hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 1.4 : 0.8),
          hLineColor: (i) => (i === 1 ? FARBE.gruen : FARBE.linie),
          vLineWidth: () => 0,
          paddingLeft: () => mm(2),
          paddingRight: () => mm(2),
          paddingTop: () => mm(2.2),
          paddingBottom: () => mm(2.2),
        },
      },

      {
        unbreakable: true,
        stack: [
          {
            columns: [
              { width: '*', text: '' },
              {
                width: mm(29),
                canvas: [
                  { type: 'line', x1: 0, y1: 0, x2: mm(29), y2: 0, lineWidth: 1.7, lineColor: FARBE.orange },
                ],
              },
            ],
          },
          {
            margin: [mm(2), mm(1.5), mm(2), 0],
            columns: [
              { text: 'Rechnungsbetrag', color: FARBE.gruen, bold: true, fontSize: 12 },
              {
                text: formatiereEuro(Number(rechnung.total)),
                bold: true,
                fontSize: 12,
                alignment: 'right',
                width: 'auto',
              },
            ],
          },
          {
            text: 'Gemäß § 19 UStG wird aufgrund der Kleinunternehmerregelung keine Umsatzsteuer erhoben.',
            fontSize: 8.5,
            color: FARBE.grau,
            margin: [0, mm(2), 0, 0],
          },
        ],
      },

      {
        unbreakable: true,
        margin: [0, mm(5), 0, 0],
        stack: [
          `Bitte überweisen Sie den Rechnungsbetrag innerhalb der nächsten ${FIRMA.zahlungszielTage} Tage auf folgendes Konto:`,
          {
            margin: [0, mm(3), 0, 0],
            table: {
              widths: [mm(1.6), '*'],
              body: [
                [
                  { text: '', fillColor: FARBE.orange },
                  {
                    fillColor: FARBE.gruenHell,
                    margin: [mm(4.5), mm(2.5), mm(4), mm(2.5)],
                    table: {
                      widths: [mm(37), '*'],
                      body: [
                        bankZeile('Empfänger', { text: FIRMA.bank.inhaber, font: 'JostMedium', fontSize: 12 }),
                        bankZeile('IBAN', {
                          text: FIRMA.bank.iban,
                          bold: true,
                          fontSize: 13.5,
                          characterSpacing: 0.5,
                        }),
                        bankZeile('Bank', {
                          text: `${FIRMA.bank.institut} · BIC ${FIRMA.bank.bic}`,
                          font: 'JostMedium',
                          fontSize: 12,
                        }),
                        bankZeile('Verwendungszweck', {
                          text: rechnung.number,
                          font: 'JostMedium',
                          fontSize: 12,
                        }),
                      ],
                    },
                    layout: {
                      defaultBorder: false,
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => mm(0.6),
                      paddingBottom: () => mm(0.6),
                    },
                  },
                ],
              ],
            },
            layout: {
              defaultBorder: false,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
          },
          { text: 'Vielen Dank und liebe Grüße', margin: [0, mm(5), 0, mm(1)] },
          { image: unterschrift, fit: [mm(40), mm(11)] },
          FIRMA.inhaberin,
        ],
      },
    ],
  }
}

export function pdfDateiname(rechnung: Rechnung): string {
  const name = rechnung.recipient.name
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_|_$/g, '')
  return `${rechnung.number}_${name}.pdf`
}

/** Erzeugt die Rechnung als PDF – auf jedem Gerät Seite für Seite identisch. */
export async function erzeugeRechnungsPdf(rechnung: Rechnung): Promise<Blob> {
  const [{ default: pdfMake }, { vfs, logo, unterschrift }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    ladeRessourcen(),
  ])
  const pdf = pdfMake.createPdf(dokument(rechnung, logo, unterschrift), undefined, SCHRIFTEN, vfs)
  return new Promise((aufloesen) => pdf.getBlob(aufloesen))
}
