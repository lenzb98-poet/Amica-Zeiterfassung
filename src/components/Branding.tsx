import schriftzug from '../assets/amica-schriftzug.png'

/** Schriftzug "Amica" mit grünem Balken – wie im App-Icon. */
export default function Branding({ groesse = 'normal' }: { groesse?: 'normal' | 'gross' }) {
  return (
    <div className={`branding branding-${groesse}`}>
      <img src={schriftzug} alt="Amica" />
      <span className="branding-balken" aria-hidden="true" />
    </div>
  )
}
