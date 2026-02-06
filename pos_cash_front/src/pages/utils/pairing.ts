// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-app/pos-auth/app/utils/pairing.ts
export function generatePairingCode(len = 6) {
  // 6 dígitos (000000–999999) con padding
  const n = Math.floor(Math.random() * 1_000_000)
  return n.toString().padStart(len, '0')
}
