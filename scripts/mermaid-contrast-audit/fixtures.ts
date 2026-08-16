/**
 * One diagram per Mermaid diagram type the blog renders, kept close to the kind of content that
 * actually appears in a post: author supplied `style`/`classDef` fills, a per-point color in the
 * quadrant chart, external elements in C4, done and critical bars in the gantt chart. The audit is
 * only as good as what these exercise, so a new diagram type belongs here.
 */
export const MERMAID_FIXTURES: Array<{ kind: string; code: string }> = [
  {
    kind: 'flowchart',
    code: `flowchart TD
  A[Redaktion] -->|Entwurf| B{Freigabe?}
  B -->|ja| C[Publizieren]
  B -->|nein| D[Überarbeiten]
  D --> B
  subgraph Pipeline
    C --> E[(Index)]
  end
  style C fill:#eef,stroke:#333
  classDef warn fill:#fde68a,stroke:#b45309,color:#7c2d12
  class D warn`,
  },
  {
    kind: 'er',
    code: `erDiagram
  ARTIKEL ||--o{ REVISION : hat
  ARTIKEL {
    uuid id PK
    string anzeigename
    timestamp erstellt_am
    string status "Entwurf, InReview, Freigegeben"
  }
  REVISION {
    uuid id PK
    uuid artikel_id FK
    int nummer
  }`,
  },
  {
    kind: 'gantt',
    code: `gantt
  title Migration
  dateFormat YYYY-MM-DD
  axisFormat %d.%m
  section Vorbereitung
  Anforderungen klären :done, a1, 2026-01-05, 5d
  Zielschema entwerfen :done, a2, after a1, 4d
  section Implementierung
  Indexer-Adapter schreiben :active, b1, 2026-01-15, 8d
  Testdatensatz aufbauen :active, b2, after b1, 3d
  Dual-Write aktivieren : b3, after b2, 5d
  Abgleich und Korrekturlauf : b4, after b3, 6d
  Alten Index abschalten :crit, b5, after b4, 2d
  section Meilensteine
  Code Freeze :milestone, m1, 2026-02-01, 0d`,
  },
  {
    kind: 'timeline',
    code: `timeline
  title Release-Historie
  2024 : Prototyp : Erste Tests
  2025 : Beta : Pilotkunden
  2026 : GA : Skalierung`,
  },
  {
    kind: 'kanban',
    code: `kanban
  Backlog
    [Suche verbessern]
    [Bildkomprimierung]
  Bereit zur Umsetzung
    [Tag-Filter]
  In Arbeit
    [Neuer Editor]
  Fertig
    [Dark Mode]`,
  },
  {
    kind: 'gitGraph',
    code: `gitGraph
  commit id: "init"
  branch feature
  checkout feature
  commit id: "editor"
  commit id: "tests"
  checkout main
  merge feature
  branch hotfix
  commit id: "cache"
  checkout main
  merge hotfix tag: "v2.0.1"
  commit id: "release"`,
  },
  {
    kind: 'journey',
    code: `journey
  title Autor veröffentlicht einen Artikel
  section Entwurf
    Login: 5: Autor
    Editor öffnen: 4: Autor
  section Review
    Freigabe anfordern: 3: Autor, Redaktion
    Korrekturen: 2: Autor`,
  },
  {
    kind: 'mindmap',
    code: `mindmap
  root((DevNotes))
    Inhalte
      Artikel
      Serien
    Technik
      React
      Firebase
    Betrieb
      Monitoring`,
  },
  {
    kind: 'quadrantChart',
    code: `quadrantChart
  title Risiken
  x-axis Gering --> Hoch
  y-axis Selten --> Häufig
  quadrant-1 Sofort
  quadrant-2 Beobachten
  quadrant-3 Ignorieren
  quadrant-4 Planen
  Cache-Stampede: [0.75, 0.8] radius: 12, color: #b00020
  Index-Drift: [0.4, 0.3]
  Mail-Ausfall: [0.6, 0.2]`,
  },
  {
    kind: 'pie',
    code: `pie showData
  title Traffic-Quellen
  "Suche" : 55
  "Direkt" : 25
  "Social" : 12
  "Referral" : 8`,
  },
  {
    kind: 'xychart',
    code: `xychart-beta
  title "Seitenaufrufe"
  x-axis [Jan, Feb, Mrz, Apr, Mai]
  y-axis "Aufrufe" 0 --> 10000
  bar [3200, 4100, 5300, 6900, 8400]
  line [3200, 4100, 5300, 6900, 8400]`,
  },
  {
    kind: 'sankey',
    code: `sankey-beta
  Suche,Startseite,55
  Direkt,Startseite,25
  Startseite,Artikel,60
  Artikel,Abschluss,15
  Startseite,Abbruch,20`,
  },
  {
    kind: 'radar',
    code: `radar-beta
  title Qualitätsziele
  axis a["Performance"], b["A11y"], c["SEO"], d["Tests"]
  curve heute{70, 55, 80, 40}
  curve ziel{90, 90, 90, 85}`,
  },
  {
    kind: 'treemap',
    code: `treemap-beta
"Bundle"
    "vendor"
        "react": 120
        "mermaid": 900
    "app"
        "editor": 210
        "blog": 90`,
  },
  {
    kind: 'block',
    code: `block-beta
  columns 3
  Client:3
  API Cache DB
  space:3
  Worker:3`,
  },
  {
    kind: 'architecture',
    code: `architecture-beta
  group api(cloud)[Cloud]
  service db(database)[Firestore] in api
  service host(server)[Hosting] in api
  service disk(disk)[Storage] in api
  host:R --> L:db
  db:R --> L:disk`,
  },
  {
    kind: 'c4',
    code: `C4Context
  title Systemkontext Medienhaus
  Enterprise_Boundary(b0, "Medienhaus") {
    Person(autor, "Autor", "Erstellt und reicht Artikel ein")
    System(cms, "DevNotes", "Redaktion und Auslieferung")
  }
  System_Ext(cdn, "CDN", "Auslieferung der öffentlichen Seiten")
  System_Ext(mail, "Mail Provider", "Benachrichtigungen")
  Rel(autor, cms, "schreibt")
  Rel(cms, cdn, "publiziert")
  Rel(cms, mail, "sendet")`,
  },
  {
    kind: 'requirement',
    code: `requirementDiagram
  requirement suche {
    id: 1
    text: Volltextsuche unter 200ms
    risk: high
    verifymethod: test
  }
  element indexer {
    type: service
  }
  indexer - satisfies -> suche`,
  },
  {
    kind: 'packet',
    code: `packet-beta
  title Header eines Veröffentlichungs-Events
  0-15: "Quell-Port"
  16-23: "Version"
  24-31: "Typ"
  32-63: "Event-ID"
  64-95: "Zeitstempel"
  96-127: "Nutzlast-Länge"`,
  },
  {
    kind: 'stateDiagram',
    code: `stateDiagram-v2
  [*] --> Entwurf
  Entwurf --> InReview : einreichen
  InReview --> Freigegeben : freigeben
  InReview --> Entwurf : ablehnen
  Freigegeben --> [*]
  state InReview {
    [*] --> Fachpruefung
    Fachpruefung --> Lektorat
  }`,
  },
  {
    kind: 'classDiagram',
    code: `classDiagram
  class Artikel {
    +String titel
    +Status status
    +publizieren()
  }
  class Revision {
    +int nummer
  }
  Artikel "1" --> "*" Revision`,
  },
  {
    kind: 'sequence',
    code: `sequenceDiagram
  autonumber
  actor A as Autor
  participant S as Server
  participant D as Firestore
  A->>S: Artikel speichern
  S->>D: Dokument schreiben
  D-->>S: OK
  S-->>A: gespeichert
  Note over S,D: Revision wird angelegt`,
  },
];
