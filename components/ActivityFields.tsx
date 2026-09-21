import Link from "next/link";

type ActivityFieldsProps = {
  location?: string;
  duration?: string;
  activity?: string;
  assignedTo?: string;
  reportHref?: string;
  variant?: "default" | "onDark";
};

export function ActivityFields({ location, duration, activity, assignedTo, reportHref, variant = "default" }: ActivityFieldsProps) {
  return (
    <dl className={`activity-fields${variant === "onDark" ? " on-dark" : ""}`}>
      {assignedTo ? (
        <div className="activity-field">
          <dt>assigned to:</dt>
          <dd>{assignedTo}</dd>
        </div>
      ) : null}
      <div className="activity-field">
        <dt>location:</dt>
        <dd>{location ?? ""}</dd>
      </div>
      <div className="activity-field">
        <dt>duration:</dt>
        <dd>{duration ?? ""}</dd>
      </div>
      <div className="activity-field">
        <dt>activity:</dt>
        <dd>{activity ?? ""}</dd>
      </div>
      <div className="activity-field activity-report-field">
        <dt>report:</dt>
        <dd>
          {reportHref ? (
            <Link href={reportHref} prefetch className="activity-report-link">
              Activity Report/MOM
            </Link>
          ) : (
            <span className="activity-report-empty">Not posted</span>
          )}
        </dd>
      </div>
    </dl>
  );
}
