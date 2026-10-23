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

// Segunda-feira da semana de uma data (AAAA-MM-DD)
export function segundaDa(iso) {
  const { a, m, d } = partes(iso)
  const dt = new Date(a, m - 1, d)
  const dia = dt.getDay() || 7
  dt.setDate(dt.getDate() - (dia - 1))
  return hojeISO(dt)
}

export function somarDias(iso, n) {
  const { a, m, d } = partes(iso)
  return hojeISO(new Date(a, m - 1, d + n))
}

export function diaDaSemana(iso) {
  const { a, m, d } = partes(iso)
  return new Date(a, m - 1, d).getDay()
}

// "12/10"
export function diaMes(iso) {
  const { m, d } = partes(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export const NOMES_DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

// Telefone: só dígitos, sem o 55
export function soDigitos(t) {
  const n = String(t || '').replace(/\D/g, '')
  return n.startsWith('55') && n.length > 11 ? n.slice(2) : n
}

// "(41) 99999-9999"
export function telefoneBR(t) {
  const n = soDigitos(t)
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return t || ''
}

export const linkWhatsApp = (t) => `https://wa.me/55${soDigitos(t)}`

// Iniciais para o avatar: "Cad. Romeiro" -> "R"; "Vitor Luiz" -> "VL"
export function iniciais(u) {
  const base = (u?.nome || u?.nomeInteiro || '?').trim().split(/\s+/)
  return (base.length > 1 ? base[0][0] + base[base.length - 1][0] : base[0].slice(0, 2)).toUpperCase()
}

// Mensagem de erro clara: separa "sem permissão no banco" de "sem conexão"
export function mensagemErro(e, padrao = 'Não foi possível concluir.') {
  const c = e?.code || ''
  if (c === 'permission-denied' || /insufficient permissions/i.test(e?.message || ''))
    return 'O banco recusou a alteração: as regras do Firebase precisam ser atualizadas (ou você não tem essa permissão).'
  if (c === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'Sem conexão com a internet. Tente de novo.'
  return padrao
}
