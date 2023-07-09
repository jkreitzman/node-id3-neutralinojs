import { isBuffer } from "../util"

function getPictureMimeTypeFromBuffer(pictureBuffer: Buffer) {
  if (
    pictureBuffer.length > 3 &&
    pictureBuffer.compare(Buffer.from([0xff, 0xd8, 0xff]), 0, 3, 0, 3) === 0
  ) {
    return "image/jpeg"
  }
  if (
    pictureBuffer.length > 8 &&
    pictureBuffer.compare(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      0,
      8,
      0,
      8
    ) === 0
  ) {
    return "image/png"
  }
  return ""
}

export function retrievePictureAndMimeType({
  filenameOrBuffer,
  mimeType,
}: {
  filenameOrBuffer?: Buffer | string
  mimeType?: string
}) {
  if (!filenameOrBuffer) {
    throw new TypeError("Missing image buffer or filename")
  }
  if (!isBuffer(filenameOrBuffer)) {
    throw new TypeError("Cannot use a filename with this function")
  }
  return {
    pictureBuffer: filenameOrBuffer,
    mimeType: mimeType ?? getPictureMimeTypeFromBuffer(filenameOrBuffer),
  }
}
