import * as fs from 'fs'
import * as ID3Util from './src/ID3Util'
import * as TagsHelpers from './src/TagsHelpers'
import { isFunction, isString } from './src/util'
import { Tags, RawTags, WriteTags } from './src/types/Tags'
import { Options } from './src/types/Options'
import { updateTags } from './src/updateTags'
import { create } from "./src/api/create"
import { read, ReadCallback } from "./src/api/read"
import { removeTags } from "./src/api/remove"

export { Tags, RawTags, WriteTags } from "./src/types/Tags"
export { Options } from "./src/types/Options"
export { TagConstants } from './src/definitions/TagConstants'

// Used specification: http://id3.org/id3v2.3.0

export { create } from "./src/api/create"

export type WriteCallback = {
    (error: null, data: Buffer): void
    (error: NodeJS.ErrnoException | Error, data: null): void
}

export type ReadCallback = {
    (error: NodeJS.ErrnoException | Error, tags: null): void
    (error: null, tags: Tags | RawTags): void
}

export { read, ReadCallback } from "./src/api/read"
export {
    removeTags,
    removeTagsFromBuffer,
    RemoveCallback
} from "./src/api/remove"

export type CreateCallback =
    (data: Buffer) => void

function writeInBuffer(tags: Buffer, buffer: Buffer) {
    buffer = removeTagsFromBuffer(buffer) || buffer
    return Buffer.concat([tags, buffer])
}

function writeAsync(tags: Buffer, filepath: string, callback: WriteCallback) {
    fs.readFile(filepath, (error, data) => {
        if(error) {
            callback(error, null)
            return
        }
        const newData = writeInBuffer(tags, data)
        fs.writeFile(filepath, newData, 'binary', (error) => {
            if (error) {
                callback(error, null)
            } else {
                callback(null, newData)
            }
        })
    })
}

function writeSync(tags: Buffer, filepath: string) {
    try {
        const data = fs.readFileSync(filepath)
        const newData = writeInBuffer(tags, data)
        fs.writeFileSync(filepath, newData, 'binary')
        return true
    } catch(error) {
        return error as Error
    }
}

/**
 * Write passed tags to a file/buffer
 */
export function write(tags: WriteTags, buffer: Buffer): Buffer
export function write(tags: WriteTags, filepath: string): true | Error
export function write(
    tags: WriteTags, filebuffer: string | Buffer, callback: WriteCallback
): void
export function write(
    tags: WriteTags,
    filebuffer: string | Buffer,
    callback?: WriteCallback
): Buffer | true | Error | void {
    const tagsBuffer = create(tags)

    if(isFunction(callback)) {
        if (isString(filebuffer)) {
            return writeAsync(tagsBuffer, filebuffer, callback)
        }
        return callback(null, writeInBuffer(tagsBuffer, filebuffer))
    }
    if(isString(filebuffer)) {
        return writeSync(tagsBuffer, filebuffer)
    }
    return writeInBuffer(tagsBuffer, filebuffer)
}

function readSync(filebuffer: string | Buffer, options: Options) {
    if(isString(filebuffer)) {
        filebuffer = fs.readFileSync(filebuffer)
    }
    return TagsHelpers.getTagsFromBuffer(filebuffer, options)
}

function readAsync(
    filebuffer: string | Buffer,
    options: Options,
    callback: ReadCallback
) {
    if(isString(filebuffer)) {
        fs.readFile(filebuffer, (error, data) => {
            if(error) {
                callback(error, null)
            } else {
                callback(null, TagsHelpers.getTagsFromBuffer(data, options))
            }
        })
    } else {
        callback(null, TagsHelpers.getTagsFromBuffer(filebuffer, options))
    }
}

/**
 * Read ID3-Tags from passed buffer/filepath
 */
export function read(filebuffer: string | Buffer, options?: Options): Tags
export function read(filebuffer: string | Buffer, callback: ReadCallback): void
export function read(
    filebuffer: string | Buffer, options: Options, callback: ReadCallback
): void
export function read(
    filebuffer: string | Buffer,
    optionsOrCallback?: Options | ReadCallback,
    callback?: ReadCallback
): Tags | RawTags | void {
    const options: Options =
        (isFunction(optionsOrCallback) ? {} : optionsOrCallback) ?? {}
    callback =
        isFunction(optionsOrCallback) ? optionsOrCallback : callback

    if(isFunction(callback)) {
        return readAsync(filebuffer, options, callback)
    }
    return readSync(filebuffer, options)
}

/**
 * Update ID3-Tags from passed buffer/filepath
 */
export function update(
    tags: WriteTags,
    buffer: Buffer,
    options?: Options
): Buffer
export function update(
    tags: WriteTags,
    filepath: string,
    options?: Options
): true | Error
export function update(
    tags: WriteTags,
    filebuffer: string | Buffer,
    callback: WriteCallback
): void
export function update(
    tags: WriteTags,
    filebuffer: string | Buffer,
    options: Options,
    callback: WriteCallback
): void
export function update(
    tags: WriteTags,
    filebuffer: string | Buffer,
    optionsOrCallback?: Options | WriteCallback,
    callback?: WriteCallback
): Buffer | true | Error | void {
    const options: Options =
        (isFunction(optionsOrCallback) ? {} : optionsOrCallback) ?? {}
    callback =
        isFunction(optionsOrCallback) ? optionsOrCallback : callback

    const currentTags = read(filebuffer, options)
    const updatedTags = updateTags(tags, currentTags)
    if (isFunction(callback)) {
        return write(updatedTags, filebuffer, callback)
    }
    if (isString(filebuffer)) {
        return write(updatedTags, filebuffer)
    }
    return write(updatedTags, filebuffer)
}

type Settle<T> = {
    (error: NodeJS.ErrnoException | Error, result: null): void
    (error: null, result: T): void
}

function makePromise<T>(callback: (settle: Settle<T>) => void) {
    return new Promise<T>((resolve, reject) => {
        callback((error, result) => {
            if(error) {
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

export const Promises = {
    create: (tags: Tags) =>
        makePromise((settle: Settle<Buffer>) =>
            create(tags, result => settle(null, result)),
    ),
    write: (tags: Tags, filebuffer: string | Buffer) =>
        makePromise<Buffer>((callback: WriteCallback) =>
            write(tags, filebuffer, callback)
        ),
    update: (tags: Tags, filebuffer: string | Buffer, options?: Options) =>
        makePromise<Buffer>((callback: WriteCallback) =>
            update(tags, filebuffer, options ?? {}, callback)
        ),
    read: (file: string, options?: Options) =>
        makePromise((callback: ReadCallback) =>
            read(file, options ?? {}, callback)
        ),
    removeTags: (filepath: string) =>
        makePromise((settle: Settle<void>) =>
            removeTags(
                filepath,
                (error) => error ? settle(error, null) : settle(null)
            )
        )
} as const

/**
 * @deprecated consider using `Promises` instead, `Promise` creates conflict
 *             with the Javascript native promise.
 */
export { Promises as Promise }
