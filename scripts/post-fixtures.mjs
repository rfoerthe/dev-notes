const EXAMPLE_POST_COUNT = 100;

const topics = [
  {
    name: 'Frontendentwicklung',
    baseTags: ['Frontend'],
    optionalTags: ['React', 'TypeScript', 'Accessibility', 'CSS', 'Performance', 'Testing', 'Design Systems', 'Vite', 'Storybook', 'UX', 'Routing', 'Monorepo', 'i18n', 'Feature Flags', 'Observability', 'Migration'],
    titles: [
      'Komponentenarchitektur, die auch nach dem Launch lesbar bleibt',
      'State Management ohne globale Baustellen',
      'Design Tokens als Vertrag zwischen Code und UI',
      'Performance-Budgets fuer moderne React-Apps',
      'Formulare, die Nutzer und Entwickler weniger nerven',
      'Accessibility-Checks direkt im Feature-Workflow',
      'CSS Container Queries in echten Produktoberflaechen',
      'Server Components sauber in bestehende Frontends einbauen',
      'Fehlerzustande als Teil des Designs planen',
      'Microinteractions mit messbarem Nutzen',
      'Frontend-Tests, die Refactoring erlauben',
      'Routing-Strategien fuer grosse SPA-Teams',
      'Responsive Tabellen ohne horizontales Chaos',
      'Bundle-Analyse ohne falsche Optimierungsreflexe',
      'Design-System-Komponenten mit klaren Grenzen',
      'Datenladen mit Suspense verstaendlich strukturieren',
      'Client-State und Server-State sauber trennen',
      'UI-Regressionen mit Storybook sichtbar machen',
      'Internationalisierung in React frueh mitdenken',
      'Feature-Flags im Frontend kontrolliert einsetzen',
      'Monorepo-Frontends ohne Build-Frust organisieren',
      'Barrierefreie Dialoge und Menues testen',
      'Frontend-Monitoring aus Nutzersicht aufbauen',
      'Migrationen von Legacy-SPAs schrittweise planen',
      'Komponenten-APIs fuer Produktteams entwerfen'
    ]
  },
  {
    name: 'KI',
    baseTags: ['KI'],
    optionalTags: ['LLM', 'RAG', 'Embeddings', 'Eval', 'Prompting', 'Agents', 'Tool Calling', 'Streaming', 'Guardrails', 'Cost Control', 'Privacy', 'Moderation', 'Retrieval', 'Model Routing', 'Caching', 'Synthetic Data'],
    titles: [
      'RAG-Pipelines pragmatisch fuer interne Wissenssysteme',
      'Prompt-Versionierung als Teil des Release-Prozesses',
      'Eval-Sets fuer KI-Features ohne Forschungsabteilung',
      'Tool Calling robust gegen unvollstaendige Eingaben machen',
      'Kostenkontrolle fuer produktive LLM-Anwendungen',
      'KI-Assistenten mit klaren Produktgrenzen',
      'Embeddings sinnvoll chunking-freundlich vorbereiten',
      'Human-in-the-loop Workflows fuer kritische Entscheidungen',
      'Streaming-Antworten mit guter Nutzerfuehrung',
      'Guardrails, die Entwickler wirklich warten koennen',
      'Agenten-Workflows beobachten und debuggen',
      'Strukturierte Outputs ohne fragile Parser',
      'KI-Prototypen in verlaessliche Features ueberfuehren',
      'Model Routing fuer Kosten und Latenz optimieren',
      'Prompt-Injection-Risiken in Produktfeatures reduzieren',
      'Kontextfenster bewusst statt grenzenlos nutzen',
      'KI-Logs fuer Debugging und Datenschutz balancieren',
      'Fallbacks fuer instabile Modellantworten planen',
      'Retrieval-Qualitaet mit einfachen Metriken messen',
      'KI-Workflows mit klaren Abbruchbedingungen bauen',
      'Synthetic Data fuer robuste Tests einsetzen',
      'Mehrsprachige KI-Antworten konsistent halten',
      'Moderation als Produktentscheidung verstehen',
      'LLM-Caching fuer wiederkehrende Anfragen nutzen',
      'KI-Features mit realen Nutzerfragen evaluieren'
    ]
  },
  {
    name: 'Rust',
    baseTags: ['Rust'],
    optionalTags: ['Systems', 'Performance', 'Tokio', 'CLI', 'WASM', 'Serde', 'Error Handling', 'Tracing', 'FFI', 'Traits', 'Generics', 'Benchmarking', 'Unsafe', 'Queues', 'State Machines', 'Cross Compilation'],
    titles: [
      'Ownership im Team erklaeren, ohne Lehrbuchmodus',
      'Fehlerbehandlung mit Result in groesseren Services',
      'Async Rust zwischen Tokio, Traits und Lesbarkeit',
      'CLI-Tools mit clap und sauberer Konfiguration',
      'WebAssembly als Bruecke zwischen Rust und Frontend',
      'Serde-Modelle, die API-Aenderungen ueberleben',
      'Zero-Cost Abstractions im Alltag bewerten',
      'Rust fuer datenintensive Hintergrundjobs',
      'Lifetimes dort verstehen, wo sie wirklich weh tun',
      'Tracing und Observability in Rust-Services',
      'FFI-Grenzen vorsichtig und testbar gestalten',
      'Crate-Auswahl fuer langlebige Codebases',
      'Iteratoren nutzen ohne Lesbarkeit zu verlieren',
      'Trait-Objekte und Generics pragmatisch abwaegen',
      'Error Types fuer Bibliotheken sauber gestalten',
      'Rust-Services containerfreundlich bauen',
      'Memory Layout verstehen, wenn Performance zaehlt',
      'Config-Parsing mit Typen absichern',
      'Benchmarking mit criterion realistisch aufsetzen',
      'Unsafe Code auf kleine Inseln begrenzen',
      'Message Queues mit Rust robust anbinden',
      'State Machines typsicher modellieren',
      'Cross Compilation fuer CLI-Releases automatisieren',
      'Datenvalidierung mit neuen Typen ausdruecken',
      'Rust in bestehende Backend-Landschaften einfuehren'
    ]
  },
  {
    name: 'Python',
    baseTags: ['Python'],
    optionalTags: ['Backend', 'Data', 'FastAPI', 'Pydantic', 'pytest', 'Packaging', 'AsyncIO', 'Pandas', 'Django', 'SQLAlchemy', 'Celery', 'mypy', 'Ruff', 'Caching', 'Machine Learning', 'SDK'],
    titles: [
      'Typisierte Python-Services mit Pydantic und mypy',
      'FastAPI-Strukturen fuer wachsende Teams',
      'Datenpipelines klein starten und sauber erweitern',
      'pytest-Fixtures ohne versteckte Kopplung',
      'Packaging mit pyproject.toml vernuenftig ordnen',
      'Async Python dort einsetzen, wo es sich lohnt',
      'Notebook-Prototypen in Produktionscode ueberfuehren',
      'Logging-Konventionen fuer Python-Backends',
      'Dependency-Management zwischen App und Analyse',
      'Pandas-Workflows schrittweise beschleunigen',
      'Background Jobs mit klaren Retry-Regeln',
      'API-Clients in Python stabil testen',
      'Django-Projekte modular weiterentwickeln',
      'SQLAlchemy-Modelle ohne versteckte Seiteneffekte',
      'Datenvalidierung zwischen API und Domain trennen',
      'Celery-Queues mit Observability betreiben',
      'Python-Typen fuer bessere Editor-Unterstuetzung',
      'Konfigurationsmanagement mit Settings-Klassen',
      'Dateiverarbeitung speicherschonend streamen',
      'Machine-Learning-Prototypen sauber paketieren',
      'Ruff und Formatter im Team einfuehren',
      'Fehlerklassen fuer stabile Python-SDKs',
      'Caching in Python-Backends nachvollziehbar machen',
      'DataFrames fuer groessere Datenmengen planen',
      'Release-Automation fuer Python-Pakete aufsetzen'
    ]
  }
];

