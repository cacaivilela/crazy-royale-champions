// Random determinístico (mulberry32) — facilita reproduzir partidas em teste.
export function makeRng (seed = 1337) {
  let a = seed >>> 0
  return function rng () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const rand = makeRng(Date.now() % 100000)
export const pick = (arr, r = rand) => arr[Math.floor(r() * arr.length) % arr.length]
export const range = (min, max, r = rand) => min + r() * (max - min)
export const clamp = (v, a, b) => v < a ? a : (v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
