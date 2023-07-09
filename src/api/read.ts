import { getTagsFromId3Tag } from "../id3-tag"
import { Tags, TagIdentifiers } from "../types/Tags"
import { Options } from "../types/Options"

/**
 * Callback signature for successful asynchronous read operation.
 *
 * @param tags - `TagsIdentifiers` if the `rawOnly` option was true otherwise
 *               `Tags`
 * @public
 */
export type ReadSuccessCallback = (
  error: null,
  tags: Tags | TagIdentifiers
) => void

/**
 * Callback signatures for failing asynchronous read operation.
 *
 * @public
 */
export type ReadErrorCallback = (
  error: NodeJS.ErrnoException | Error,
  tags: null
) => void

/**
 * Callback signatures for asynchronous read operation.
 *
 * @public
 */
export type ReadCallback = ReadSuccessCallback & ReadErrorCallback

export function read(
  buffer: Buffer,
  options: Options,
  callback: ReadCallback
): Tags | TagIdentifiers | void {
  return callback(null, getTagsFromId3Tag(buffer, options))
}