const summaries = {
  Frontendentwicklung: 'Ein praxisnaher Blick auf Frontend-Entwicklung, der Architektur, Nutzererlebnis und wartbare Umsetzung zusammenbringt.',
  KI: 'Ein kompakter Leitfaden fuer KI-Features, die nicht nur beeindruckend wirken, sondern im Produktbetrieb nachvollziehbar bleiben.',
  Rust: 'Ein technischer Artikel ueber Rust im Alltag, mit Fokus auf robuste Schnittstellen, Performance und langfristig lesbaren Code.',
  Python: 'Ein praxisorientierter Beitrag fuer Python-Projekte, die von schneller Umsetzung zu verlaesslicher Produktqualitaet wachsen.'
};

const calculateReadTime = (text) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const createTags = ({ topic, index, topicIndex }) => {
  const tags = [...topic.baseTags];
  const optionalTags = topic.optionalTags;
  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  };

  addTag(optionalTags[(topicIndex * 2 + index) % optionalTags.length]);

  if (index % 2 === 0) {
    addTag(optionalTags[(topicIndex + 3) % optionalTags.length]);
  }

  if (index % 3 === 0) {
    addTag(optionalTags[(index + 5) % optionalTags.length]);
  }

  if (index % 5 === 0) {
    addTag(optionalTags[(topicIndex * 7 + index + 9) % optionalTags.length]);
  }

  if (index % 11 === 0) {
    addTag(topic.name === 'Frontendentwicklung' ? 'WebDev' : topic.name === 'KI' ? 'Automation' : topic.name === 'Rust' ? 'Reliability' : 'APIs');
  }

  return tags.slice(0, 6);
};

