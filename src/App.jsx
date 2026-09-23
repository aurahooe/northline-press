import { useEffect, useMemo, useState } from "react";
import {
  editionFor,
  hourKey,
  msUntilNextHour,
  supabase,
} from "./lib/supabase";

const TABS = ["press", "wall", "desk", "account"];

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("press");
  const [now, setNow] = useState(new Date());
  const [pieces, setPieces] = useState([]);
  const [mine, setMine] = useState([]);
  const [feature, setFeature] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const key = hourKey(now);
  const fallback = useMemo(() => editionFor(key), [key]);
  const remain = msUntilNextHour(now);
  const pct = Math.max(2, 100 - (remain / 3600000) * 100);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadPublic();
    loadFeature(key);
  }, [key]);

  useEffect(() => {
    if (session?.user) loadMine(session.user.id);
    else setMine([]);
  }, [session]);

  async function loadPublic() {
    const { data } = await supabase
      .from("pieces")
      .select("id,title,body,created_at,user_id,is_public")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(36);
    setPieces(data || []);
  }

  async function loadMine(uid) {
    const { data } = await supabase
      .from("pieces")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setMine(data || []);
  }

  async function loadFeature(hour) {
    const { data } = await supabase
      .from("features")
      .select("*")
      .eq("hour_key", hour)
      .maybeSingle();
    setFeature(data);
  }

  async function publish(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!session) {
      setTab("account");
      setErr("Sign in first. The desk stays locked otherwise.");
      return;
    }
    const form = new FormData(e.target);
    const title = String(form.get("title") || "").trim();
    const body = String(form.get("body") || "").trim();
    const is_public = form.get("public") === "on";
    if (!title || !body) {
      setErr("Give it a title and some lines.");
      return;
    }
    const { error } = await supabase.from("pieces").insert({
      user_id: session.user.id,
      title,
      body,
      is_public,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    e.target.reset();
    setMsg(is_public ? "On the wall." : "Filed in the desk.");
    loadMine(session.user.id);
    if (is_public) loadPublic();
  }

  async function togglePublic(piece) {
    const { error } = await supabase
      .from("pieces")
      .update({ is_public: !piece.is_public })
      .eq("id", piece.id);
    if (!error) {
      loadMine(session.user.id);
      loadPublic();
    }
  }

  async function remove(piece) {
    await supabase.from("pieces").delete().eq("id", piece.id);
    loadMine(session.user.id);
    loadPublic();
  }

  const shown = feature || fallback;
  const mins = Math.floor(remain / 60000);
  const secs = Math.floor((remain % 60000) / 1000);

  return (
    <div className="wrap">
      <header className="mast">
        <div className="mast-row">
          <span>Vol. I · Living edition</span>
          <span className="clock">
            Next page in {String(mins).padStart(2, "0")}:
            {String(secs).padStart(2, "0")}
          </span>
        </div>
        <h1>
          North<span>line</span>
        </h1>
        <p className="lede">
          A small press. You keep a desk. Anything you mark public goes on the
          wall. The front page turns every hour.
        </p>
      </header>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "press" && (
        <section className="edition">
          <article className="paper-card">
            <div className="kicker">{shown.kicker || "This hour"}</div>
            <h2>{shown.title}</h2>
            <p>{shown.body}</p>
            <div className="meter" aria-hidden>
              <i style={{ "--w": `${pct}%` }} />
            </div>
            <p className="meta">Hour {key.replace("T", " · ")} UTC</p>
          </article>
          <aside className="paper-card">
            <div className="kicker">How it works</div>
            <h2 style={{ fontSize: 24 }}>Sign in. Write. Pin it, or don’t.</h2>
            <p>
              Private pieces stay in your desk. Public ones appear on the wall
              for anyone walking through. The masthead feature is rewritten on
              the hour.
            </p>
          </aside>
        </section>
      )}

      {tab === "wall" && (
        <section>
          <p className="meta" style={{ marginBottom: 16 }}>
            Public only. If it isn’t here, it wasn’t marked public.
          </p>
          {pieces.length === 0 ? (
            <p className="empty">The wall is still warm and empty.</p>
          ) : (
            <div className="grid">
              {pieces.map((p) => (
                <article className="slip" key={p.id}>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  <div className="meta">{new Date(p.created_at).toLocaleString()}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "desk" && (
        <section className="stack">
          {!session && <p className="empty">The desk is locked. Open an account first.</p>}
          <form className="stack paper-card" onSubmit={publish}>
            <div className="kicker">New slip</div>
            <input name="title" placeholder="Title" maxLength={80} />
            <textarea name="body" placeholder="Write the thing you would leave on a table." maxLength={4000} />
            <label className="check">
              <input type="checkbox" name="public" />
              Mark public — show on the wall
            </label>
            <div className="row">
              <button className="solid" type="submit">File it</button>
              {err && <span className="err">{err}</span>}
              {msg && <span className="ok">{msg}</span>}
            </div>
          </form>
          <div className="grid">
            {mine.map((p) => (
              <article className="slip" key={p.id}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <div className="meta">{p.is_public ? "On the wall" : "In the desk"}</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="ghost" onClick={() => togglePublic(p)}>
                    {p.is_public ? "Make private" : "Make public"}
                  </button>
                  <button className="ghost" onClick={() => remove(p)}>Burn</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "account" && <Auth session={session} />}
    </div>
  );
}

function Auth({ session }) {
  const [mode, setMode] = useState("in");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    const form = new FormData(e.target);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (!email || password.length < 6) {
      setErr("Email and a password of at least six characters.");
      return;
    }
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setErr(error.message);
      else setInfo("Account made. If mail confirm is on, check the inbox.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    }
  }

  if (session) {
    return (
      <div className="paper-card stack">
        <div className="kicker">Signed in</div>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif" }}>{session.user.email}</h2>
        <p>Your pieces stay on this account. Public ones stay on the wall.</p>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <form className="paper-card stack" onSubmit={submit}>
      <div className="kicker">{mode === "in" ? "Return" : "New key"}</div>
      <h2 style={{ fontFamily: "Newsreader, Georgia, serif", margin: 0 }}>
        {mode === "in" ? "Sign in" : "Open an account"}
      </h2>
      <input name="email" type="email" placeholder="Email" autoComplete="email" />
      <input name="password" type="password" placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"} />
      <div className="row">
        <button className="solid" type="submit">{mode === "in" ? "Enter" : "Create"}</button>
        <button className="ghost" type="button" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Need an account" : "I already have one"}
        </button>
      </div>
      {err && <span className="err">{err}</span>}
      {info && <span className="ok">{info}</span>}
    </form>
  );
}
