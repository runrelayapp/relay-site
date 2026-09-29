import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import type { FirebaseContext } from "@/shared/firebase";
import { createSecondaryAuthUser } from "@/shared/firebase/createSecondaryAuthUser";
import {
  PLATFORM_LIFETIME_STAT_KEYS,
  incrementPlatformLifetimeStat,
} from "@/shared/firestore/platformLifetimeStats";
import {
  ADMIN_CACHE_KEYS,
  invalidateAdminCache,
  readAdminCache,
  writeAdminCache,
  type AdminCacheReadOptions,
} from "../lib/adminCache";
import { filterAdminOrganizer } from "../lib/adminTableFilter";
import { scanFirestoreCollection } from "../lib/adminScanCollection";
import type { AdminOrganizer } from "../model/types";
import {
  ADMIN_PAGE_SIZE,
  type AdminPageResult,
  toPageResult,
} from "./adminRacesRepository";

function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function mapOrganizer(id: string, data: DocumentData): AdminOrganizer {
  const authUidRaw =
    typeof data.authUid === "string" && data.authUid.trim()
      ? data.authUid.trim()
      : typeof data.userId === "string" && data.userId.trim()
      ? data.userId.trim()
      : null;

  return {
    id,
    name: typeof data.name === "string" ? data.name.trim() : "",
    email:
      typeof data.email === "string" && data.email.trim()
        ? data.email.trim().toLowerCase()
        : null,
    authUid: authUidRaw,
    userId:
      typeof data.userId === "string" && data.userId.trim()
        ? data.userId.trim()
        : authUidRaw,
    notes: typeof data.notes === "string" ? data.notes : "",
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
}

export interface UpsertAdminOrganizerInput {
  id?: string;
  name: string;
  email: string;
  userId: string;
  notes: string;
}

export interface CreateAdminOrganizerInput {
  name: string;
  email: string;
  password: string;
  notes: string;
}

async function writeOrganizerAccountIndex(
  firebaseCtx: FirebaseContext,
  authUid: string,
  organizerId: string,
  email?: string | null
): Promise<void> {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  await setDoc(doc(firebaseCtx.db, "organizerAccounts", authUid), {
    organizerId,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    updatedAt: serverTimestamp(),
  });
}

async function listAdminOrganizersUncached(
  firebaseCtx: FirebaseContext
): Promise<AdminOrganizer[]> {
  try {
    const snap = await getDocs(
      query(
        collection(firebaseCtx.db, "organizers"),
        orderBy("name", "asc"),
        limit(500)
      )
    );
    return snap.docs.map((item) => mapOrganizer(item.id, item.data()));
  } catch {
    const snap = await getDocs(collection(firebaseCtx.db, "organizers"));
    return snap.docs
      .map((item) => mapOrganizer(item.id, item.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function listAdminOrganizersPage(
  firebaseCtx: FirebaseContext,
  pageSize = ADMIN_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<AdminPageResult<AdminOrganizer>> {
  const fetchLimit = pageSize + 1;

  try {
    const organizersQuery = cursor
      ? query(
          collection(firebaseCtx.db, "organizers"),
          orderBy("name", "asc"),
          startAfter(cursor),
          limit(fetchLimit)
        )
      : query(
          collection(firebaseCtx.db, "organizers"),
          orderBy("name", "asc"),
          limit(fetchLimit)
        );
    const snap = await getDocs(organizersQuery);
    return toPageResult(snap.docs, pageSize, (item) =>
      mapOrganizer(item.id, item.data())
    );
  } catch {
    const snap = await getDocs(collection(firebaseCtx.db, "organizers"));
    const sortedDocs = [...snap.docs].sort((a, b) => {
      const nameA = mapOrganizer(a.id, a.data()).name;
      const nameB = mapOrganizer(b.id, b.data()).name;
      return nameA.localeCompare(nameB);
    });
    let startIndex = 0;
    if (cursor) {
      const index = sortedDocs.findIndex((item) => item.id === cursor.id);
      startIndex = index >= 0 ? index + 1 : 0;
    }
    const pageDocs = sortedDocs.slice(startIndex, startIndex + fetchLimit);
    return toPageResult(pageDocs, pageSize, (item) =>
      mapOrganizer(item.id, item.data())
    );
  }
}

async function searchAdminOrganizersUncached(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminOrganizer[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  const docs = await scanFirestoreCollection(firebaseCtx, "organizers");
  return docs
    .map((item) => mapOrganizer(item.id, item.data))
    .filter((item) => filterAdminOrganizer(item, q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchAdminOrganizers(
  firebaseCtx: FirebaseContext,
  rawQuery: string
): Promise<AdminOrganizer[]> {
  const q = rawQuery.trim();
  if (!q) {
    return [];
  }

  return readAdminCache(ADMIN_CACHE_KEYS.organizersSearch(q), () =>
    searchAdminOrganizersUncached(firebaseCtx, q)
  );
}

export async function listAdminOrganizers(
  firebaseCtx: FirebaseContext,
  options?: AdminCacheReadOptions
): Promise<AdminOrganizer[]> {
  return readAdminCache(
    ADMIN_CACHE_KEYS.organizersList,
    () => listAdminOrganizersUncached(firebaseCtx),
    options
  );
}

export async function fetchAdminOrganizer(
  firebaseCtx: FirebaseContext,
  organizerId: string,
  options?: AdminCacheReadOptions
): Promise<AdminOrganizer | null> {
  const id = organizerId.trim();
  if (!id) {
    return null;
  }
  return readAdminCache(
    ADMIN_CACHE_KEYS.organizer(id),
    async () => {
      const snap = await getDoc(doc(firebaseCtx.db, "organizers", id));
      if (!snap.exists()) {
        return null;
      }
      return mapOrganizer(snap.id, snap.data());
    },
    options
  );
}

export async function createAdminOrganizerWithAuth(
  firebaseCtx: FirebaseContext,
  input: CreateAdminOrganizerInput
): Promise<AdminOrganizer> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email.includes("@") || password.length < 6) {
    throw new Error("invalid_organizer");
  }

  const { uid } = await createSecondaryAuthUser(email, password);
  const ref = doc(collection(firebaseCtx.db, "organizers"));
  const payload = {
    name,
    email,
    authUid: uid,
    userId: uid,
    notes: input.notes.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  await writeOrganizerAccountIndex(firebaseCtx, uid, ref.id, email);
  await incrementPlatformLifetimeStat(
    firebaseCtx.db,
    PLATFORM_LIFETIME_STAT_KEYS.organizers
  );

  const snap = await getDoc(ref);
  const saved = mapOrganizer(snap.id, snap.data() ?? payload);
  invalidateAdminCache("organizers:");
  invalidateAdminCache("overview:");
  writeAdminCache(ADMIN_CACHE_KEYS.organizer(saved.id), saved);
  return saved;
}

export async function upsertAdminOrganizer(
  firebaseCtx: FirebaseContext,
  input: UpsertAdminOrganizerInput
): Promise<AdminOrganizer> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("invalid_organizer");
  }

  const ref = input.id?.trim()
    ? doc(firebaseCtx.db, "organizers", input.id.trim())
    : doc(collection(firebaseCtx.db, "organizers"));
  const existing = await getDoc(ref);
  const existingData = existing.exists() ? existing.data() : null;
  const authUid =
    typeof existingData?.authUid === "string" && existingData.authUid.trim()
      ? existingData.authUid.trim()
      : input.userId.trim() || null;

  const payload = {
    name,
    email: input.email.trim().toLowerCase() || null,
    userId: input.userId.trim() || authUid,
    ...(authUid ? { authUid } : {}),
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });

  if (authUid) {
    await writeOrganizerAccountIndex(firebaseCtx, authUid, ref.id, input.email);
  }

  if (!existing.exists()) {
    await incrementPlatformLifetimeStat(
      firebaseCtx.db,
      PLATFORM_LIFETIME_STAT_KEYS.organizers
    );
  }

  const snap = await getDoc(ref);
  const saved = mapOrganizer(snap.id, snap.data() ?? payload);
  invalidateAdminCache("organizers:");
  invalidateAdminCache("overview:");
  writeAdminCache(ADMIN_CACHE_KEYS.organizer(saved.id), saved);
  return saved;
}

export async function deleteAdminOrganizer(
  firebaseCtx: FirebaseContext,
  organizerId: string
): Promise<void> {
  const id = organizerId.trim();
  if (!id) {
    return;
  }

  const snap = await getDoc(doc(firebaseCtx.db, "organizers", id));
  const data = snap.exists() ? snap.data() : null;
  const authUid =
    (typeof data?.authUid === "string" && data.authUid.trim()) ||
    (typeof data?.userId === "string" && data.userId.trim()) ||
    "";

  await deleteDoc(doc(firebaseCtx.db, "organizers", id));
  if (authUid) {
    try {
      await deleteDoc(doc(firebaseCtx.db, "organizerAccounts", authUid));
    } catch {
      // index cleanup is best-effort
    }
  }
  invalidateAdminCache("organizers:");
}

const CONTINUE_URI_ERROR_CODES = new Set([
  "auth/invalid-continue-uri",
  "auth/unauthorized-continue-uri",
  "auth/missing-continue-uri",
]);

export async function sendAdminOrganizerPasswordReset(
  firebaseCtx: FirebaseContext,
  email: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("invalid_organizer_email");
  }

  const continueUrl = `${window.location.origin}/organizer/login`;

  try {
    await sendPasswordResetEmail(firebaseCtx.auth, normalized, {
      handleCodeInApp: false,
      url: continueUrl,
    });
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      CONTINUE_URI_ERROR_CODES.has(error.code)
    ) {
      await sendPasswordResetEmail(firebaseCtx.auth, normalized);
      return;
    }

    throw error;
  }
}
