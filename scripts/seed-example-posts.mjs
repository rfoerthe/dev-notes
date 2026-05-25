import { getFirestore } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp } from './firebase-admin-utils.mjs';
import {
  createExamplePosts,
  createMockSeedSnippet,
  normalizeTarget,
  parseArgs,
  printMockSnippet,
  printTargetHelp,
  withoutDocumentId
} from './post-fixtures.mjs';

const seedFirestorePosts = async (posts) => {
  initializeAdminApp();

  const db = getFirestore();
  const chunks = [];
  for (let index = 0; index < posts.length; index += 450) {
    chunks.push(posts.slice(index, index + 450));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((post) => {
      batch.set(db.collection('blogs').doc(post.id), withoutDocumentId(post));
    });
    await batch.commit();
  }

  console.log(`Seeded ${posts.length} Firestore example blog post(s).`);
};

const main = async () => {
  const options = parseArgs();
  const target = normalizeTarget(options.target);

  if (!target) {
    printTargetHelp('posts:seed', 'Seed 100 DevNotes example posts about Frontendentwicklung, KI, Rust, and Python. Half include code examples.');
    process.exit(1);
  }

  const posts = createExamplePosts();

  if (target === 'firestore' || target === 'all') {
    await seedFirestorePosts(posts);
  }

  if (target === 'mock' || target === 'all') {
    printMockSnippet({
      title: 'Mock browser store seed snippet',
      snippet: createMockSeedSnippet(posts)
    });
  }
};

try {
  await main();
} catch (error) {
  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    console.error('');
    console.error('Seeding example posts failed.');
    console.error('');
    console.error(unknownError?.message || unknownError);
    process.exit(1);
  }
}
