export default function ActivityReportLoading() {
  return (
    <div className="org-page report-page">
      <header className="org-header report-header">
        <div className="org-header-inner">
          <span className="org-back">← Activities</span>
          <div className="org-letterhead">
            <span className="report-skel is-seal" />
            <div className="org-header-text">
              <p className="org-kicker">Republic of the Philippines</p>
              <p className="org-agency">Department of Public Works and Highways</p>
            </div>
            <span className="report-skel is-seal" />
          </div>
        </div>
      </header>
      <main className="org-main report-main">
        <section className="report-hero report-hero-skel" aria-busy="true" aria-live="polite">
          <span className="report-skel is-mark" />
          <div className="report-hero-copy">
            <span className="report-skel is-line short" />
            <span className="report-skel is-line title" />
            <span className="report-skel is-line mid" />
          </div>
          <span className="report-skel is-pill" />
        </section>
        <article className="report-card">
          <div className="report-meta">
            <span className="report-skel is-card" />
            <span className="report-skel is-card" />
            <span className="report-skel is-card" />
          </div>
          <p className="report-empty">Opening Activity Report/MOM…</p>
        </article>
      </main>
    </div>
  );
}
