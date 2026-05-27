import { DocumentReference, GeoPoint, Timestamp } from 'firebase-admin/firestore';

const TYPE_KEY = '__devNotesFirestoreType';
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,29}$/;

export class FirestoreBackupInputError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'FirestoreBackupInputError';
    this.details = details;
  }
}

export const parseArgs = (argv = process.argv.slice(2)) => {
  const options = {
    _: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }

    if (arg === '--latest') {
      options.latest = true;
      continue;
    }

    if (arg === '--delete-existing') {
      options.deleteExisting = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--pretty') {
      options.pretty = true;
      continue;
    }

    if (arg === '--compact') {
      options.pretty = false;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
      continue;
    }

    if (arg === '--input' || arg === '-i') {
      options.input = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--input=')) {
      options.input = arg.slice('--input='.length);
      continue;
    }

    if (arg.startsWith('-')) {
      throw new FirestoreBackupInputError(`Unknown option: ${arg}`);
    }

    options._.push(arg);
  }

  return options;
};

export const createBackupFileName = (date = new Date()) => {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  return `firestore-backup-${stamp}.json`;
};

export const serializeFirestoreValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Timestamp) {
    return {
      [TYPE_KEY]: 'timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds
    };
  }

  if (value instanceof GeoPoint) {
    return {
      [TYPE_KEY]: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude
    };
  }

  if (value instanceof DocumentReference) {
    return {
      [TYPE_KEY]: 'reference',
      path: value.path
    };
  }

  if (Buffer.isBuffer(value)) {
    return {
      [TYPE_KEY]: 'buffer',
      base64: value.toString('base64')
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeFirestoreValue(entryValue)])
    );
  }

  return value;
};

export const deserializeFirestoreValue = (db, value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deserializeFirestoreValue(db, entry));
  }

  if (typeof value === 'object') {
    const marker = value[TYPE_KEY];

    if (marker === 'timestamp') {
      return new Timestamp(value.seconds, value.nanoseconds);
    }

    if (marker === 'geopoint') {
      return new GeoPoint(value.latitude, value.longitude);
    }

    if (marker === 'reference') {
      return db.doc(value.path);
    }

    if (marker === 'buffer') {
      return Buffer.from(value.base64, 'base64');
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, deserializeFirestoreValue(db, entryValue)])
    );
  }

  return value;
};

export const collectFirestoreDocuments = async (db) => {
  const documents = [];
  const rootCollections = await db.listCollections();
  const sortedRootCollections = rootCollections.sort((left, right) => left.path.localeCompare(right.path));

  for (const collectionRef of sortedRootCollections) {
    await collectCollectionDocuments(collectionRef, documents);
  }

  return documents;
};

const collectCollectionDocuments = async (collectionRef, documents) => {
  const documentRefs = await collectionRef.listDocuments();
  const sortedDocumentRefs = documentRefs.sort((left, right) => left.path.localeCompare(right.path));

  for (const documentRef of sortedDocumentRefs) {
    const snapshot = await documentRef.get();
    documents.push({
      path: documentRef.path,
      exists: snapshot.exists,
      data: snapshot.exists ? serializeFirestoreValue(snapshot.data()) : null
    });

    const subcollections = await documentRef.listCollections();
    const sortedSubcollections = subcollections.sort((left, right) => left.path.localeCompare(right.path));

    for (const subcollectionRef of sortedSubcollections) {
      await collectCollectionDocuments(subcollectionRef, documents);
    }
  }
};

export const writeDocumentsInBatches = async ({ db, documents, dryRun = false }) => {
  let writtenCount = 0;
  let batch = db.batch();
  let operationCount = 0;

  const commit = async () => {
    if (operationCount === 0) return;
    if (!dryRun) {
      await batch.commit();
    }
    batch = db.batch();
    operationCount = 0;
  };

  for (const document of documents) {
    if (!document.exists) continue;

    batch.set(db.doc(document.path), deserializeFirestoreValue(db, document.data));
    operationCount += 1;
    writtenCount += 1;

    if (operationCount >= 450) {
      await commit();
    }
  }

  await commit();

  return writtenCount;
};

const isRestorableDocument = (document, collectionName) => {
  const pathSegments = typeof document.path === 'string' ? document.path.split('/') : [];

  return document.exists &&
    pathSegments.length === 2 &&
    pathSegments[0] === collectionName &&
    document.data &&
    typeof document.data === 'object' &&
    !Array.isArray(document.data);
};

const normalizeRestoredUsername = (value) => {
  if (typeof value !== 'string') return null;

  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
};

const getFullName = (data) => {
  const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
  const lastName = typeof data.lastName === 'string' ? data.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || null;
};

const addUniqueMapping = (map, key, value) => {
  if (!key || !value) return;

  if (!map.has(key)) {
    map.set(key, value);
    return;
  }

  if (map.get(key) !== value) {
    map.set(key, null);
  }
};

const createUserLookup = (documents) => {
  const usernameByUid = new Map();
  const usernameByFullName = new Map();
  const adminUsernames = new Set();

  for (const document of documents) {
    if (!isRestorableDocument(document, 'users')) continue;

    const username = normalizeRestoredUsername(document.data.username);
    if (!username) continue;

    const pathUid = document.path.split('/')[1];
    const dataUid = typeof document.data.uid === 'string' ? document.data.uid : null;
    addUniqueMapping(usernameByUid, pathUid, username);
    addUniqueMapping(usernameByUid, dataUid, username);
    addUniqueMapping(usernameByFullName, getFullName(document.data), username);

    if (document.data.role === 'admin') {
      adminUsernames.add(username);
    }
  }

  return {
    usernameByUid,
    usernameByFullName,
    singleAdminUsername: adminUsernames.size === 1 ? [...adminUsernames][0] : null
  };
};