const codeExamples = {
  Frontendentwicklung: () => [
    '```tsx',
    'type ArticleCardProps = {',
    '  title: string;',
    '  summary: string;',
    '  onOpen: () => void;',
    '};',
    '',
    'export function ArticleCard({ title, summary, onOpen }: ArticleCardProps) {',
    '  return (',
    '    <button className="article-card" onClick={onOpen}>',
    '      <strong>{title}</strong>',
    '      <span>{summary}</span>',
    '    </button>',
    '  );',
    '}',
    '```'
  ].join('\n'),
  KI: () => [
    '```ts',
    'const response = await model.generateObject({',
    '  schema: articleSummarySchema,',
    '  prompt: `Fasse diesen Artikel fuer Entwickler zusammen: ${content}`',
    '});',
    '',
    'if (response.object.confidence < 0.7) {',
    '  return { status: "needs-review", draft: response.object };',
    '}',
    '```'
  ].join('\n'),
  Rust: () => [
    '```rust',
    'use anyhow::{Context, Result};',
    '',
    'fn load_config(path: &str) -> Result<AppConfig> {',
    '    let raw = std::fs::read_to_string(path)',
    '        .with_context(|| format!("cannot read config at {path}"))?;',
    '    toml::from_str(&raw).context("invalid config format")',
    '}',
    '```'
  ].join('\n'),
  Python: () => [
    '```python',
    'from pydantic import BaseModel',
    '',
    'class ArticlePayload(BaseModel):',
    '    title: str',
    '    tags: list[str]',
    '',
    'def normalize(payload: ArticlePayload) -> dict[str, object]:',
    '    return {"title": payload.title.strip(), "tags": sorted(set(payload.tags))}',
    '```'
  ].join('\n')
};

const createCodeSection = (topic) => `### Codebeispiel

${codeExamples[topic]()}`;

const createContent = ({ topic, title, index, includeCode }) => {
  const sections = [
    `## ${title}`,
    `Dieser Beispielartikel gehoert zum Themenbereich ${topic}. Er ist bewusst realistisch formuliert, damit die Uebersicht mit vielen Posts wie ein echtes Archiv wirkt und nicht nur wie ein technischer Platzhalter.`,
    `### Ausgangspunkt

Teams merken oft erst spaet, dass kleine Entscheidungen in Architektur, Tooling und Dokumentation grosse Auswirkungen auf die Wartbarkeit haben. Der Beitrag zeigt, welche Fragen frueh gestellt werden sollten und welche Signale darauf hindeuten, dass ein Ansatz skaliert.`,
    `### Praktische Umsetzung

Der wichtigste Schritt ist ein kleiner, wiederholbarer Workflow: Anforderungen knapp beschreiben, Risiken sichtbar machen, Messpunkte definieren und den ersten Wurf so schneiden, dass spaetere Verbesserungen moeglich bleiben. Fuer ${topic} bedeutet das, technische Optionen nicht isoliert zu bewerten, sondern entlang echter Produktablaeufe.`
  ];

  if (includeCode) {
    sections.push(createCodeSection(topic));
  }

  sections.push(`### Fazit

Gute Developer-Erfahrung entsteht selten durch ein einzelnes Tool. Sie entsteht, wenn Code, Tests, Review und Betrieb zusammenpassen. Beispiel ${index + 1} fasst diese Perspektive in einem bewusst kompakten Format zusammen.`);

  return sections.join('\n\n');
};

export const createExamplePosts = () => {
  const now = Date.now();
  const definitions = topics.flatMap((topic, topicIndex) => (
    topic.titles.map((title, index) => ({
      topic: topic.name,
      title,
      tags: createTags({ topic, index, topicIndex })
    }))
  ));

  return definitions.slice(0, EXAMPLE_POST_COUNT).map((definition, index) => {
    const content = createContent({ ...definition, index, includeCode: index % 2 === 0 });
    const createdAt = new Date(now - index * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `example-post-${String(index + 1).padStart(3, '0')}`,
      title: definition.title,
      summary: summaries[definition.topic],
      content,
      tags: definition.tags,
      authorName: 'Blog Admin',
      authorUsername: 'admin',
      createdAt,
      readTime: calculateReadTime(content)
    };
  });
};

export const withoutDocumentId = ({ id, ...post }) => post;

export const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith('--')) continue;

    const [rawKey, rawValue] = arg.slice(2).split('=');
    if (rawValue !== undefined) {
      options[rawKey] = rawValue;
    } else if (args[index + 1] && !args[index + 1].startsWith('--')) {
      options[rawKey] = args[index + 1];
      index += 1;
    } else {
      options[rawKey] = true;
    }
  }

  return options;
};

export const normalizeTarget = (target) => {
  if (target === 'firestore') {
    return target;
  }
  return null;
};

export const printTargetHelp = (scriptName, description) => {
  console.error('');
  console.error(description);
  console.error('');
  console.error('Usage:');
  console.error(`  npm run ${scriptName} -- --target firestore`);
  console.error('');
  console.error('Targets:');
  console.error('- firestore: applies the change directly with the Firebase Admin SDK');
};
