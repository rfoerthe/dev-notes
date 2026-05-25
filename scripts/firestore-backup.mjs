import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { exitWithKnownSetupError, getProjectId, initializeAdminApp } from './firebase-admin-utils.mjs';
import {
  collectFirestoreDocuments,
  createBackupFileName,
  FirestoreBackupInputError,
  parseArgs,
  printInputError
} from './firestore-backup-utils.mjs';

const printHelp = () => {
  console.log('');
  console.log('Create a local JSON backup of the complete Firestore database.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run firestore:backup');
  console.log('  npm run firestore:backup -- --output backups/my-backup.json');
  console.log('');
  console.log('Options:');
  console.log('  -o, --output <file>  Backup file path. Defaults to backups/firestore-backup-<timestamp>.json');
  console.log('  --compact           Write compact JSON instead of pretty-printed JSON');
  console.log('  -h, --help          Show this help');
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  initializeAdminApp();

  const db = getFirestore();
  const projectId = getProjectId();
  const outputPath = resolve(process.cwd(), options.output || `backups/${createBackupFileName()}`);
  const outputDirectory = dirname(outputPath);

  if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true });
  }

  const documents = await collectFirestoreDocuments(db);
  const existingDocuments = documents.filter((document) => document.exists).length;
  const missingAncestorDocuments = documents.length - existingDocuments;
  const backup = {
    kind: 'dev-notes.firestore-backup',
    version: 1,
    projectId,
    createdAt: new Date().toISOString(),
    documentCount: existingDocuments,
    missingAncestorDocumentCount: missingAncestorDocuments,
    documents
  };

  const json = options.pretty === false
    ? JSON.stringify(backup)
    : `${JSON.stringify(backup, null, 2)}\n`;

  writeFileSync(outputPath, json, 'utf8');

  console.log('');
  console.log('Firestore backup completed.');
  console.log(`Project: ${projectId || 'unknown'}`);
  console.log(`Documents: ${existingDocuments}`);
  if (missingAncestorDocuments > 0) {
    console.log(`Missing ancestor placeholders: ${missingAncestorDocuments}`);
  }
  console.log(`File: ${outputPath}`);
};

try {
  await main();
} catch (error) {
  if (error instanceof FirestoreBackupInputError) {
    printInputError('Firestore backup cannot start.', error);
    process.exit(1);
  }

  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    console.error('');
    console.error('Firestore backup failed.');
    console.error('');
    console.error(unknownError?.message || unknownError);
    process.exit(1);
  }
}
