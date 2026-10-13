import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

type CollectionName = 'books' | 'words'
type CollectionKey = string

interface LingDatabase extends DBSchema {
  books: { key: CollectionKey; value: unknown }
  words: { key: CollectionKey; value: unknown }
}

let databasePromise: Promise<IDBPDatabase<LingDatabase>> | undefined

/**
 * The open connection, reopened when the browser has closed it: Safari and Chrome close connections of pages left
 * in the background, when site data is cleared or under storage pressure, and a newer version of the app in another
 * tab asks this one to let go.
 */
function getDatabase() {
  if (!databasePromise) {
    const opening = openDB<LingDatabase>('ling-library', 1, {
      upgrade(database) {
        database.createObjectStore('books')
        database.createObjectStore('words')
      },
      blocking() {
        void opening.then((database) => database.close())
        forget(opening)
      },
      terminated() {
        forget(opening)
      },
    })
    opening.catch(() => forget(opening))
    databasePromise = opening
  }
  return databasePromise
}

function forget(opening: Promise<IDBPDatabase<LingDatabase>>) {
  if (databasePromise === opening) databasePromise = undefined
}

/** A closed connection only shows when it is used ("The database connection is closing"). */
function isClosedConnection(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'InvalidStateError'
}

/** Runs a database operation, once more on a fresh connection if the current one turned out to be closed. */
async function withDatabase<T>(operation: (database: IDBPDatabase<LingDatabase>) => Promise<T>): Promise<T> {
  const opening = getDatabase()
  try {
    return await operation(await opening)
  } catch (error) {
    if (!isClosedConnection(error)) throw error
    forget(opening)
    return operation(await getDatabase())
  }
}

function readLegacyValue<T>(key: string): T | undefined {
  try {
    const serialized = localStorage.getItem(key)
    return serialized === null ? undefined : JSON.parse(serialized) as T
  } catch {
    return undefined
  }
}

export async function loadCollection<T>(name: CollectionName, collectionKey: CollectionKey, legacyKey: string, fallback: T): Promise<T> {
  const existing = await withDatabase((database) => database.get(name, collectionKey))
  if (existing !== undefined) return existing as T

  const legacy = legacyKey ? readLegacyValue<T>(legacyKey) : undefined
  const value = legacy ?? fallback
  await withDatabase((database) => database.put(name, value, collectionKey))
  if (legacy !== undefined) localStorage.removeItem(legacyKey)
  return value
}

export async function saveCollection<T>(name: CollectionName, collectionKey: CollectionKey, value: T): Promise<void> {
  await withDatabase((database) => database.put(name, value, collectionKey))
}
