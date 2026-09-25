export type Modul = 'zeiterfassung' | 'rechnungen' | 'steuern'

type Props = {
  aktiv: Modul
  onWechseln: (modul: Modul) => void
}

const MODULE: { id: Modul; titel: string }[] = [
  { id: 'zeiterfassung', titel: 'Zeiterfassung' },
  { id: 'rechnungen', titel: 'Rechnungen' },
  { id: 'steuern', titel: 'Steuern' },
]

export default function Modulleiste({ aktiv, onWechseln }: Props) {
  return (
    <nav className="modulleiste" aria-label="Modul auswählen">
      {MODULE.map((modul) => (
        <button
          key={modul.id}
          type="button"
          className={`modulleiste-eintrag${modul.id === aktiv ? ' aktiv' : ''}`}
          aria-current={modul.id === aktiv ? 'page' : undefined}
          onClick={() => onWechseln(modul.id)}
        >
          {modul.titel}
        </button>
      ))}
    </nav>
  )
}
