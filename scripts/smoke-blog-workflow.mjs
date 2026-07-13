import { deleteApp, initializeApp } from 'firebase/app';
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  terminate,
  writeBatch
} from 'firebase/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'devnotes-local';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [firestoreHostname, firestorePort] = firestoreHost.split(':');
const smokeTags = Array.from({ length: 10 }, (_, index) => `Test-${index + 1}`);

const app = initializeApp({ apiKey: 'demo-api-key', projectId });
const adminApp = initializeAdminApp({ projectId }, `workflow-smoke-${Date.now()}`);
const adminDb = getAdminFirestore(adminApp);
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
connectFirestoreEmulator(db, firestoreHostname, Number(firestorePort));

const blogRef = doc(collection(db, 'blogs'));
const revisionRef = doc(collection(blogRef, 'revisions'));
const otherAuthorBlogRef = doc(collection(db, 'blogs'));
const otherAuthorRevisionRef = doc(collection(otherAuthorBlogRef, 'revisions'));
let removedAutosaveRef;

try {
  await signInWithEmailAndPassword(auth, 'admin@example.local', 'LocalAdmin123!');
  removedAutosaveRef = doc(db, 'users', auth.currentUser.uid, 'editorAutosaves', `removed-${Date.now()}`);
  let autosaveWriteDenied = false;
  try {
    await setDoc(removedAutosaveRef, {
      title: 'Removed autosave check',
      summary: '',
      content: '',
      tags: [],
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    autosaveWriteDenied = error?.code === 'permission-denied';
  }
  if (!autosaveWriteDenied) {
    throw new Error('Removed editor autosaves are still writable.');
  }

  await setDoc(blogRef, {
    title: 'Workflow smoke test',
    summary: 'Validates the Firestore draft and revision rules.',
    content: '## Initial version\n\nSmoke test content.',
    tags: smokeTags,
    authorName: 'Blog Admin',
    authorUsername: 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
    status: 'published',
    readTime: 1
  });

  const batch = writeBatch(db);
  batch.set(revisionRef, {
    title: 'Workflow smoke test',
    summary: 'Validates the Firestore draft and revision rules.',
    content: '## Initial version\n\nSmoke test content.',
    tags: smokeTags,
    status: 'published',
    savedAt: serverTimestamp(),
    savedBy: auth.currentUser.uid,
    savedByName: 'Blog Admin'
  });
  batch.update(blogRef, {
    title: 'Workflow smoke test',
    summary: 'Validates the Firestore draft and revision rules.',
    content: '## Updated version\n\nSmoke test content.',
    tags: smokeTags,
    authorName: 'Blog Admin',
    authorUsername: 'admin',
    readTime: 1,
    status: 'published',
    updatedAt: serverTimestamp(),
    publishedAt: (await getDoc(blogRef)).data().publishedAt
  });
  await batch.commit();

  const [blogSnapshot, revisionSnapshot] = await Promise.all([getDoc(blogRef), getDoc(revisionRef)]);
  if (!blogSnapshot.exists() || !revisionSnapshot.exists()) {
    throw new Error('Workflow smoke test did not persist both documents.');
  }

  const now = AdminTimestamp.now();
  await adminDb.collection('blogs').doc(otherAuthorBlogRef.id).set({
    title: 'Other author workflow smoke test',
    summary: 'Validates the admin path through the Firestore rules.',
    content: '## Initial version\n\nOther author content.',
    tags: smokeTags,
    authorName: 'Other Author',
    authorUsername: 'otherauthor',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    status: 'published',
    readTime: 1
  });
  const otherAuthorPublishedAt = (await getDoc(otherAuthorBlogRef)).data().publishedAt;

  const otherAuthorBatch = writeBatch(db);
  otherAuthorBatch.set(otherAuthorRevisionRef, {
    title: 'Other author workflow smoke test',
    summary: 'Validates the admin path through the Firestore rules.',
    content: '## Initial version\n\nOther author content.',
    tags: smokeTags,
    status: 'published',
    savedAt: serverTimestamp(),
    savedBy: auth.currentUser.uid,
    savedByName: 'Blog Admin'
  });
  otherAuthorBatch.update(otherAuthorBlogRef, {
    title: 'Other author workflow smoke test',
    summary: 'Validates the admin path through the Firestore rules.',
    content: '## Updated version\n\nOther author content.',
    tags: smokeTags,
    authorName: 'Other Author',
    authorUsername: 'otherauthor',
    readTime: 1,
    status: 'published',
    updatedAt: serverTimestamp(),
    publishedAt: otherAuthorPublishedAt
  });
  await otherAuthorBatch.commit();

  console.log('Blog workflow Firestore rules smoke test passed.');
} finally {
  await deleteDoc(revisionRef).catch(() => undefined);
  await deleteDoc(blogRef).catch(() => undefined);
  await deleteDoc(otherAuthorRevisionRef).catch(() => undefined);
  await adminDb.collection('blogs').doc(otherAuthorBlogRef.id).delete().catch(() => undefined);
  if (removedAutosaveRef) {
    await adminDb.doc(removedAutosaveRef.path).delete().catch(() => undefined);
  }
  await signOut(auth).catch(() => undefined);
  await terminate(db).catch(() => undefined);
  await deleteApp(app).catch(() => undefined);
  await deleteAdminApp(adminApp).catch(() => undefined);
}
