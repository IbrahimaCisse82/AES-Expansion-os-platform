// Génère un identifiant de connexion temporaire (invitation, réinitialisation).
// Source cryptographique (crypto.getRandomValues), jamais Math.random.
// Garantit au moins une minuscule, une majuscule, un chiffre et un symbole
// pour satisfaire les politiques de complexité de Supabase Auth.

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%*-_'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function pick(chars: string, byte: number): string {
  return chars[byte % chars.length]
}

export function generateTemporaryCredential(length = 20): string {
  const bytes = new Uint8Array(length + 4)
  crypto.getRandomValues(bytes)
  const out = [
    pick(LOWER, bytes[0]),
    pick(UPPER, bytes[1]),
    pick(DIGITS, bytes[2]),
    pick(SYMBOLS, bytes[3]),
  ]
  for (let i = 4; i < length; i++) out.push(pick(ALL, bytes[i]))
  // mélange (Fisher-Yates) avec les octets restants
  for (let i = out.length - 1; i > 0; i--) {
    const j = bytes[(i % 4) + length] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}
