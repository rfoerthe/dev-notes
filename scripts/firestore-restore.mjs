import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { exitWithKnownSetupError, getProjectId, initializeAdminApp } from './firebase-admin-utils.mjs';
import {
  deleteAllFirestoreDocuments,
  FirestoreBackupInputError,
  parseArgs,
  printInputError,
  validateBackup,
  writeDocumentsInBatches
} from './firestore-backup-utils.mjs';

const printHelp = () => {
  console.log('');
  console.log('Restore documents from a DevNotes Firestore JSON backup.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run firestore:restore -- --input backups/firestore-backup-2026-05-25T12-00-00-000Z.json --yes');
  console.log('  npm run firestore:restore -- backups/firestore-backup-2026-05-25T12-00-00-000Z.json --yes');
  console.log('  npm run firestore:restore -- --latest --yes');
  console.log('');
  console.log('Options:');
  console.log('  -i, --input <file>      Backup file path');
  console.log('  --latest               Use the newest backups/firestore-backup-*.json file');
  console.log('  --delete-existing      Delete all existing Firestore documents before restoring');
  console.log('  --dry-run              Validate and count actions without writing');
  console.log('  -y, --yes              Confirm writes or deletes');
  console.log('  -h, --help             Show this help');
};

const findLatestBackupPath = () => {
  const backupDirectory = resolve(process.cwd(), 'backups');

  if (!existsSync(backupDirectory)) {
    throw new FirestoreBackupInputError('Cannot find backups directory.', [
      'Create a backup first with npm run firestore:backup, or pass --input <file>.'
    ]);
  }

  const backupFiles = readdirSync(backupDirectory)
    .filter((fileName) => /^firestore-backup-.*\.json$/.test(fileName))
    .sort();

  const latestFile = backupFiles.at(-1);
  if (!latestFile) {
    throw new FirestoreBackupInputError('No Firestore backup files found in backups/.', [
      'Create a backup first with npm run firestore:backup, or pass --input <file>.'
    ]);
  }

  return resolve(backupDirectory, latestFile);
};

const resolveInputPath = (options) => {
  if (options.latest) {
    return findLatestBackupPath();
  }

  const input = options.input || options._[0];
  if (!input) {
    throw new FirestoreBackupInputError('Missing backup file path.', [
      'Pass --input <file>, a positional file path, or --latest.'
    ]);
  }

  return resolve(process.cwd(), input);
};

const readBackup = (inputPath) => {
  if (!existsSync(inputPath)) {
    throw new FirestoreBackupInputError(`Backup file does not exist: ${inputPath}`);
  }

  try {
    const backup = JSON.parse(readFileSync(inputPath, 'utf8'));
    validateBackup(backup);
    return backup;
  } catch (error) {
    if (error instanceof FirestoreBackupInputError) {
      throw error;
    }

    throw new FirestoreBackupInputError(`Cannot read backup JSON: ${error.message}`);
  }
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const inputPath = resolveInputPath(options);
  const backup = readBackup(inputPath);

  if (!options.dryRun && options.yes !== true) {
    throw new FirestoreBackupInputError('Refusing to write to Firestore without explicit confirmation.', [
      'Run again with --yes when you really want to restore this backup.',
      'Use --dry-run to validate the backup without writing.'
    ]);
  }

  initializeAdminApp();

  const db = getFirestore();
  const projectId = getProjectId();
  const restorableDocuments = backup.documents.filter((document) => document.exists);

  console.log('');
  console.log(options.dryRun ? 'Firestore restore dry run.' : 'Firestore restore starting.');
  console.log(`Current project: ${projectId || 'unknown'}`);
  console.log(`Backup project: ${backup.projectId || 'unknown'}`);
  console.log(`Backup file: ${inputPath}`);
  console.log(`Documents in backup: ${restorableDocuments.length}`);

  if (backup.projectId && projectId && backup.projectId !== projectId) {
    console.log('');
    console.log('Warning: the backup project differs from the current Firebase project.');
  }

  let deletedCount = 0;
  if (options.deleteExisting) {
    deletedCount = await deleteAllFirestoreDocuments({ db, dryRun: options.dryRun });
  }

  const writtenCount = await writeDocumentsInBatches({
    db,
    documents: backup.documents,
    dryRun: options.dryRun
  });

  console.log('');
  console.log(options.dryRun ? 'Firestore restore dry run completed.' : 'Firestore restore completed.');
  if (options.deleteExisting) {
    console.log(`${options.dryRun ? 'Would delete' : 'Deleted'} existing documents: ${deletedCount}`);
  }
  console.log(`${options.dryRun ? 'Would write' : 'Written'} documents: ${writtenCount}`);
  console.log(`Source: ${basename(inputPath)}`);
};

try {
  await main();
} catch (error) {
  if (error instanceof FirestoreBackupInputError) {
    printInputError('Firestore restore cannot start.', error);
    process.exit(1);
  }

  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    console.error('');
    console.error('Firestore restore failed.');
    console.error('');
    console.error(unknownError?.message || unknownError);
    process.exit(1);
  }
}
