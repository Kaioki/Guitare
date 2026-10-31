"use client";

import {
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  deferredUse,
  guide,
  missingSteps,
  phases,
  weeks,
  repertoire,
} from "./plan-data";
import { APP_ID, isGuitarBackup } from "./backup-validation";
import { CORE_BLOCKS, SPECIALIZATION_BLOCKS, trackProgress } from "./progress";
import { buildBackupFilename } from "./backup-filename";

type View = "dashboard" | "path" | "months" | "sessions" | "reference";
type UnitStatus = "not_started" | "in_progress" | "mastered" | "paused";
type SessionStatusFilter = "all" | "done" | "todo" | "saved";

type Unit = {
  id: string;
  number: number;
  title: string;
  objective: string;
  work: string;
  repertoire: string;
  ear: string;
  validation: string;
  moduleNumber: number;
  moduleTitle: string;
  year: number;
  routeIndex: number;
};

type SessionRecord = {
  id: string;
  unitId: string;
  template: string;
  custom: boolean;
  date: string;
  title: string;
  what: string;
  why: string;
  how: string;
  duration: number;
  bpm: string;
  accompaniment: string;
  notes: string;
  successes: string;
  obstacle: string;
  next: string;
  difficulty: number;
  confidence: number;
  completed: boolean;
  updatedAt: string;
};

type UnitProgress = {
  status: UnitStatus;
  note?: string;
  updatedAt: string;
};

type MonthlyReview = {
  ratings: Record<string, "stable" | "progress" | "rework" | "">;
  notes: string;
  updatedAt: string;
};

type AppData = {
  appId: typeof APP_ID;
  version: 5;
  sessions: Record<string, SessionRecord>;
  unitProgress: Record<string, UnitProgress>;
  reviews: Record<string, MonthlyReview>;
};

const TOTAL_WEEKS = 416;
const STORAGE_KEY = "parcours-guitare-albert-v1";
const SESSION_LETTERS = ["A", "B", "C", "D", "E"] as const;

const statusLabels: Record<UnitStatus, string> = {
  not_started: "À venir",
  in_progress: "En cours",
  mastered: "Maîtrisé",
  paused: "En pause",
};

const navItems: { id: View; label: string; caption: string }[] = [
  { id: "dashboard", label: "Aujourd’hui", caption: "Prochaine marche" },
  { id: "path", label: "Parcours", caption: "416 blocs de maîtrise" },
  { id: "months", label: "Mois", caption: "Calendrier et bilans" },
  { id: "sessions", label: "Séances", caption: "Journal modifiable" },
  { id: "reference", label: "Référentiel", caption: "Règles et remédiations" },
];

const standardJourneys = [
 { standard: "Premiers morceaux", start: 14, end: 52, label: "Construire les fondations", badge: "Premiers morceaux", heroLabel: "Tronc commun", summary: "Accords ouverts, riffs simples et continuité. Chaque partie se prépare par cellules avant la forme entière." },
 { standard: "Let You Down", start: 157, end: 169, label: "Fingerstyle EmileGuitar", badge: "Fingerstyle", heroLabel: "Mélodie et accompagnement", summary: "Basse, mélodie puis voix intérieure dans la version complète d’EmileGuitar." },
 { standard: "Spécialisation classique", start: 313, end: 416, label: "Après le tronc commun", badge: "Spécialisation", heroLabel: "Spécialisation classique", summary: "Clair de lune, Asturias et La Campanella : gestes préparés, transcription précise et validation au rythme d’Albert." },
] as const;

const routeUnits: Unit[] = weeks.map((week) => ({
  id: week.id,
  number: week.number,
  title: week.title,
  objective: week.objective,
  work: week.work,
  repertoire: week.repertoire,
  ear: week.ear,
  validation: week.validation,
  moduleNumber: week.moduleNumber,
  moduleTitle: week.moduleTitle,
  year: week.year,
  routeIndex: week.number,
}));

function initialData(): AppData {
  return {
    appId: APP_ID,
    version: 5,
    sessions: {},
    unitProgress: {},
    reviews: {},
  };
}

