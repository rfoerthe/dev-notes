import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

// Reuse one channel to preserve its URL while it exists. Firebase deletes
// expired channels; recreating the same name produces a new domain that must
// also be registered in the reCAPTCHA Enterprise key used by App Check.
const DEFAULT_CHANNEL = 'preview';
const DEFAULT_EXPIRATION = '30d';

const printHelp = () => {
  console.log('');
  console.log('Deploy the current build to a Firebase Hosting preview channel.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run preview:deploy');
  console.log('  npm run preview:deploy -- <channel>');
  console.log('  npm run preview:deploy -- <channel> --expires 3d');
  console.log('');
  console.log('Arguments:');
  console.log(`  <channel>              Channel name. Defaults to PREVIEW_CHANNEL, else`);
  console.log(`                         "${DEFAULT_CHANNEL}". Firebase replaces / : _ # with -.`);
  console.log('');
  console.log('Every channel gets its own preview domain, which has to be registered in');
  console.log('the reCAPTCHA Enterprise key, otherwise App Check blocks all Firestore');
  console.log('reads there. The URL changes if the channel expires and is recreated.');
  console.log('Redeploy before expiration to preserve its URL; pass a');
  console.log('branch name (e.g. `git branch --show-current`) only when you need a second');
  console.log('preview in parallel.');
  console.log('');
  console.log('Any further options are passed through to');
  console.log('`firebase hosting:channel:deploy`, e.g. --expires <duration> (max 30d,');
  console.log(`defaults here to ${DEFAULT_EXPIRATION}) or --only <target>.`);
  console.log('');
  console.log('The project id is resolved by scripts/firebase-cli-project.mjs from');
  console.log('FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID (also read from .env).');
  console.log('');
};

const main = () => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  // The first argument is the channel name unless it is already an option.
  const hasExplicitChannel = argv.length > 0 && !argv[0].startsWith('-');
  const passthrough = hasExplicitChannel ? argv.slice(1) : argv;
  const channel =
    (hasExplicitChannel ? argv[0] : process.env.PREVIEW_CHANNEL)?.trim() || DEFAULT_CHANNEL;
  const hasExpiration = passthrough.some((arg) =>
    arg === '--expires' || arg.startsWith('--expires=') ||
    arg === '-e' || arg.startsWith('-e=')
  );

  const args = [
    resolve(scriptDir, 'firebase-cli-project.mjs'),
    'hosting:channel:deploy',
    channel,
    ...(hasExpiration ? [] : ['--expires', DEFAULT_EXPIRATION]),
    ...passthrough
  ];

  console.log(`Deploying preview channel: ${channel}`);

  const child = spawn(process.execPath, args, { stdio: 'inherit' });

  child.on('error', (error) => {
    console.error(`Failed to start the preview deploy: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
};

main();