const inferBlogAuthorUsername = (data, userLookup) => {
  const authorId = typeof data.authorId === 'string' ? data.authorId : null;
  const authorName = typeof data.authorName === 'string' ? data.authorName.trim() : null;

  if (authorId) {
    const username = userLookup.usernameByUid.get(authorId);
    if (username) {
      return { username, reason: 'authorId' };
    }
  }

  if (authorName) {
    const username = userLookup.usernameByFullName.get(authorName);
    if (username) {
      return { username, reason: 'authorName' };
    }
  }

  if (authorId === 'admin-uid' && userLookup.singleAdminUsername) {
    return { username: userLookup.singleAdminUsername, reason: 'legacy admin authorId' };
  }

  return null;
};

export const prepareDocumentsForRestore = (documents) => {
  const userLookup = createUserLookup(documents);
  const report = {
    addedBlogAuthorUsernames: 0,
    inferredFromAuthorId: 0,
    inferredFromAuthorName: 0,
    inferredFromLegacyAdminAuthorId: 0
  };
  const unresolvedBlogPaths = [];

  const preparedDocuments = documents.map((document) => {
    if (!isRestorableDocument(document, 'blogs')) {
      return document;
    }

    const existingUsername = normalizeRestoredUsername(document.data.authorUsername);
    if (existingUsername) {
      return existingUsername === document.data.authorUsername
        ? document
        : { ...document, data: { ...document.data, authorUsername: existingUsername } };
    }

    const inferred = inferBlogAuthorUsername(document.data, userLookup);
    if (!inferred) {
      unresolvedBlogPaths.push(document.path);
      return document;
    }

    report.addedBlogAuthorUsernames += 1;
    if (inferred.reason === 'authorId') {
      report.inferredFromAuthorId += 1;
    } else if (inferred.reason === 'authorName') {
      report.inferredFromAuthorName += 1;
    } else if (inferred.reason === 'legacy admin authorId') {
      report.inferredFromLegacyAdminAuthorId += 1;
    }

    return {
      ...document,
      data: {
        ...document.data,
        authorUsername: inferred.username
      }
    };
  });

  if (unresolvedBlogPaths.length > 0) {
    throw new FirestoreBackupInputError(
      'Backup contains blog posts without a restorable authorUsername.',
      [
        'The current app uses authorUsername for blog ownership and author filtering.',
        'Create a newer backup, or add authorUsername to the listed blog documents before restoring.',
        `Affected blog documents: ${unresolvedBlogPaths.slice(0, 10).join(', ')}${unresolvedBlogPaths.length > 10 ? ', ...' : ''}`
      ]
    );
  }

  return {
    documents: preparedDocuments,
    report
  };
};

export const deleteAllFirestoreDocuments = async ({ db, dryRun = false }) => {
  let deletedCount = 0;
  const rootCollections = await db.listCollections();
  const sortedRootCollections = rootCollections.sort((left, right) => left.path.localeCompare(right.path));

  for (const collectionRef of sortedRootCollections) {
    deletedCount += await deleteCollectionDocuments({ db, collectionRef, dryRun });
  }

  return deletedCount;
};

const deleteCollectionDocuments = async ({ db, collectionRef, dryRun }) => {
  let deletedCount = 0;
  const documentRefs = await collectionRef.listDocuments();
  const sortedDocumentRefs = documentRefs.sort((left, right) => left.path.localeCompare(right.path));

  for (const documentRef of sortedDocumentRefs) {
    deletedCount += await deleteDocumentTree({ db, documentRef, dryRun });
  }

  return deletedCount;
};

const deleteDocumentTree = async ({ db, documentRef, dryRun }) => {
  let deletedCount = 0;
  const subcollections = await documentRef.listCollections();
  const sortedSubcollections = subcollections.sort((left, right) => left.path.localeCompare(right.path));

  for (const subcollectionRef of sortedSubcollections) {
    deletedCount += await deleteCollectionDocuments({ db, collectionRef: subcollectionRef, dryRun });
  }

  const snapshot = await documentRef.get();
  if (snapshot.exists) {
    if (!dryRun) {
      await db.recursiveDelete(documentRef);
    }
    deletedCount += 1;
  }

  return deletedCount;
};

export const validateBackup = (backup) => {
  if (!backup || typeof backup !== 'object') {
    throw new FirestoreBackupInputError('Backup file does not contain a JSON object.');
  }

  if (backup.kind !== 'dev-notes.firestore-backup') {
    throw new FirestoreBackupInputError('Backup file is not a DevNotes Firestore backup.');
  }

  if (backup.version !== 1) {
    throw new FirestoreBackupInputError(`Unsupported backup version: ${backup.version}`);
  }

  if (!Array.isArray(backup.documents)) {
    throw new FirestoreBackupInputError('Backup file is missing a documents array.');
  }

  for (const [index, document] of backup.documents.entries()) {
    if (!document || typeof document !== 'object') {
      throw new FirestoreBackupInputError(`Document entry ${index} is not an object.`);
    }

    if (typeof document.path !== 'string' || !document.path.includes('/')) {
      throw new FirestoreBackupInputError(`Document entry ${index} has an invalid path.`);
    }

    if (typeof document.exists !== 'boolean') {
      throw new FirestoreBackupInputError(`Document entry ${index} has an invalid exists flag.`);
    }
  }
};

export const printInputError = (title, error) => {
  console.error('');
  console.error(title);
  console.error('');
  console.error(error.message);

  if (error.details?.length) {
    console.error('');
    for (const detail of error.details) {
      console.error(`- ${detail}`);
    }
  }
};
