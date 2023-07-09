import { Tags, TagIdentifiers, WriteTags } from "../types/Tags"
import { Options } from "../types/Options"
import { filesystem } from "@neutralinojs/lib"
import { create, getTagsFromId3Tag, writeInBuffer } from "../id3-tag"
import { updateTags } from "../updateTags"

type Settle<T> = {
  (error: NodeJS.ErrnoException | Error, result: null): void
  (error: null, result: T): void
}

function makePromise<T>(callback: (settle: Settle<T>) => void) {
  return new Promise<T>((resolve, reject) => {
    callback((error, result) => {
      if (error) {
        reject(error)
      } else {
        // result can't be null here according the Settle callable
        // type but TS can't evaluate it properly here, so use the
        // null assertion, and then disable the lint error.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resolve(result!)
      }
    })
  })
}

/**
 * Asynchronous API for files and buffers operations using promises.
 *
 * @public
 */
export const Promises = {
  update: async (tags: WriteTags, filepath: string, options?: Options) => {
    const buffer = Buffer.from(await filesystem.readBinaryFile(filepath))
    const currentTags = getTagsFromId3Tag(buffer, options ?? {}) as Tags
    const newTags = updateTags(tags, currentTags)
    const newTagBuffer = create(newTags)
    const newBuffer = writeInBuffer(newTagBuffer, buffer)
    return filesystem.writeBinaryFile(filepath, newBuffer)
  },
  read: async (filepath: string, options?: Options) => {
    const buffer = Buffer.from(await filesystem.readBinaryFile(filepath))
    return makePromise<Tags | TagIdentifiers>((callback) =>
      callback(null, getTagsFromId3Tag(buffer, options ?? {}))
    )
  },
} as const

/**
 * Asynchronous API for files and buffers operations using promises.
 *
 * @public
 * @deprecated Consider using `Promises` instead as `Promise` creates conflict
 *             with the Javascript native promise.
 */
export { Promises as Promise }
