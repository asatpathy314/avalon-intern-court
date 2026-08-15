import { PORTRAITS, ROLES } from "@/lib/roles";
import { LQIP } from "@/lib/lqip";
import type { RoleKey } from "@/lib/types";

export function Plate({
  role,
  width = 208,
  showFlavor = true,
  suffix,
}: {
  role: RoleKey;
  width?: number;
  showFlavor?: boolean;
  suffix?: string | null;
}) {
  const info = ROLES[role];
  const evil = info.allegiance === "evil";
  const nameSize = Math.max(16, Math.round(width * 0.115));
  return (
    <div className="plate" style={{ width }}>
      <div className="flame" style={{ fontSize: Math.max(14, width * 0.09), color: "var(--gold)", lineHeight: 1 }}>
        {info.sigil}
      </div>
      {/* blurred LQIP paints first; the real crop replaces it on load */}
      <img
        src={PORTRAITS[role]}
        alt={info.name}
        style={{
          width: "100%",
          aspectRatio: "1",
          objectFit: "cover",
          border: "1px solid rgba(201,162,75,0.5)",
          display: "block",
          backgroundImage: `url(${LQIP[role]})`,
          backgroundSize: "cover",
        }}
      />
      <div className="serif" style={{ fontWeight: 700, fontSize: nameSize, lineHeight: 1.15, color: "var(--parchment)" }}>
        {info.name}
      </div>
      {showFlavor && (
        <div
          className="serif"
          style={{
            fontStyle: "italic",
            fontSize: Math.max(11, Math.round(width * 0.062)),
            lineHeight: 1.4,
            color: "var(--parchment-75)",
          }}
        >
          {info.flavor}
        </div>
      )}
      <div className={`chip ${evil ? "evil" : "good"}`} style={{ marginTop: "auto" }}>
        {evil ? "◆ MORDRED'S" : "◯ LOYAL"}
        {suffix ? ` · ${suffix}` : ""}
      </div>
    </div>
  );
}
