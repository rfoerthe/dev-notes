import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AppSettings {
  closedUserGroupEnabled: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  closedUserGroupEnabled: false
};

const APP_SETTINGS_COLLECTION = 'appSettings';
const APP_SETTINGS_DOCUMENT_ID = 'public';

const appSettingsRef = () => doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOCUMENT_ID);

function normalizeAppSettings(data: Record<string, unknown> | undefined): AppSettings {
  return {
    closedUserGroupEnabled: data?.closedUserGroupEnabled === true
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const snapshot = await getDoc(appSettingsRef());
  return snapshot.exists()
    ? normalizeAppSettings(snapshot.data())
    : DEFAULT_APP_SETTINGS;
}

export async function updateClosedUserGroupEnabled(enabled: boolean): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Du musst angemeldet sein, um Anwendungseinstellungen zu ändern.');
  }

  await setDoc(
    appSettingsRef(),
    {
      closedUserGroupEnabled: enabled,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    },
    { merge: true }
  );
}
