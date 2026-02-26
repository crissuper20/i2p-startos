import { createHash } from 'crypto'
import { ed25519 } from '@noble/curves/ed25519'
import { bytesToNumberLE } from '@noble/curves/utils'
import { base32 } from 'rfc4648'

const SECRET_KEY_HEADER = Buffer.from('== ed25519v1-secret: type0 ==\0\0\0')

function deriveOnionHostname(pubBytes: Uint8Array): string {
  const version = Buffer.from([0x03])
  const checksum = createHash('sha3-256')
    .update(Buffer.concat([Buffer.from('.onion checksum'), pubBytes, version]))
    .digest()
    .subarray(0, 2)
  return (
    base32
      .stringify(Buffer.concat([pubBytes, checksum, version]), { pad: false })
      .toLowerCase() + '.onion'
  )
}

export function generateOnionFiles(privateKeyBase64?: string | null): {
  secretKey: Buffer
  hostname: string
} {
  if (privateKeyBase64) {
    // User-provided key: 64-byte expanded key (no header)
    const expanded = Buffer.from(privateKeyBase64, 'base64')
    const scalar = expanded.subarray(0, 32)
    const pubBytes = ed25519.Point.BASE.multiply(
      bytesToNumberLE(scalar),
    ).toBytes()
    const secretKey = Buffer.concat([SECRET_KEY_HEADER, expanded])
    return { secretKey, hostname: deriveOnionHostname(pubBytes) }
  }

  // Auto-generate: use library for seed generation and key expansion
  const seed = ed25519.utils.randomSecretKey()
  const { head, prefix, pointBytes } = ed25519.utils.getExtendedPublicKey(seed)

  const secretKey = Buffer.concat([SECRET_KEY_HEADER, head, prefix])
  return { secretKey, hostname: deriveOnionHostname(pointBytes) }
}
