import { personInitials, type TeamPerson } from "@/lib/team-roster";

type PersonCardProps = {
  person: TeamPerson;
  accent: string;
  featured?: boolean;
};

export function PersonCard({ person, accent, featured = false }: PersonCardProps) {
  const initials = personInitials(person.name);

  return (
    <article className={`org-card${featured ? " featured" : ""}`} style={{ borderTopColor: accent }}>
      <div className="org-photo-wrap" style={{ boxShadow: `0 0 0 3px ${accent}` }}>
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photo} alt={person.name} className="org-photo" />
        ) : (
          <span className="org-initials" style={{ background: accent }}>
            {initials}
          </span>
        )}
      </div>
      <h3>{person.name}</h3>
      <p>{person.title}</p>
    </article>
  );
}
