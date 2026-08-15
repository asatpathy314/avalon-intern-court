import { crestGradient } from "@/lib/crest";

export function Crest({
  name,
  size = 40,
  lifted = false,
  empty = false,
}: {
  name: string;
  size?: number;
  lifted?: boolean;
  empty?: boolean;
}) {
  const h = Math.round(size * 1.15);
  if (empty) {
    return (
      <div
        className="crest"
        style={{
          width: size,
          height: h,
          border: "1px dashed rgba(237,230,214,0.5)",
          clipPath: "polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%)",
        }}
      />
    );
  }
  return (
    <div
      className={`crest${lifted ? " lifted" : ""}`}
      style={{
        width: size,
        height: h,
        background: crestGradient(name),
        fontSize: Math.max(12, size * 0.38),
        border: lifted ? "1px solid var(--gold)" : undefined,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
