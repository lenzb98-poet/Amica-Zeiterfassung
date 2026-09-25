/** Ob das Gerät Dateien über das Teilen-Menü weitergeben kann (z. B. iPad). */
export function kannDateiTeilen(datei: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [datei] })
}

/** Öffnet das Teilen-Menü; Abbrechen durch den Nutzer gilt nicht als Fehler. */
export async function dateiTeilen(datei: File, titel: string): Promise<boolean> {
  try {
    await navigator.share({ files: [datei], title: titel })
    return true
  } catch (e) {
    return (e as DOMException).name === 'AbortError'
  }
}

export function dateiHerunterladen(datei: File) {
  const url = URL.createObjectURL(datei)
  const link = document.createElement('a')
  link.href = url
  link.download = datei.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

