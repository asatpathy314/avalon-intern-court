import Link from "next/link";

export default function Entry() {
  return (
    <main
      className="phone-screen"
      style={{ alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center" }}
    >
      <div className="kicker">The Intern Court</div>
      <h1
        className="serif"
        style={{ font: "700 40px var(--font-serif)", color: "var(--gold)", margin: 0, lineHeight: 1.1 }}
      >
        Take your seat
      </h1>
      <Link href="/host" className="btn-gold">
        Create a Court
        <br />
        <span className="sub">you are the Game Master · put this on the TV</span>
      </Link>
      <Link href="/join" className="btn-ghost">
        Join as a Player
        <br />
        <span className="sub" style={{ color: "var(--parchment-55)" }}>
          enter the code on the TV
        </span>
      </Link>
    </main>
  );
}