function formatDate(iso: string, compact = false) {
  if (!iso) return "Date à renseigner";
  const candidate = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(candidate.getTime())) return "Date à renseigner";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: compact ? undefined : "short",
    day: "numeric",
    month: compact ? "short" : "long",
    year: compact ? undefined : "numeric",
  }).format(candidate);
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${key}-15T12:00:00`));
}
function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 15));
}

function standardJourneyForWeek(number: number) {
  return standardJourneys.find(
    (journey) => number >= journey.start && number <= journey.end,
  );
}

function sessionDefaults(unit: Unit, index: number): SessionRecord {
 const titles = ["Préparer et isoler", "Stabiliser lentement", "Relier les cellules", "Mettre en situation", "Enregistrer et valider"];
 const actions = [
  "Écouter le modèle. Fixer le périmètre accessible et les doigtés. Isoler le geste avant de réunir les éléments.",
  "Reprendre le même geste au même tempo. Faire trois répétitions propres de deux cellules, avec une respiration entre les essais.",
  "Répéter six fois la jonction de deux cellules. Les assembler sans nouvelle vitesse ; garder la durée des notes et des silences.",
  "Jouer le périmètre accessible en continu. Enregistrer une première réussite. Ne pas jouer de geste encore fermé.",
  "Faire une prise continue puis réécouter. Comparer au feu vert et à une réussite d’un autre jour. Si le critère manque, garder le même bloc."
 ];
 return {
  id: `${unit.id}-${SESSION_LETTERS[index]}`, unitId: unit.id, template: SESSION_LETTERS[index], custom: false,
  date: "", title: `${SESSION_LETTERS[index]} · ${titles[index]} — ${unit.title}`,
  what: `Technique : ${unit.work}\n\nMorceau : ${unit.repertoire}`,
  why: unit.objective,
  how: `${index===4 ? "3 min de son · 6 min de technique · 4 min d’oreille · 15 min de prises · 2 min de journal." : "3 min d’installation et de son · 8 min de technique · 4 min de repères · 13 min de morceau · 2 min de journal."}\n\n${actions[index]}\n\nTechnique : ${unit.work}\nMorceau : ${unit.repertoire}\nOreille et lecture : ${unit.ear}\nFeu vert : ${unit.validation}`,
  duration: 30, bpm: "", accompaniment: "Guitare du morceau, métronome ou référence sonore de la version choisie",
  notes: "", successes: "", obstacle: "", next: "", difficulty: 3, confidence: 2, completed: false, updatedAt: ""
 };
}

function Field({
  label,
  children,
  tone = "blue",
}: {
  label: string;
  children: ReactNode;
  tone?: "blue" | "gold" | "green";
}) {
  return (
    <div className={`detail-field detail-field--${tone}`}>
      <span>{label}</span>
      <p>{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: UnitStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {statusLabels[status]}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="linear-progress"
      aria-label={`Progression ${value} pour cent`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const [expandedUnit, setExpandedUnit] = useState("S1");
  const [pathSearch, setPathSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [pathStatusFilter, setPathStatusFilter] = useState("all");
  const [sessionUnitFilter, setSessionUnitFilter] = useState("current");
  const [sessionStatusFilter, setSessionStatusFilter] =
    useState<SessionStatusFilter>("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [shownSessions, setShownSessions] = useState(50);
  const [activeMonth, setActiveMonth] = useState("");
  const [editingSession, setEditingSession] =
    useState<SessionRecord | null>(null);
  const [reviewMonth, setReviewMonth] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!isGuitarBackup(parsed)) throw new Error("format");
          setData(parsed as AppData);
        }
      } catch {
        setNotice(
          "La sauvegarde locale n’a pas pu être relue. Une nouvelle copie est ouverte.",
        );
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { setNotice("L’enregistrement local est indisponible. Exportez votre sauvegarde avant de quitter."); }
  }, [data, hydrated]);

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  const getUnitStatus = (unitId: string): UnitStatus =>
    data.unitProgress[unitId]?.status ?? "not_started";

  const masteredCount = routeUnits.filter(
    (unit) => getUnitStatus(unit.id) === "mastered",
  ).length;
  const coreProgress = trackProgress(routeUnits, data.unitProgress, 'core');
  const specializationProgress = trackProgress(routeUnits, data.unitProgress, 'specialization');
  const progressPercent = Math.round((masteredCount / routeUnits.length) * 1000) / 10;
  const current =
    routeUnits.find((unit) => getUnitStatus(unit.id) !== "mastered") ??
    routeUnits[routeUnits.length - 1];

  const baseSessions = useMemo(
    () =>
      routeUnits.flatMap((unit) =>
        SESSION_LETTERS.map((_, index) => sessionDefaults(unit, index)),
      ),
    [],
  );

  const allSessions = useMemo(() => {
    const defaults = baseSessions.map((session) => ({
      ...session,
      ...(data.sessions[session.id] ?? {}),
    }));
    const custom = Object.values(data.sessions).filter(
      (session) => session.custom,
    );
    const unitOrder = new Map(
      routeUnits.map((unit) => [unit.id, unit.routeIndex]),
    );
    return [...defaults, ...custom].sort(
      (a, b) =>
        (unitOrder.get(a.unitId) ?? 9999) -
          (unitOrder.get(b.unitId) ?? 9999) ||
        a.template.localeCompare(b.template) ||
        a.id.localeCompare(b.id),
    );
  }, [baseSessions, data.sessions]);

  const completedSessions = allSessions.filter(
    (session) => session.completed,
  ).length;
  const totalPracticeMinutes = allSessions
    .filter((session) => session.completed)
    .reduce((total, session) => total + Number(session.duration || 0), 0);
  const currentSessions = allSessions.filter(
    (session) => session.unitId === current.id,
  );
  const currentCompleted = currentSessions.filter(
    (session) => !session.custom && session.completed,
  ).length;
  const currentProgress = Math.round((currentCompleted / 5) * 100);

  const phaseStats = phases.map((phase) => {
    const units = routeUnits.filter(
      (unit) => unit.moduleNumber === phase.number,
    );
    const mastered = units.filter(
      (unit) => getUnitStatus(unit.id) === "mastered",
    ).length;
    return {
      ...phase,
      total: units.length,
      mastered,
      percent: Math.round((mastered / units.length) * 100),
    };
  });

  const selectedMonth = activeMonth || monthKey();
  const monthKeys = new Set<string>([selectedMonth, ...Object.keys(data.reviews)]);
  for (let delta = -2; delta <= 3; delta++) monthKeys.add(shiftMonth(selectedMonth, delta));
  allSessions.forEach(session => { if (session.date) monthKeys.add(session.date.slice(0, 7)); });
  const monthGroups = [...monthKeys].sort().map(key => {
    const sessions = allSessions.filter(session => session.date.startsWith(`${key}-`));
    const ids = new Set(sessions.map(session => session.unitId));
    return { key, sessions, units: routeUnits.filter(unit => ids.has(unit.id)) };
  });
  const displayedMonth = monthGroups.find(month => month.key === selectedMonth)!;

  const filteredUnits = routeUnits.filter((unit) => {
    const query = pathSearch.trim().toLocaleLowerCase("fr");
    const matchesSearch =
      !query ||
      `${unit.id} ${unit.title} ${unit.objective} ${unit.work} ${unit.repertoire} ${unit.ear}`
        .toLocaleLowerCase("fr")
        .includes(query);
    const matchesPhase =
      phaseFilter === "all" || String(unit.moduleNumber) === phaseFilter;
    const matchesStatus =
      pathStatusFilter === "all" ||
      getUnitStatus(unit.id) === pathStatusFilter;
    return matchesSearch && matchesPhase && matchesStatus && (trackFilter === "all" || (trackFilter === "core" ? unit.number <= CORE_BLOCKS : unit.number > CORE_BLOCKS));
  });

  const filteredSessions = allSessions.filter((session) => {
    const unit = routeUnits.find((item) => item.id === session.unitId);
    const targetUnit =
      sessionUnitFilter === "current" ? current.id : sessionUnitFilter;
    const matchesUnit =
      targetUnit === "all" || session.unitId === targetUnit;
    const matchesStatus =
      sessionStatusFilter === "all" ||
      (sessionStatusFilter === "done" && session.completed) ||
      (sessionStatusFilter === "todo" && !session.completed) ||
      (sessionStatusFilter === "saved" && Boolean(session.updatedAt));
    const query = sessionSearch.trim().toLocaleLowerCase("fr");
    const matchesSearch =
      !query ||
      `${session.title} ${session.what} ${session.why} ${session.how} ${session.notes} ${unit?.title ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(query);
    return matchesUnit && matchesStatus && matchesSearch;
  });

  function setUnitStatus(unitId: string, status: UnitStatus) {
    setData((previous) => ({
      ...previous,
      unitProgress: {
        ...previous.unitProgress,
        [unitId]: {
          ...(previous.unitProgress[unitId] ?? {}),
          status,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
    notify(`Statut mis à jour : ${statusLabels[status]}.`);
  }

  function saveSession(session: SessionRecord) {
    const nextSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    setData((previous) => {
      const progress = previous.unitProgress[session.unitId];
      return {
        ...previous,
        sessions: {
          ...previous.sessions,
          [session.id]: nextSession,
        },
        unitProgress: {
          ...previous.unitProgress,
          [session.unitId]: {
            ...(progress ?? {}),
            status:
              progress?.status && progress.status !== "not_started"
                ? progress.status
                : "in_progress",
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    setEditingSession(null);
    notify("Séance enregistrée. Elle reste modifiable à tout moment.");
  }

  function toggleSession(session: SessionRecord) {
    saveSession({ ...session, completed: !session.completed });
  }

  function resetTemplate(session: SessionRecord) {
    setData((previous) => {
      const sessions = { ...previous.sessions };
      delete sessions[session.id];
      return { ...previous, sessions };
    });
    setEditingSession(null);
    notify("La séance a retrouvé son contenu guidé d’origine.");
  }

  function deleteCustomSession(session: SessionRecord) {
    if (!window.confirm("Supprimer définitivement cette séance ajoutée ?")) return;
    setData((previous) => {
      const sessions = { ...previous.sessions };
      delete sessions[session.id];
      return { ...previous, sessions };
    });
    setEditingSession(null);
    notify("Séance supplémentaire supprimée.");
  }

  function createCustomSession(unitId = current.id) {
    const unit = routeUnits.find((item) => item.id === unitId) ?? current;
    setEditingSession({
      id: `custom-${typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
      unitId: unit.id,
      template: "+",
      custom: true,
      date: "",
      title: `Séance optionnelle — ${unit.title}`,
      what: `Consolider une difficulté déjà travaillée : ${unit.work}\nMorceau : ${unit.repertoire}`,
      why: `Répéter le bloc jusqu’à ce que son feu vert soit réellement observable : ${unit.validation}`,
      how: `30 minutes maximum, en remplacement d’une séance du week-end : 3 min installation et son, 12 min de reprise des cellules connues, 10 min de répertoire ou jeu libre, 3 min d’écoute, 2 min de bilan. Aucun geste nouveau. Oreille : ${unit.ear}`,
      duration: 30,
      bpm: "",
      accompaniment: "À choisir consciemment",
      notes: "",
      successes: "",
      obstacle: "",
      next: "",
      difficulty: 3,
      confidence: 2,
      completed: false,
      updatedAt: "",
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = buildBackupFilename();
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Copie de sauvegarde téléchargée.");
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported: unknown = JSON.parse(String(reader.result));
        if (!isGuitarBackup(imported)) throw new Error("format");
        const parsed = imported as AppData;
        if ((Object.keys(data.sessions).length || Object.keys(data.unitProgress).length || Object.keys(data.reviews).length) && !window.confirm("Restaurer cette sauvegarde remplacera le suivi actuel d’Albert. Continuer ?")) return;
        setData(parsed);
        notify("Sauvegarde restaurée.");
      } catch {
        notify("Ce fichier ne correspond pas à une sauvegarde valide.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetAll() {
    if (
      !window.confirm(
        "Effacer toutes les séances, validations et notes de cet appareil ? Exportez d’abord une sauvegarde si nécessaire.",
      )
    )
      return;
    setData(initialData());
    setSettingsOpen(false);
    notify("Le suivi a été remis à zéro.");
  }

  function updateReview(
    month: string,
    updater: (review: MonthlyReview) => MonthlyReview,
  ) {
    setData((previous) => {
      const currentReview = previous.reviews[month] ?? {
        ratings: {},
        notes: "",
        updatedAt: "",
      };
      return {
        ...previous,
        reviews: {
          ...previous.reviews,
          [month]: {
            ...updater(currentReview),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function goToUnit(unit: Unit) {
    setExpandedUnit(unit.id);
    setView("path");
    window.setTimeout(() => {
      document
        .getElementById(`unit-${unit.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♪
          </span>
          <div>
            <strong>Le parcours d’Albert</strong>
            <small>guitare acoustique et électrique</small>
          </div>
        </div>

        <nav aria-label="Navigation principale">
          {navItems.map((item) => (
            <button
              className={view === item.id ? "nav-item is-active" : "nav-item"}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.caption}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-progress">
          <div>
            <span>Progression globale</span>
            <strong>{progressPercent.toLocaleString('fr-FR')}%</strong>
          </div>
          <ProgressBar value={progressPercent} />
          <small>
            {masteredCount} bloc{masteredCount > 1 ? "s" : ""} maîtrisé
            {masteredCount > 1 ? "s" : ""} sur {routeUnits.length}
          </small>
        </div>

        <div className="sidebar-note">
          <span className="eyebrow">Principe directeur</span>
          <p>{guide.principle}</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              Guitare pour Albert · 416 blocs de maîtrise
            </span>
            <h1>
              {view === "dashboard" && "Avancer sans brûler d’étape."}
              {view === "path" && "Votre parcours, bloc après bloc."}
              {view === "months" && "Le chemin, mois après mois."}
              {view === "sessions" && "Votre journal de séances."}
              {view === "reference" && "Votre filet de sécurité pédagogique."}
            </h1>
          </div>
          <div className="top-actions">
            <span className="save-state">
              {hydrated ? "Enregistré sur cet appareil" : "Ouverture…"}
            </span>
            <button
              className="button button--quiet"
              onClick={() => setSettingsOpen(true)}
              type="button"
            >
              Sauvegarde
            </button>
            <button
              className="avatar"
              onClick={() => setSettingsOpen(true)}
              type="button"
              aria-label="Ouvrir les réglages"
            >
              A
            </button>
          </div>
        </header>

        <div className="mobile-nav" aria-label="Navigation mobile">
          {navItems.map((item) => (
            <button
              className={view === item.id ? "is-active" : ""}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {view === "dashboard" && (
          <div className="page-stack">
            <section className="content-card cadence-card"><span className="eyebrow">Ton rythme</span><h2>30 minutes le samedi · 30 minutes le dimanche</h2><p>Continue les séances A à E dans l’ordre sur plusieurs week-ends. Un bloc demande au moins trois week-ends pour parcourir ces cinq séances, puis les reprises nécessaires à son feu vert. Aucune séance n’est imposée en semaine.</p></section>
            <section className="track-progress-grid" aria-label="Progression par étape">
              {[
                { title: "Tronc commun", subtitle: "Les fondations et le répertoire", result: coreProgress, first: 1, last: CORE_BLOCKS, filter: "core" },
                { title: "Spécialisation", subtitle: "Les grands objectifs classiques", result: specializationProgress, first: CORE_BLOCKS+1, last: CORE_BLOCKS+SPECIALIZATION_BLOCKS, filter: "specialization" },
              ].map(track => <article className="content-card track-progress-card" key={track.filter}>
                <span className="eyebrow">Blocs {track.first} à {track.last}</span>
                <div className="track-progress-heading"><h2>{track.title}</h2><strong>{track.result.percent.toLocaleString('fr-FR')} %</strong></div>
                <p>{track.subtitle}</p>
                <ProgressBar value={track.result.percent} />
                <div className="track-progress-footer"><span>{track.result.mastered} / {track.result.total} blocs maîtrisés</span><button className="text-button" type="button" onClick={()=>{setTrackFilter(track.filter);setPhaseFilter('all');setPathStatusFilter('all');setPathSearch('');setView('path')}}>Voir les blocs →</button></div>
              </article>)}
            </section>
            <section className="hero-grid">
              <article className="hero-card">
                <div className="hero-copy">
                  <span className="pill pill--gold">
                    {standardJourneyForWeek(current.number)?.heroLabel ??
                      "Votre prochaine marche"}
                  </span>
                  <p className="unit-kicker">
                    Bloc {current.number} · module {current.moduleNumber} sur
                    32
                  </p>
                  <h2>{current.title}</h2>
                  <p className="hero-objective">{current.objective}</p>
                  <div className="hero-actions">
                    <button
                      className="button button--primary"
                      onClick={() => {
                        setUnitStatus(current.id, "in_progress");
                        setSessionUnitFilter(current.id);
                        setView("sessions");
                      }}
                      type="button"
                    >
                      Ouvrir mes cinq séances
                    </button>
                    <button
                      className="button button--ghost"
                      onClick={() => goToUnit(current)}
                      type="button"
                    >
                      Voir le bloc
                    </button>
                  </div>
                </div>
                <div className="hero-progress">
                  <div
                    className="progress-ring"
                    style={
                      {
                        "--progress-deg": `${progressPercent * 3.6}deg`,
                      } as CSSProperties
                    }
                    aria-label={`Progression ${progressPercent} pour cent`}
                  >
                    <div>
                      <strong>{progressPercent.toLocaleString('fr-FR')}%</strong>
                      <span>maîtrisé</span>
                    </div>
                  </div>
                  <p>
                    {masteredCount} / {routeUnits.length} blocs
                  </p>
                  <small>Un bloc se répète jusqu’à validation.</small>
                </div>
              </article>

              <article className="status-card">
                <div className="status-heading">
                  <span className="eyebrow">Votre cap</span>
                  <StatusBadge status={getUnitStatus(current.id)} />
                </div>
                <h3>{current.moduleTitle}</h3>
                <div className="mini-stat-row">
                  <div>
                    <span>Séances terminées</span>
                    <strong>{currentCompleted}/5</strong>
                  </div>
                  <div>
                    <span>Étape du parcours</span>
                    <strong>{current.number <= CORE_BLOCKS ? "Tronc commun" : "Spécialisation"}</strong>
                  </div>
                  <div>
                    <strong>{totalPracticeMinutes}</strong>
                    <span>minutes de pratique</span>
                  </div>
                  <div>
                    <strong>{completedSessions}</strong>
                    <span>séances terminées au total</span>
                  </div>
                </div>
                <ProgressBar value={currentProgress} />
                <div className="anchor-line">
                  <span>Feu vert</span>
                  <strong>{current.validation}</strong>
                </div>
              </article>
            </section>

            <section className="section-grid">
              <article className="content-card">
                <span className="eyebrow">Pourquoi</span>
                <h3>{current.title}</h3>
                <p>{current.objective}</p>
              </article>
              <article className="content-card">
                <span className="eyebrow">Travail concret</span>
                <h3>Une seule difficulté nouvelle</h3>
                <p>{current.work}</p>
              </article>
              <article className="content-card">
                <span className="eyebrow">Oreille</span>
                <h3>Entendre avant d’ajouter</h3>
                <p>{current.ear}</p>
              </article>
            </section>

            <section className="content-card"><span className="eyebrow">Le morceau en cours</span><h3>Du geste à la musique</h3><p>{current.repertoire}</p></section>
            <section className="content-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Ce bloc</span>
                  <h3>Cinq séances, cinq fonctions liées au bloc</h3>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setSessionUnitFilter(current.id);
                    setView("sessions");
                  }}
                  type="button"
                >
                  Ouvrir le journal →
                </button>
              </div>
              <div className="session-mini-grid">
                {currentSessions
                  .filter((session) => !session.custom)
                  .map((session) => (
                    <article
                      className={
                        session.completed
                          ? "session-mini is-complete"
                          : "session-mini"
                      }
                      key={session.id}
                    >
                      <button
                        className="session-check"
                        onClick={() => toggleSession(session)}
                        type="button"
                        aria-label={
                          session.completed
                            ? `Marquer ${session.title} comme à faire`
                            : `Marquer ${session.title} comme terminée`
                        }
                      >
                        {session.completed ? "✓" : session.template}
                      </button>
                      <div>
                        <span>{formatDate(session.date, true)}</span>
                        <strong>{session.title}</strong>
                        <small>{session.what}</small>
                      </div>
                      <button
                        className="mini-edit"
                        onClick={() => setEditingSession(session)}
                        type="button"
                      >
                        Éditer
                      </button>
                    </article>
                  ))}
              </div>
              <button className="text-button optional-session-button" type="button" onClick={()=>createCustomSession(current.id)}>+ Ajouter une reprise optionnelle de 30 min</button>
              {currentProgress === 100 && (
                <div className="validation-banner">
                  <div>
                    <strong>Les cinq séances sont réalisées.</strong>
                    <span>
                      Relisez le feu vert avant de valider ce bloc.
                    </span>
                  </div>
                  <button
                    className="button button--success"
                    onClick={() => setUnitStatus(current.id, "mastered")}
                    type="button"
                  >
                    Valider {current.id}
                  </button>
                </div>
              )}
            </section>

            <section className="content-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Vue d’ensemble</span>
                  <h3>Trente deux modules, sans saut de difficulté</h3>
                </div>
                <button
                  className="text-button"
                  onClick={() => setView("path")}
                  type="button"
                >
                  Ouvrir les 416 blocs →
                </button>
              </div>
              <div className="phase-strip">
                {phaseStats.map((phase) => (
                  <article
                    className={
                      current.moduleNumber === phase.number
                        ? "phase-tile is-current"
                        : "phase-tile"
                    }
                    key={phase.number}
                  >
                    <span>Module {phase.number}</span>
                    <strong>{phase.title}</strong>
                    <small>
                      {phase.mastered}/{phase.total} maîtrisés
                    </small>
                    <ProgressBar value={phase.percent} />
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "path" && (
          <div className="page-stack">
            <section className="view-intro content-card">
              <div>
                <span className="eyebrow">416 blocs de maîtrise</span>
                <h2>312 blocs de tronc commun puis 104 de spécialisation</h2>
                <p>
                  Les numéros indiquent un ordre, pas une échéance. Répétez un
                  bloc tant que son feu vert n’est pas observable dans deux
                  prises continues.
                </p>
              </div>
              <div className="intro-stat">
                <strong>{progressPercent.toLocaleString('fr-FR')}%</strong>
                <span>{masteredCount} bloc{masteredCount > 1 ? "s" : ""} maîtrisé{masteredCount > 1 ? "s" : ""}</span>
              </div>
            </section>

            <section
              className="melodic-bridges"
              aria-label="Étapes du répertoire"
            >
              {standardJourneys.map((journey) => (
                <article className="melodic-bridge-card" key={journey.standard}>
                  <div>
                    <span className="eyebrow">{journey.label}</span>
                    <h3>{journey.standard}</h3>
                    <p>{journey.summary}</p>
                  </div>
                  <div className="melodic-bridge-action">
                    <strong>
                      S{journey.start}–S{journey.end}
                    </strong>
                    <button
                      className="text-button"
                      onClick={() => {
                        const target = routeUnits.find(
                          (unit) => unit.number === journey.start,
                        );
                        if (target) goToUnit(target);
                      }}
                      type="button"
                    >
                      Ouvrir les étapes →
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <section className="filter-bar">
              <label className="search-field">
                <span>Rechercher</span>
                <input
                  value={pathSearch}
                  onChange={(event) => setPathSearch(event.target.value)}
                  placeholder="Barrés, Let You Down, Asturias…"
                />
              </label>
              <label>
                <span>Module</span>
                <select
                  value={phaseFilter}
                  onChange={(event) => setPhaseFilter(event.target.value)}
                >
                  <option value="all">Tous les modules</option>
                  {phases.map((phase) => (
                    <option value={phase.number} key={phase.number}>
                      Module {phase.number}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Statut</span>
                <select
                  value={pathStatusFilter}
                  onChange={(event) => setPathStatusFilter(event.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="not_started">À venir</option>
                  <option value="in_progress">En cours</option>
                  <option value="mastered">Maîtrisé</option>
                  <option value="paused">En pause</option>
                </select>
              </label>
              <label><span>Étape</span><select value={trackFilter} onChange={e=>setTrackFilter(e.target.value)}><option value="all">Tout le parcours</option><option value="core">Tronc commun</option><option value="specialization">Spécialisation</option></select></label>
              <span className="result-count">
                {filteredUnits.length} bloc
                {filteredUnits.length > 1 ? "s" : ""}
              </span>
            </section>

            <section className="unit-list">
              {filteredUnits.map((unit) => {
                const isOpen = expandedUnit === unit.id;
                const status = getUnitStatus(unit.id);
                const unitSessions = displayedMonth.sessions.filter(session => session.unitId === unit.id);
                const done = unitSessions.filter(
                  (session) => session.completed,
                ).length;
                return (
                  <article
                    className={isOpen ? "unit-card is-open" : "unit-card"}
                    id={`unit-${unit.id}`}
                    key={unit.id}
                  >
                    <div className="unit-summary">
                      <button
                        className="unit-open"
                        onClick={() =>
                          setExpandedUnit(isOpen ? "" : unit.id)
                        }
                        type="button"
                        aria-expanded={isOpen}
                      >
                        <span className="unit-number">{unit.id}</span>
                        <span className="unit-title-block">
                          <small>
                            Module {unit.moduleNumber} · {unit.moduleTitle}
                            {standardJourneyForWeek(unit.number) && (
                              <span className="bridge-inline-badge">
                                {standardJourneyForWeek(unit.number)?.badge}
                              </span>
                            )}
                          </small>
                          <strong>{unit.title}</strong>
                        </span>
                        <span className="unit-session-progress">
                          {done}/5 séances
                        </span>
                        <StatusBadge status={status} />
                        <span className="chevron" aria-hidden="true">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="unit-detail">
                        <div className="unit-toolbar">
                          <label>
                            <span>Statut du bloc</span>
                            <select
                              value={status}
                              onChange={(event) =>
                                setUnitStatus(
                                  unit.id,
                                  event.target.value as UnitStatus,
                                )
                              }
                            >
                              <option value="not_started">À venir</option>
                              <option value="in_progress">En cours</option>
                              <option value="mastered">Maîtrisé</option>
                              <option value="paused">En pause</option>
                            </select>
                          </label>
                          <button
                            className="button button--quiet"
                            onClick={() => createCustomSession(unit.id)}
                            type="button"
                          >
                            + Ajouter une séance
                          </button>
                        </div>
                        <div className="details-grid details-grid--unit">
                          <Field label="Pourquoi">{unit.objective}</Field>
                          <Field label="Travail concret">{unit.work}</Field>
                          <Field label="Morceau">{unit.repertoire}</Field>
                          <Field label="Oreille" tone="gold">
                            {unit.ear}
                          </Field>
                          <Field label="Feu vert" tone="green">
                            {unit.validation}
                          </Field>
                        </div>
                        <div className="tim-callout">
                          <span>Place dans le parcours</span>
                          <p>
                            Module{" "}
                            {unit.moduleNumber} — {unit.moduleTitle}
                          </p>
                        </div>
                        <div className="unit-session-grid">
                          {unitSessions.map((session) => (
                            <article
                              className={
                                session.completed
                                  ? "unit-session is-complete"
                                  : "unit-session"
                              }
                              key={session.id}
                            >
                              <button
                                className="session-check"
                                onClick={() => toggleSession(session)}
                                type="button"
                                aria-label={`Cocher la séance ${session.template}`}
                              >
                                {session.completed
                                  ? "✓"
                                  : session.template}
                              </button>
                              <div>
                                <span>{formatDate(session.date, true)}</span>
                                <strong>{session.title}</strong>
                                <small>{session.what}</small>
                              </div>
                              <button
                                className="mini-edit"
                                onClick={() => setEditingSession(session)}
                                type="button"
                              >
                                Ouvrir
                              </button>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {filteredUnits.length === 0 && (
                <div className="empty-state content-card">
                  <strong>Aucun bloc ne correspond à ces filtres.</strong>
                  <button
                    className="text-button"
                    onClick={() => {
                      setPathSearch("");
                      setPhaseFilter("all");
                      setPathStatusFilter("all");
                      setTrackFilter("all");
                    }}
                    type="button"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {view === "months" && displayedMonth && (
          <div className="page-stack">
            <section className="month-navigator content-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Calendrier sans dates imposées</span>
                  <h2>{monthLabel(displayedMonth.key)}</h2>
                </div>
                <button
                  className="button button--quiet"
                  onClick={() => setReviewMonth(displayedMonth.key)}
                  type="button"
                >
                  Bilan du mois
                </button>
              </div>
              <p>
                30 minutes le samedi et 30 minutes le dimanche uniquement. Les séances A à E se poursuivent sur plusieurs week-ends. Ce calendrier affiche les séances que vous avez datées, sans imposer de délai aux blocs. Le bilan reste disponible même pendant un mois de pause.
              </p>
              <div className="calendar-actions"><button className="text-button" type="button" onClick={() => setActiveMonth(shiftMonth(selectedMonth, -1))}>← Mois précédent</button><button className="text-button" type="button" onClick={() => setActiveMonth(monthKey())}>Mois actuel</button><button className="text-button" type="button" onClick={() => setActiveMonth(shiftMonth(selectedMonth, 1))}>Mois suivant →</button></div>
              <div className="month-tabs" aria-label="Choisir un mois">
                {monthGroups.map((month) => {
                  const done = month.sessions.filter(session => session.completed).length;
                  return (
                    <button
                      className={
                        displayedMonth.key === month.key
                          ? "is-active"
                          : ""
                      }
                      onClick={() => setActiveMonth(month.key)}
                      type="button"
                      key={month.key}
                    >
                      <span>{monthLabel(month.key)}</span>
                      <strong>{month.units.length ? `${month.units.length} bloc${month.units.length > 1 ? "s" : ""} travaillé${month.units.length > 1 ? "s" : ""}` : "Aucune séance datée"}</strong>
                      <small>{done} séance{done > 1 ? "s" : ""} faite{done > 1 ? "s" : ""}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            {displayedMonth.units.length === 0 && <section className="content-card"><h3>Un calendrier à ton rythme</h3><p>Date une séance dans le journal pour la retrouver ici. Tu peux continuer le même bloc sur autant de week-ends que nécessaire.</p><button className="button button--quiet" type="button" onClick={() => setView("sessions")}>Ouvrir le journal</button></section>}
            <section className="calendar-weeks">
              {displayedMonth.units.map((unit) => {
                const unitSessions = displayedMonth.sessions.filter(session => session.unitId === unit.id);
                const done = unitSessions.filter(
                  (session) => session.completed,
                ).length;
                return (
                  <article className="calendar-week content-card" key={unit.id}>
                    <div className="calendar-week-heading">
                      <div className="calendar-date">
                        <span>Bloc</span>
                        <strong>{unit.number}</strong>
                      </div>
                      <div>
                        <small>
                          Module {unit.moduleNumber}
                          {standardJourneyForWeek(unit.number)
                            ? ` · ${standardJourneyForWeek(unit.number)?.badge}`
                            : ""}
                        </small>
                        <h3>{unit.title}</h3>
                      </div>
                      <div className="calendar-status">
                        <StatusBadge status={getUnitStatus(unit.id)} />
                        <span>{done}/{unitSessions.length} séances datées</span>
                      </div>
                    </div>
                    <p className="calendar-objective">{unit.objective}</p>
                    <div className="calendar-session-row">
                      {unitSessions.map((session) => (
                        <article
                          className={
                            session.completed
                              ? "calendar-session is-complete"
                              : "calendar-session"
                          }
                          key={session.id}
                        >
                          <button
                            className="session-check"
                            onClick={() => toggleSession(session)}
                            type="button"
                            aria-label={`Cocher ${session.title}`}
                          >
                            {session.completed ? "✓" : session.template}
                          </button>
                          <button
                            className="calendar-session-open"
                            onClick={() => setEditingSession(session)}
                            type="button"
                          >
                            <span>{formatDate(session.date, true)}</span>
                            <strong>{session.title}</strong>
                          </button>
                        </article>
                      ))}
                    </div>
                    <div className="calendar-actions">
                      <button
                        className="text-button"
                        onClick={() => goToUnit(unit)}
                        type="button"
                      >
                        Voir le pourquoi et le feu vert →
                      </button>
                      <button
                        className="text-button"
                        onClick={() => createCustomSession(unit.id)}
                        type="button"
                      >
                        + Répéter avec une séance
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="monthly-review-summary content-card">
              <div>
                <span className="eyebrow">Auto-évaluation mensuelle</span>
                <h3>
                  {
                    Object.values(
                      data.reviews[displayedMonth.key]?.ratings ?? {},
                    ).filter(Boolean).length
                  }
                  /8 critères renseignés
                </h3>
              </div>
              <p>
                Pulsation, forme, son, relâchement, manche, écoute, remédiation et prise complète.
              </p>
              <button
                className="button button--primary"
                onClick={() => setReviewMonth(displayedMonth.key)}
                type="button"
              >
                Éditer le bilan
              </button>
            </section>
          </div>
        )}

        {view === "sessions" && (
          <div className="page-stack">
            <section className="view-intro content-card">
              <div>
                <span className="eyebrow">Journal personnel</span>
                <h2>Toutes les séances restent modifiables</h2>
                <p>
                  Aucune date n’est imposée. Les cinq séances guidées de chaque
                  bloc peuvent être datées, réécrites, cochées puis rouvertes
                  à tout moment.
                </p>
              </div>
              <div className="intro-stat">
                <strong>{completedSessions}</strong>
                <span>séances terminées</span>
              </div>
            </section>

            <section className="filter-bar filter-bar--sessions">
              <label>
                <span>Bloc</span>
                <select
                  value={sessionUnitFilter}
                  onChange={(event) =>
                    setSessionUnitFilter(event.target.value)
                  }
                >
                  <option value="current">Bloc actuel — {current.id}</option>
                  <option value="all">Tous les blocs</option>
                  {routeUnits.map((unit) => (
                    <option value={unit.id} key={unit.id}>
                      {unit.id} — {unit.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>État</span>
                <select
                  value={sessionStatusFilter}
                  onChange={(event) =>
                    setSessionStatusFilter(
                      event.target.value as SessionStatusFilter,
                    )
                  }
                >
                  <option value="all">Toutes</option>
                  <option value="todo">À faire</option>
                  <option value="done">Terminées</option>
                  <option value="saved">Déjà éditées</option>
                </select>
              </label>
              <label className="search-field">
                <span>Rechercher</span>
                <input
                  value={sessionSearch}
                  onChange={(event) => setSessionSearch(event.target.value)}
                  placeholder="oreille, difficulté, note…"
                />
              </label>
              <button
                className="button button--primary"
                onClick={() =>
                  createCustomSession(
                    sessionUnitFilter === "all" ||
                      sessionUnitFilter === "current"
                      ? current.id
                      : sessionUnitFilter,
                  )
                }
                type="button"
              >
                + Séance libre
              </button>
            </section>

            <section className="session-list">
              {filteredSessions.slice(0, shownSessions).map((session) => {
                const unit = routeUnits.find(
                  (item) => item.id === session.unitId,
                );
                return (
                  <article
                    className={
                      session.completed
                        ? "session-row is-complete"
                        : "session-row"
                    }
                    key={session.id}
                  >
                    <button
                      className="session-check session-check--large"
                      onClick={() => toggleSession(session)}
                      type="button"
                      aria-label={`Cocher ${session.title}`}
                    >
                      {session.completed ? "✓" : session.template}
                    </button>
                    <div className="session-row-date">
                      <span>{formatDate(session.date)}</span>
                      <small>{session.duration} min</small>
                    </div>
                    <div className="session-row-main">
                      <span className="session-week-label">
                        {session.unitId}
                      </span>
                      <strong>{session.title}</strong>
                      <p>{session.what}</p>
                      {session.notes && (
                        <p className="note-preview">{session.notes}</p>
                      )}
                    </div>
                    <div className="session-row-meta">
                      {session.updatedAt && (
                        <span className="saved-chip">Modifiée</span>
                      )}
                      <small>{unit?.moduleTitle}</small>
                    </div>
                    <button
                      className="button button--quiet"
                      onClick={() => setEditingSession(session)}
                      type="button"
                    >
                      Éditer
                    </button>
                  </article>
                );
              })}
              {filteredSessions.length === 0 && (
                <div className="empty-state content-card">
                  <strong>Aucune séance ne correspond à ces filtres.</strong>
                </div>
              )}
            </section>

            {filteredSessions.length > shownSessions && (
              <button
                className="load-more"
                onClick={() => setShownSessions((value) => value + 50)}
                type="button"
              >
                Afficher 50 séances supplémentaires
              </button>
            )}
          </div>
        )}

        {view === "reference" && (
          <div className="page-stack reference-stack">
            <section className="reference-hero content-card">
              <div>
                <span className="eyebrow">Votre positionnement</span>
                <h2>Albert, ton rythme est un point d’appui pour construire les gestes.</h2>
                <p>
                  Le parcours relie les gestes aux morceaux choisis par Albert : son, accords, manche, lecture et oreille se construisent progressivement.
                </p>
              </div>
              <div className="reference-decision">
                <strong>Décision de parcours</strong>
                <p>{guide.duration}</p>
              </div>
            </section>

            <section className="content-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Profil pédagogique</span>
                  <h3>Point de départ et conséquence pratique</h3>
                </div>
              </div>
              <div className="profile-table">
                {guide.profile.map((row) => (
                  <article key={row.axis}>
                    <strong>{row.axis}</strong>
                    <p>{row.position}</p>
                    <p>{row.consequence}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="reference-two-col">
              <article className="content-card">
                <span className="eyebrow">Sas de départ</span>
                <h3>Trois vérifications courtes</h3>
                <ol className="clean-list">
                  {guide.startingGate.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </article>
              <article className="content-card">
                <span className="eyebrow">Règles propres à votre profil</span>
                <h3>Protéger la disponibilité mentale</h3>
                <ol className="clean-list">
                  {guide.personalRules.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </article>
            </section>

            <section className="content-card">
              <span className="eyebrow">Répertoire acoustique et électrique</span>
              <h3>Chaque morceau remplit une fonction précise</h3>
              <div className="guitar-prep-grid">
                {guide.guitarPreparation.map((item) => (
                  <article key={item.label}>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-card">
              <span className="eyebrow">Règles de progression</span>
              <h3>Le contrat anti-saut de niveau</h3>
              <div className="rule-grid">
                {guide.generalRules.map((rule, index) => (
                  <article key={rule.label}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{rule.label}</strong>
                      <p>{rule.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-card">
              <span className="eyebrow">Échelle de repli</span>
              <h3>Descendre d’un niveau, puis remonter</h3>
              <p className="section-lead">
                Quand un exercice se dégrade, choisissez le niveau juste en
                dessous. Remontez seulement après deux réussites.
              </p>
              <div className="fallback-ladder">
                {guide.fallbackLadder.map((item, index) => (
                  <article key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-card">
              <span className="eyebrow">Marches pédagogiques ajoutées</span>
              <h3>Ce que le parcours décompose explicitement</h3>
              <div className="missing-step-table">
                {missingSteps.map((item) => (
                  <article key={item.step}>
                    <strong>{item.step}</strong>
                    <p>{item.why}</p>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="reference-two-col">
              <article className="content-card">
                <span className="eyebrow">Méthodes au bon moment</span>
                <h3>Les livres deviennent une bibliothèque</h3>
                <div className="deferred-list">
                  {deferredUse.map((item) => (
                    <article key={item.period}>
                      <strong>{item.period}</strong>
                      <p>{item.content}</p>
                    </article>
                  ))}
                </div>
              </article>
              <article className="content-card">
                <span className="eyebrow">Ce qui ne constitue pas un prérequis</span>
                <h3>Ce qui peut attendre</h3>
                <ul className="clean-list">
                  {guide.notRequired.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="content-card"><div className="card-heading"><div><span className="eyebrow">Les morceaux d’Albert</span><h3>55 nouveaux titres et 2 morceaux déjà abordés</h3></div></div><p>Chaque cible dépend de la version retenue. La liste distingue partie principale et arrangement solo complet.</p><div className="repertoire-register">{repertoire.map(song=><details key={song.number}><summary>{song.title}</summary><p>{song.info}</p><p><strong>Cible : </strong>{song.target}</p><p>{song.level}</p></details>)}</div></section>
            <section className="final-outcome">
              <span className="eyebrow">Résultat attendu</span>
              <h2>
                Jouer les morceaux choisis avec un son régulier et une forme continue.
              </h2>
              <p>
                Les cibles sont des parties de guitare complètes ou des arrangements solo identifiés. La durée des grandes transcriptions classiques reste à ajuster à l’édition et aux validations.
              </p>
            </section>
          </div>
        )}
      </main>

      {editingSession && (
        <div className="drawer-layer" role="presentation">
          <button
            className="drawer-scrim"
            onClick={() => setEditingSession(null)}
            type="button"
            aria-label="Fermer l’éditeur"
          />
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-editor-title"
          >
            <div className="drawer-heading">
              <div>
                <span className="eyebrow">
                  {editingSession.unitId} · séance {editingSession.template}
                </span>
                <h2 id="session-editor-title">{editingSession.title}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setEditingSession(null)}
                type="button"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form
              className="editor-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveSession({ ...editingSession, date: String(new FormData(event.currentTarget).get("sessionDate") || "") });
              }}
            >
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={editingSession.completed}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      completed: event.target.checked,
                    })
                  }
                />
                <span>Séance terminée</span>
              </label>

              <div className="form-row form-row--three">
                <label>
                  <span>Date — facultative</span>
                  <input
                    type="date"
                    name="sessionDate"
                    value={editingSession.date}
                    onBlur={(event) => setEditingSession({ ...editingSession, date: event.currentTarget.value })}
                    onChange={(event) =>
                      setEditingSession({
                        ...editingSession,
                        date: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>Durée (min)</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={editingSession.duration || ""}
                    onChange={(event) =>
                      setEditingSession({
                        ...editingSession,
                        duration: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Tempo BPM</span>
                  <input
                    inputMode="numeric"
                    value={editingSession.bpm}
                    onChange={(event) =>
                      setEditingSession({
                        ...editingSession,
                        bpm: event.target.value,
                      })
                    }
                    placeholder="ex. 52"
                  />
                </label>
              </div>

              <label>
                <span>Titre</span>
                <input
                  value={editingSession.title}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Ce que je dois faire</span>
                <textarea
                  rows={4}
                  value={editingSession.what}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      what: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Pourquoi</span>
                <textarea
                  rows={3}
                  value={editingSession.why}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      why: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Comment, pas à pas</span>
                <textarea
                  rows={7}
                  value={editingSession.how}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      how: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Accompagnement / playback</span>
                <input
                  value={editingSession.accompaniment}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      accompaniment: event.target.value,
                    })
                  }
                />
              </label>

              <div className="form-row">
                <label>
                  <span>Difficulté ressentie</span>
                  <select
                    value={editingSession.difficulty}
                    onChange={(event) =>
                      setEditingSession({
                        ...editingSession,
                        difficulty: Number(event.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option value={value} key={value}>
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Confiance</span>
                  <select
                    value={editingSession.confidence}
                    onChange={(event) =>
                      setEditingSession({
                        ...editingSession,
                        confidence: Number(event.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option value={value} key={value}>
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>Mes notes</span>
                <textarea
                  rows={4}
                  value={editingSession.notes}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Ce que j’ai réellement joué, sensations, repères…"
                />
              </label>

              <label>
                <span>Ce qui a fonctionné</span>
                <textarea
                  rows={3}
                  value={editingSession.successes}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      successes: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Obstacle précis</span>
                <textarea
                  rows={3}
                  value={editingSession.obstacle}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      obstacle: event.target.value,
                    })
                  }
                  placeholder="Ex. une corde reste étouffée au changement d’accord…"
                />
              </label>

              <label>
                <span>Prochaine action</span>
                <textarea
                  rows={3}
                  value={editingSession.next}
                  onChange={(event) =>
                    setEditingSession({
                      ...editingSession,
                      next: event.target.value,
                    })
                  }
                  placeholder="Une seule décision concrète pour la séance suivante."
                />
              </label>

              <div className="drawer-actions">
                <button className="button button--primary" type="submit">
                  Enregistrer la séance
                </button>
                {!editingSession.custom && editingSession.updatedAt && (
                  <button
                    className="button button--quiet"
                    onClick={() => resetTemplate(editingSession)}
                    type="button"
                  >
                    Revenir au modèle
                  </button>
                )}
                {editingSession.custom && editingSession.updatedAt && (
                  <button
                    className="button button--danger"
                    onClick={() => deleteCustomSession(editingSession)}
                    type="button"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </form>
          </aside>
        </div>
      )}

      {reviewMonth && (
        <div className="drawer-layer" role="presentation">
          <button
            className="drawer-scrim"
            onClick={() => setReviewMonth(null)}
            type="button"
            aria-label="Fermer le bilan"
          />
          <aside
            className="drawer drawer--review"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
          >
            <div className="drawer-heading">
              <div>
                <span className="eyebrow">Bilan mensuel</span>
                <h2 id="review-title">
                  {monthLabel(reviewMonth)}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => setReviewMonth(null)}
                type="button"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p className="drawer-intro">
              Le bilan ne sert pas à vous noter. Il indique quel paramètre doit
              être protégé le mois suivant.
            </p>
            <div className="review-list">
              {guide.monthlyCriteria.map((criterion, index) => {
                const value =
                  data.reviews[reviewMonth]?.ratings[String(index)] ?? "";
                return (
                  <article key={criterion}>
                    <p>{criterion}</p>
                    <div>
                      {(
                        [
                          ["stable", "Stable"],
                          ["progress", "En progrès"],
                          ["rework", "À retravailler"],
                        ] as const
                      ).map(([rating, label]) => (
                        <button
                          className={value === rating ? "is-active" : ""}
                          onClick={() =>
                            updateReview(reviewMonth, (review) => ({
                              ...review,
                              ratings: {
                                ...review.ratings,
                                [String(index)]: rating,
                              },
                            }))
                          }
                          type="button"
                          key={rating}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
            <label className="review-notes">
              <span>Note de synthèse et priorité du mois suivant</span>
              <textarea
                rows={6}
                value={data.reviews[reviewMonth]?.notes ?? ""}
                onChange={(event) =>
                  updateReview(reviewMonth, (review) => ({
                    ...review,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <button
              className="button button--primary"
              onClick={() => {
                setReviewMonth(null);
                notify("Bilan mensuel enregistré.");
              }}
              type="button"
            >
              Fermer et conserver
            </button>
          </aside>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-layer" role="presentation">
          <button
            className="drawer-scrim"
            onClick={() => setSettingsOpen(false)}
            type="button"
            aria-label="Fermer les réglages"
          />
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="drawer-heading">
              <div>
                <span className="eyebrow">Données personnelles</span>
                <h2 id="settings-title">Sauvegarder votre progression</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setSettingsOpen(false)}
                type="button"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p>
              Vos données restent dans ce navigateur. Exportez régulièrement
              une copie JSON pour pouvoir les restaurer sur un autre appareil.
              Aucune date de parcours n’est créée automatiquement.
            </p>
            <div className="settings-actions">
              <button
                className="button button--primary"
                onClick={exportData}
                type="button"
              >
                Exporter ma sauvegarde
              </button>
              <label className="button button--quiet file-button">
                Restaurer une sauvegarde
                <input type="file" accept=".json" onChange={importData} />
              </label>
              <button
                className="button button--quiet"
                onClick={() => window.print()}
                type="button"
              >
                Imprimer la vue
              </button>
              <button
                className="button button--danger"
                onClick={resetAll}
                type="button"
              >
                Tout remettre à zéro
              </button>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </div>
  );
}
