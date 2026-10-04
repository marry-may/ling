import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

type CollectionName = 'books' | 'words'
type CollectionKey = string

interface LingDatabase extends DBSchema {
  books: { key: CollectionKey; value: unknown }
  words: { key: CollectionKey; value: unknown }
}

let databasePromise: Promise<IDBPDatabase<LingDatabase>> | undefined

function getDatabase() {
  databasePromise ??= openDB<LingDatabase>('ling-library', 1, {
    upgrade(database) {
      database.createObjectStore('books')
      database.createObjectStore('words')
    },
  })
  return databasePromise
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
  const database = await getDatabase()
  const existing = await database.get(name, collectionKey)
  if (existing !== undefined) return existing as T

  const legacy = legacyKey ? readLegacyValue<T>(legacyKey) : undefined
  const value = legacy ?? fallback
  await database.put(name, value, collectionKey)
  if (legacy !== undefined) localStorage.removeItem(legacyKey)
  return value
}

export async function saveCollection<T>(name: CollectionName, collectionKey: CollectionKey, value: T): Promise<void> {
  const database = await getDatabase()
  await database.put(name, value, collectionKey)
}
