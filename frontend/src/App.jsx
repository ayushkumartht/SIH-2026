import React, { useEffect, useState } from "react";
import mermaid from "mermaid";
import PatientPortalDashboard from "./PatientDashboard";
import LiveConsultation from "./LiveConsultation";
import DoctorDashboard from "./DoctorDashboard";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const demoPatient = { email: "patient@demo.local", password: "demo123" };
const demoDoctor = { email: "doctor@demo.local", password: "demo123" };

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || body.message || "Request failed");
  return body.data ?? body;
}

function Link({ href, children, className = "" }) {
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}
function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">✚</span>
        <span>
          Nabha Care<small>Rural telemedicine service</small>
        </span>
      </Link>
      <nav>
        <a href="/#how-it-works">How it works</a>
        <a href="/#architecture">Architecture</a>
        <Link href="/docs">Documentation</Link>
        <Link href="/patient">Patient</Link>
        <Link href="/doctor">Doctor</Link>
      </nav>
    </header>
  );
}
function Button({ children, ...props }) {
  return (
    <button className="button button-green" {...props}>
      {children}
    </button>
  );
}
function Shell({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
const stories = [
  {
    image: "/images/field-care.jpeg",
    tag: "Care at the doorstep",
    copy: "ASHA workers can support patients with registration and vital checks.",
  },
  {
    image: "/images/ambulance-hospital.jpeg",
    tag: "Connected referral care",
    copy: "Care teams can guide a patient toward the right facility.",
  },
  {
    image: "/images/maternity-care.jpeg",
    tag: "Maternal health support",
    copy: "Remote consultation keeps specialist advice within reach.",
  },
  {
    image: "/images/community-health.jpeg",
    tag: "Community health centre",
    copy: "A shared digital link between local centres and doctors.",
  },
];
function Hero() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setCurrent((value) => (value + 1) % stories.length),
      4500,
    );
    return () => window.clearInterval(timer);
  }, []);
  const story = stories[current];
  return (
    <section className="hero wrap">
      <div className="hero-copy">
        <p className="kicker">Public health / always within reach</p>
        <h1>Care that reaches every home.</h1>
        <p className="lede">
          Nabha Care links patients, ASHA workers, doctors, and health
          facilities through a simple telemedicine pathway built for
          low-bandwidth communities.
        </p>
        <div className="hero-actions">
          <Link href="/patient" className="button button-green">
            Start a consultation <span>→</span>
          </Link>
          <Link href="/doctor" className="button button-outline">
            Doctor login
          </Link>
        </div>
        <div className="trust-row">
          <span>● Low-bandwidth ready</span>
          <span>● Guided by ASHA workers</span>
          <span>● Secure role access</span>
        </div>
      </div>
      <div className="story-card">
        <img src={story.image} alt={story.tag} />
        <div className="story-overlay">
          <p>{story.tag}</p>
          <span>{story.copy}</span>
        </div>
        <div className="story-dots">
          {stories.map((item, index) => (
            <button
              key={item.image}
              onClick={() => setCurrent(index)}
              className={index === current ? "active" : ""}
              aria-label={`Show ${item.tag}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
function MermaidFlow() {
  const ref = React.useRef(null);
  useEffect(() => {
    let active = true;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: {
        primaryColor: "#e5f2e9",
        primaryTextColor: "#102f31",
        primaryBorderColor: "#0c6c56",
        lineColor: "#669c88",
        secondaryColor: "#eef6fa",
        tertiaryColor: "#fff7e8",
        fontFamily: "DM Sans",
      },
    });
    const diagram = [
      "flowchart LR",
      "P[Patient / ASHA] --> I[Secure identity & consent]",
      "I --> B[Book appointment]",
      "B --> W[Consultation waiting room]",
      "W --> N{Network quality check}",
      "N -->|Good| V[WebRTC video]",
      "N -->|Weak| A[Audio / low-resolution mode]",
      "N -->|Very poor| O[Offline request]",
      "V --> D[Doctor workspace]",
      "A --> D",
      "O --> D",
      "D --> C[Clinical assessment]",
      "C --> R[Advice, prescription & follow-up]",
    ].join(String.fromCharCode(10));
    mermaid
      .render(`care-flow-${Date.now()}`, diagram)
      .then(({ svg }) => {
        if (active && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="mermaid-wrap">
      <div
        ref={ref}
        className="mermaid"
        aria-label="Nabha Care architecture and care flow"
      />
    </div>
  );
}
function EmergencyRoute() {
  return (
    <section
      className="emergency-route"
      aria-label="Emergency referral illustration"
    >
      <div className="route-copy">
        <p className="kicker">When urgent support is needed</p>
        <h2>From community to care.</h2>
        <p>
          Emergency and referral services remain a separate operational module.
          This illustration shows the intended connection from the local
          community to a health facility.
        </p>
      </div>
      <div className="route-scene" aria-hidden="true">
        <span className="village">COMMUNITY</span>
        <div className="road">
          <span className="ambulance">🚑</span>
        </div>
        <span className="hospital">
          ✚<small>HEALTH CENTRE</small>
        </span>
      </div>
    </section>
  );
}
function Home() {
  return (
    <Shell>
      <Hero />
      <section
        className="live-banner"
        aria-label="Nabha Care service highlights"
      >
        <div className="banner-track">
          <span>✚ Connected care for rural communities</span>
          <span>● Low-bandwidth consultation options</span>
          <span>✚ Patient, ASHA and doctor collaboration</span>
          <span>● Secure role-based access</span>
          <span>✚ Connected care for rural communities</span>
          <span>● Low-bandwidth consultation options</span>
        </div>
      </section>
      <section className="service-strip">
        <div className="wrap">
          <span>
            <b>24/7</b> connected care path
          </span>
          <span>
            <b>4 modes</b> video, low-res, audio, offline
          </span>
          <span>
            <b>Role-based</b> patient, doctor & care worker access
          </span>
        </div>
      </section>
      <section id="how-it-works" className="wrap section">
        <div className="section-head">
          <div>
            <p className="kicker">Designed for real care journeys</p>
            <h2>From first call to follow-up</h2>
          </div>
          <span className="status-chip">● Demo-ready</span>
        </div>
        <div className="journey-grid">
          {[
            [
              "01",
              "Tell us what you need",
              "Patients can register, choose a doctor, and book an appointment.",
            ],
            [
              "02",
              "Connect in the best available mode",
              "The platform checks the connection and uses video, low-resolution video, audio, or an offline request.",
            ],
            [
              "03",
              "Receive clinical guidance",
              "The doctor records the assessment, advice, prescription, and next steps.",
            ],
          ].map(([number, title, copy]) => (
            <article className="journey-step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="hospital-gallery">
        <article className="gallery-intro">
          <p className="kicker">Care where it matters</p>
          <h2>Built around people, facilities and the last mile.</h2>
          <p>
            Every connection begins in the community and can extend to a
            clinician or facility when needed.
          </p>
        </article>
        {stories.map((story, index) => (
          <figure
            className={`gallery-image gallery-${index + 1}`}
            key={story.image}
          >
            <img src={story.image} alt={story.tag} />
            <figcaption>{story.tag}</figcaption>
          </figure>
        ))}
      </section>
      <EmergencyRoute />
      <section className="photo-band">
        <img
          src="/images/community-health.jpeg"
          alt="Community health centre"
        />
        <div>
          <p className="kicker">Local presence, wider expertise</p>
          <h2>Technology that supports the frontline.</h2>
          <p>
            It does not replace local health workers. It helps them connect each
            patient to the appropriate clinician while retaining a clear record
            of care.
          </p>
          <Link href="/patient" className="text-link">
            Explore patient access →
          </Link>
        </div>
      </section>
      <section id="architecture" className="wrap section flow-section">
        <div className="section-head">
          <div>
            <p className="kicker">Architecture / care flow</p>
            <h2>How the platform works</h2>
          </div>
          <p className="section-note">
            The API protects access and coordinates live care; clinical
            information stays separate from call-quality data.
          </p>
        </div>
        <MermaidFlow />
      </section>
      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="kicker">What is in the project</p>
            <h2>Built today, planned next</h2>
          </div>
        </div>
        <div className="card-grid three">
          <Card label="IMPLEMENTED" title="Care access">
            Patient sign-up, secure sign-in, doctor discovery, booking, queue
            and consultation history.
          </Card>
          <Card label="IMPLEMENTED" title="Live coordination">
            Socket.IO call rooms, WebRTC signaling, vitals capture, adaptive
            network quality and assessment workspace.
          </Card>
          <Card label="NEXT" title="Production rollout">
            Verified Daily integration, encrypted offline sync, SMS/IVR
            fallback, tests, security review, monitoring and deployment.
          </Card>
        </div>
      </section>
      <section className="wrap cta-panel">
        <div>
          <p className="kicker">Ready to explore?</p>
          <h2>Start with the role you use.</h2>
        </div>
        <div className="hero-actions">
          <Link href="/patient" className="button button-green">
            I am a patient
          </Link>
          <Link href="/doctor" className="button button-outline">
            I am a doctor
          </Link>
        </div>
      </section>
    </Shell>
  );
}
function Card({ label, title, children }) {
  return (
    <article className="card">
      <span className="card-label">{label}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function Auth({ role, onLogin }) {
  const [mode, setMode] = useState(role === "patient" ? "login" : "login");
  const [form, setForm] = useState(
    role === "patient" ? { ...demoPatient } : { ...demoDoctor },
  );
  const [error, setError] = useState("");
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const path =
        role === "patient"
          ? mode === "signup"
            ? "/api/auth/patient/signup"
            : "/api/auth/patient/login"
          : "/api/auth/login";
      const data = await request(path, null, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (role === "doctor" && data.user.role !== "doctor")
        throw new Error("This account is not a doctor account");
      onLogin(data);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="auth-card">
      <p className="kicker">SIH-2026 / {role} access</p>
      <h1>{role === "patient" ? "Patient access" : "Doctor workspace"}</h1>
      <p className="muted">
        {role === "patient"
          ? "Register or sign in to manage your care."
          : "Sign in to review your queue and consultations."}
      </p>
      {role === "patient" && (
        <div className="tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>
      )}
      <form className="form" onSubmit={submit}>
        {mode === "signup" && (
          <>
            <label>
              Full name
              <input name="name" required onChange={update} />
            </label>
            <div className="inline">
              <label>
                Age
                <input name="age" type="number" required onChange={update} />
              </label>
              <label>
                Gender
                <select name="gender" defaultValue="other" onChange={update}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <label>
              Phone
              <input name="contact" required onChange={update} />
            </label>
          </>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            required
            onChange={update}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            required
            onChange={update}
          />
        </label>
        <Button>
          {mode === "signup" ? "Create patient account" : "Sign in"}
        </Button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="demo-note">
        Demo:{" "}
        {role === "patient"
          ? `${demoPatient.email} / ${demoPatient.password}`
          : `${demoDoctor.email} / ${demoDoctor.password}`}
      </p>
    </section>
  );
}

function Patient() {
  const [session, setSession] = useState(() =>
    JSON.parse(sessionStorage.getItem("patient-session") || "null"),
  );
  return session ? (
    <PatientPortalDashboard
      session={session}
      onLogout={() => {
        sessionStorage.removeItem("patient-session");
        setSession(null);
      }}
    />
  ) : (
    <Shell>
      <Auth
        role="patient"
        onLogin={(data) => {
          sessionStorage.setItem("patient-session", JSON.stringify(data));
          setSession(data);
        }}
      />
    </Shell>
  );
}
function PatientDashboard({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState(null);
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const [profile, doctors, appointments, consultations] = await Promise.all(
        [
          "/api/portal/patient/profile",
          "/api/portal/patient/doctors",
          "/api/portal/patient/appointments",
          "/api/portal/patient/consultations",
        ].map((path) => request(path, session.token)),
      );
      setData({ profile, doctors, appointments, consultations });
    } catch (e) {
      setMessage(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function book(event) {
    event.preventDefault();
    try {
      await request("/api/portal/patient/appointments", session.token, {
        method: "POST",
        body: JSON.stringify({
          doctorId: booking.id,
          date: event.target.date.value,
          time: event.target.time.value,
          reason: event.target.reason.value,
          appointmentType: "video",
        }),
      });
      setBooking(null);
      load();
    } catch (e) {
      setMessage(e.message);
    }
  }
  if (!data)
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  return (
    <Shell>
      <DashboardHeader
        title={`Welcome, ${data.profile.name}`}
        role="Patient"
        onLogout={onLogout}
      />
      <section className="wrap section dashboard-grid">
        <Panel title="Find a doctor">
          <input
            placeholder="Search name or specialization"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {data.doctors
            .filter((d) =>
              `${d.name} ${d.specialization}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((doctor) => (
              <article className="list-item" key={doctor.id}>
                <div>
                  <b>{doctor.name}</b>
                  <small>{doctor.specialization}</small>
                </div>
                <button
                  className="button button-soft"
                  onClick={() => setBooking(doctor)}
                >
                  Book
                </button>
              </article>
            ))}
        </Panel>
        <Panel title="My appointments">
          {data.appointments.length ? (
            data.appointments.map((item) => (
              <article className="list-item" key={item._id}>
                <div>
                  <b>{item.doctor?.name || "Doctor"}</b>
                  <small>
                    {item.date ? new Date(item.date).toLocaleDateString() : ""}{" "}
                    at {item.time}
                  </small>
                </div>
                <span className="badge">{item.status}</span>
              </article>
            ))
          ) : (
            <Empty text="No appointments yet." />
          )}
        </Panel>
        <Panel title="Consultation history">
          {data.consultations.length ? (
            data.consultations.map((item) => (
              <article className="list-item" key={item._id}>
                <div>
                  <b>{item.status}</b>
                  <small>
                    {item.assessment || item.symptoms || "No assessment yet"}
                  </small>
                </div>
                <span className="badge">{item.outcome || "pending"}</span>
              </article>
            ))
          ) : (
            <Empty text="Your completed consultations appear here." />
          )}
        </Panel>
      </section>
      {booking && (
        <div className="modal-backdrop">
          <form className="modal form" onSubmit={book}>
            <h2>Book with {booking.name}</h2>
            <label>
              Date
              <input name="date" type="date" required />
            </label>
            <label>
              Time
              <input name="time" type="time" required />
            </label>
            <label>
              Reason
              <textarea name="reason" rows="3" />
            </label>
            <div className="actions">
              <Button>Confirm booking</Button>
              <button
                type="button"
                className="button button-soft"
                onClick={() => setBooking(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {message && <p className="toast error">{message}</p>}
    </Shell>
  );
}
function Doctor() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem("doctor-session") || "null"),
  );
  return session ? (
    <DoctorDashboard
      session={session}
      onLogout={() => {
        localStorage.removeItem("doctor-session");
        setSession(null);
      }}
    />
  ) : (
    <Shell>
      <Auth
        role="doctor"
        onLogin={(data) => {
          localStorage.setItem("doctor-session", JSON.stringify(data));
          setSession(data);
        }}
      />
    </Shell>
  );
}


function DashboardHeader({ title, role, onLogout }) {
  return (
    <section className="dashboard-hero">
      <div className="wrap">
        <p className="kicker">{role} dashboard</p>
        <h1>{title}</h1>
        <div className="actions">
          <Link href="/docs" className="button button-soft">
            Project docs
          </Link>
          <button className="button button-dark" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    </section>
  );
}
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Empty({ text }) {
  return <p className="empty">{text}</p>;
}
function Loading() {
  return (
    <Shell>
      <div className="loading">Loading your workspace...</div>
    </Shell>
  );
}
function SystemDiagram() {
  const ref = React.useRef(null);
  useEffect(() => {
    let active = true;
    const diagram = [
      "flowchart TB",
      "subgraph Users",
      "P[Patient]",
      "A[ASHA worker]",
      "D[Doctor]",
      "end",
      "P --> F[React patient portal]",
      "A --> F",
      "D --> W[React doctor workspace]",
      "F --> API[Express REST API]",
      "W --> API",
      "F -. JWT socket connection .-> S[Socket.IO]",
      "W -. JWT socket connection .-> S",
      "S <--> C[Call rooms & WebRTC signaling]",
      "API --> M[(MongoDB / Mongoose)]",
      "API --> Q[Network quality service]",
      "Q --> C",
      "API --> R[Consultation & appointment services]",
    ].join(String.fromCharCode(10));
    mermaid
      .render(`system-${Date.now()}`, diagram)
      .then(({ svg }) => {
        if (active && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="mermaid-wrap docs-diagram">
      <div
        ref={ref}
        className="mermaid"
        aria-label="Nabha Care system architecture diagram"
      />
    </div>
  );
}
function DeliveryMap() {
  const rows = [
    ["Patient & doctor portals", "live", 88],
    ["Authentication & roles", "live", 80],
    ["Appointments & consultation records", "live", 76],
    ["Call signaling & quality states", "live", 72],
    ["Offline encrypted sync", "planned", 20],
    ["SMS / IVR production fallback", "planned", 15],
    ["Deployment, monitoring & test suite", "planned", 25],
  ];
  return (
    <div
      className="delivery-map"
      aria-label="Implementation maturity by project area"
    >
      {rows.map(([label, state, percent]) => (
        <div className="delivery-row" key={label}>
          <div>
            <strong>{label}</strong>
            <span>
              {state === "live"
                ? "Implemented in the current demo"
                : "Production work remaining"}
            </span>
          </div>
          <div className="delivery-track">
            <i className={state} style={{ width: `${percent}%` }} />
          </div>
          <b>{state === "live" ? "Now" : "Next"}</b>
        </div>
      ))}
    </div>
  );
}
function Docs() {
  return (
    <Shell>
      <section className="wrap docs-hero">
        <p className="kicker">Nabha Care / product & technical documentation</p>
        <h1>A connected-care platform for the real world.</h1>
        <p className="lede">
          This guide explains the complete project clearly: who uses it, how
          information moves, what is working now, and what must happen before a
          public production launch.
        </p>
        <div className="hero-actions">
          <a href="#project-flow" className="button button-green">
            See the care flow
          </a>
          <a href="#launch-plan" className="button button-outline">
            View launch plan
          </a>
        </div>
      </section>
      <section className="wrap docs-grid section">
        <Card label="01 / PEOPLE" title="Patient & ASHA access">
          Patients can use the portal themselves or receive help from a
          frontline ASHA worker during registration, symptoms and vital capture.
        </Card>
        <Card label="02 / CARE" title="Doctor consultation">
          Doctors manage appointments, review patient context and save an
          assessment, advice, prescription and outcome.
        </Card>
        <Card label="03 / PLATFORM" title="Secure coordination">
          JWT protects roles; the API stores clinical records; Socket.IO
          coordinates rooms and quality events for teleconsultations.
        </Card>
      </section>
      <section id="project-flow" className="wrap section">
        <div className="section-head">
          <div>
            <p className="kicker">End-to-end workflow</p>
            <h2>How a consultation moves through Nabha Care</h2>
          </div>
        </div>
        <MermaidFlow />
      </section>
      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="kicker">Technical architecture</p>
            <h2>How the application is organised</h2>
            <p className="section-note">
              Clinical API data, realtime signaling and network-quality history
              have distinct responsibilities.
            </p>
          </div>
        </div>
        <SystemDiagram />
      </section>
      <section className="wrap section docs-split">
        <div>
          <p className="kicker">Technology stack</p>
          <h2>What runs the system</h2>
          <dl className="stack-list">
            <div>
              <dt>Frontend</dt>
              <dd>
                React 19 and Vite provide the landing page and role-focused
                portals.
              </dd>
            </div>
            <div>
              <dt>Application API</dt>
              <dd>
                Node.js and Express expose protected REST endpoints for
                accounts, appointments and consultations.
              </dd>
            </div>
            <div>
              <dt>Realtime layer</dt>
              <dd>
                Socket.IO authenticates participants and relays WebRTC signaling
                plus quality events.
              </dd>
            </div>
            <div>
              <dt>Data layer</dt>
              <dd>
                MongoDB and Mongoose persist patient, doctor, consultation,
                appointment and call-room data in production.
              </dd>
            </div>
            <div>
              <dt>Security layer</dt>
              <dd>
                JWT authentication, role middleware, request validation, logging
                and central error handling are included.
              </dd>
            </div>
          </dl>
        </div>
        <aside className="docs-callout">
          <p className="kicker">Important design decision</p>
          <h3>Audio matters more than video.</h3>
          <p>
            When the connection drops, the platform can step down from HD video
            to lower-resolution video, audio-only, or an offline request rather
            than ending the care journey.
          </p>
        </aside>
      </section>
      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="kicker">Delivery graph</p>
            <h2>Current demo scope vs. production work</h2>
          </div>
          <p className="section-note">
            This is a delivery-status map, not a clinical or service-performance
            metric.
          </p>
        </div>
        <DeliveryMap />
      </section>
      <section id="launch-plan" className="wrap section">
        <div className="section-head">
          <div>
            <p className="kicker">Open-world launch plan</p>
            <h2>How to proceed professionally</h2>
          </div>
        </div>
        <div className="launch-grid">
          {[
            [
              "Phase 1",
              "Finish the clinical journey",
              "Connect actual waiting room, call controls, vital capture, consultation completion and prescription display end to end.",
            ],
            [
              "Phase 2",
              "Make field use reliable",
              "Build an ASHA dashboard, consent flow, encrypted offline queue, sync/retry logic and clear connection states.",
            ],
            [
              "Phase 3",
              "Secure and test",
              "Use managed MongoDB, environment secrets, strict CORS, audit trails, authorization checks, automated API/UI tests and healthcare security review.",
            ],
            [
              "Phase 4",
              "Deploy and operate",
              "Add HTTPS, monitoring, backups, error alerts, user support, accessibility testing, multilingual content and pilot feedback loops.",
            ],
          ].map(([phase, title, copy]) => (
            <article key={phase}>
              <span>{phase}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="wrap section prose production-note">
        <h2>Current boundary</h2>
        <p>
          The repository is a development/demo platform. Emergency dispatch,
          ambulance/driver matching, hospital dispatch, verified Daily.co
          production configuration, SMS/IVR fallback, encrypted offline
          synchronization, full test coverage, monitoring and formal
          security/compliance approval are not finished. They should be
          completed before public or clinical use.
        </p>
        <h2>Run the demo</h2>
        <pre>
          npm install{`\n`}npm run demo{`\n\n`}cd frontend{`\n`}npm install
          {`\n`}npm run dev
        </pre>
        <p>
          Open the local Vite address (normally{" "}
          <code>http://localhost:5173</code>). Demo accounts:{" "}
          <code>patient@demo.local / demo123</code> and{" "}
          <code>doctor@demo.local / demo123</code>.
        </p>
      </section>
    </Shell>
  );
}
function App() {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/patient" || path.endsWith("/patient.html")) return <Patient />;
  if (path === "/doctor" || path.endsWith("/doctor.html")) return <Doctor />;
  if (path === "/docs" || path.endsWith("/docs.html")) return <Docs />;
  return <Home />;
}

export default App;
