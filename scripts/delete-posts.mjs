import { getFirestore } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp } from './firebase-admin-utils.mjs';
import {
  createMockDeleteSnippet,
  normalizeTarget,
  parseArgs,
  printMockSnippet,
  printTargetHelp
} from './post-fixtures.mjs';

const deleteFirestorePosts = async () => {
  initializeAdminApp();

  const db = getFirestore();
  let deletedCount = 0;

  while (true) {
    const snapshot = await db.collection('blogs').limit(450).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    deletedCount += snapshot.size;
  }

  console.log(`Deleted ${deletedCount} Firestore blog post(s).`);
};

const main = async () => {
  const options = parseArgs();
  const target = normalizeTarget(options.target);

  if (!target) {
    printTargetHelp('posts:delete', 'Delete all DevNotes blog posts.');
    process.exit(1);
  }

  if ((target === 'firestore' || target === 'all') && options.yes !== true) {
    console.error('');
    console.error('Refusing to delete Firestore posts without explicit confirmation.');
    console.error('Run again with --yes when you really want to remove all documents from the blogs collection.');
    console.error('');
    process.exit(1);
  }

  if (target === 'firestore' || target === 'all') {
    await deleteFirestorePosts();
  }

  if (target === 'mock' || target === 'all') {
    printMockSnippet({
      title: 'Mock browser store delete snippet',
      snippet: createMockDeleteSnippet()
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
    console.error('Deleting posts failed.');
    console.error('');
    console.error(unknownError?.message || unknownError);
    process.exit(1);
  }
}
