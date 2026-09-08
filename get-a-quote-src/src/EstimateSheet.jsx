import { BRAND } from '../../lib/estimates/presentation.mjs';
import './estimate-sheet.css';
export function EstimateSheet({
  summary: m,
  downloadable = true
}) {
  return <>
    <article className="gv-sheet" aria-label="Your GreenVac estimate sheet">
      <header className="gv-sheet-brand">
        <img src="/images/estimate-logo.png" alt="GreenVac Services" width="220" height="88" />
        <span>COMPACT HYDRO EXCAVATION SPECIALIST</span>
      </header>
      <div className="gv-sheet-body">
        <div className="gv-sheet-status">{m.status}{m.reference && <span> · {m.reference}</span>}</div>
        <h1 className="gv-sheet-title">{m.title}</h1>
        <p className="gv-sheet-location">{m.customerName && <>Prepared for <strong>{m.customerName}</strong><br /></>}{m.location}</p>
        <section className="gv-sheet-price" aria-label={m.manualOnly ? 'Personal pricing required' : 'Estimated total'}>
          {m.manualOnly ? <><h2>James will price this one personally</h2><p>No automatic estimate has been given.</p></> : <><span className="gv-sheet-eyebrow">ESTIMATED TOTAL</span><div className="gv-sheet-amount">{m.price}</div><strong>Including GST</strong><small>{m.exGst}</small></>}
        </section>
        <section className="gv-sheet-section"><h2>The job you described</h2><dl className="gv-sheet-measurements">{m.details.map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl></section>
        <section className="gv-sheet-section"><h2>Your selections</h2><dl className="gv-sheet-selections">{m.selected.map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl></section>
        {!m.manualOnly && <section className="gv-sheet-section"><h2>What this covers</h2><ul className="gv-sheet-inclusions">{m.inclusions.map(x => <li key={x}>{x}</li>)}</ul><p className="gv-sheet-reasons">{m.reasons.join(' ')}</p></section>}
        {m.review && <p className="gv-sheet-review">{m.review}</p>}
        <section className="gv-sheet-next"><h2>{m.submitted ? 'What happens next' : 'Ready for the next step?'}</h2><p>{m.submitted ? 'James will review your details and contact you to confirm the scope, price and availability.' : 'Ask James to review this estimate. No obligation, and nothing is booked yet.'}</p>{m.timing && <p><strong>Requested timing:</strong> {m.timing}</p>}</section>
        <p className="gv-sheet-terms">{m.terms}</p>
      </div>
      <footer className="gv-sheet-footer"><strong>Protecting people, services and project budgets.</strong><span><a href={`tel:${BRAND.tel}`}>{BRAND.phone}</a> · <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></span><small>GreenVac Services · ABN {BRAND.abn}</small></footer>
    </article>
    {downloadable && <div className="gv-sheet-download"><button type="button" className="secondary-btn" onClick={() => window.print()}>Print / save as PDF</button><span>Choose “Save as PDF” in your print options.</span></div>}
  </>;
}
