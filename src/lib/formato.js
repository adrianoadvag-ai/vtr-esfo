// Datas, números e frações no padrão do relatório.

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// Data local no formato AAAA-MM-DD (fuso do aparelho)
export function hojeISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function partes(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return { a, m, d }
}

// "20 out. 2026"
export function dataExtensa(iso) {
  const { a, m, d } = partes(iso)
  return `${d} ${MESES[m - 1]} ${a}`
}

// "Quarta, 21 out."
export function dataCurta(iso) {
  const { a, m, d } = partes(iso)
  const dia = new Date(a, m - 1, d).getDay()
  return `${DIAS[dia]}, ${d} ${MESES[m - 1]}`
}

// "03/08/26"
export function dataBR(iso) {
  if (!iso) return ''
  const { a, m, d } = partes(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(a).slice(2)}`
}

export function diasAte(iso, de = hojeISO()) {
  if (!iso) return null
  const t = (s) => {
    const { a, m, d } = partes(s)
    return Date.UTC(a, m - 1, d)
  }
  return Math.round((t(iso) - t(de)) / 864e5)
}

// 29670 -> "29.670"
export function km(n) {
  if (n === null || n === undefined || n === '') return ''
  return Number(n).toLocaleString('pt-BR')
}

// Oitavos -> fração simplificada do marcador
export function fracao(oitavos) {
  if (oitavos === null || oitavos === undefined) return ''
  if (oitavos === 0) return 'Reserva'
  if (oitavos === 8) return 'Cheio'
  const mdc = (a, b) => (b ? mdc(b, a % b) : a)
  const g = mdc(oitavos, 8)
  return `${oitavos / g}/${8 / g}`
}

export function combustivelTexto(oitavos) {
  const f = fracao(oitavos)
  if (!f) return ''
  if (f === 'Reserva') return 'Reserva'
  if (f === 'Cheio') return 'Tanque cheio'
  return `${f} de tanque`
}

export function saudacao(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Bom dia!'
  if (h < 18) return 'Boa tarde!'
  return 'Boa noite!'
}

export function horaCurta(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function nomeCompleto(u) {
  if (!u) return ''
  return [u.posto, u.nome].filter(Boolean).join(' ')
}
