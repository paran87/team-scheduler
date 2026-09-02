type ActivityFieldsProps = {
  location?: string;
  activity?: string;
  remarks?: string;
  variant?: "default" | "onDark";
};

export function ActivityFields({ location, activity, remarks, variant = "default" }: ActivityFieldsProps) {
  return (
    <dl className={`activity-fields${variant === "onDark" ? " on-dark" : ""}`}>
      <div className="activity-field">
        <dt>location:</dt>
        <dd>{location ?? ""}</dd>
      </div>
      <div className="activity-field">
        <dt>activity:</dt>
        <dd>{activity ?? ""}</dd>
      </div>
      <div className="activity-field">
        <dt>remarks:</dt>
        <dd>{remarks ?? ""}</dd>
      </div>
    </dl>
  );
}
