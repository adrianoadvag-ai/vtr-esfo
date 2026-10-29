// Separação das pendências (29/10/2026):
//  - Manutenção: o que precisa ser executado (urgente, programada e demais itens)
//  - Outras alterações: o que fica registrado, mas dificilmente será resolvido (lataria, ralados, bancos, acabamento…)
// A categoria fica gravada na pendência (`categoria`); sem ela, é deduzida pelo item e pelo texto.
import { ITENS, NIVEIS } from '../config'
import { textoPendencia } from './pendencia'

export const CATEGORIAS = {
  manutencao: { nome: 'Manutenção', explica: 'O que precisa ser executado' },
  outras: { nome: 'Outras alterações', explica: 'Registradas na VTR, sem previsão de conserto' },
}

export const BLOCOS = {
  urgente: { nome: 'Urgente', explica: 'Segurança e equipamentos de serviço' },
  programada: { nome: 'Programada', explica: 'Troca de óleo, pneus, pastilhas, suspensão, palhetas, filtro' },
  demais: { nome: 'Demais itens', explica: 'Outras manutenções' },
}

const IDS_CHECKLIST = new Set(ITENS.map((i) => i.id))

const sem = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

// Mecânica e segurança: sempre manutenção, mesmo que o texto fale em batida
const MECANICA = /freio|oleo|bateria|nao (esta )?lig|cambio|embreag|amortec|alinham|suspens|pneu|estepe|motor|pastilh|baixad|inquerito|monitoramento|cartao|vazament|radiador|arrefec|direcao|giroflex|sirene/
// Lataria, acabamento e pequenas avarias
const AVARIA = /batid|ralad|amassad|risc|lataria|para-?choque|para-?lama|porta|banco|forra|tampa|suporte|retrovisor|pintura|adesiv|trinc|quebrad|macaneta|tapete|acabament|estofad|lateral/

export function categoriaDe(o) {
  if (!o) return 'manutencao'
  if (o.categoria && CATEGORIAS[o.categoria]) return o.categoria
  if (IDS_CHECKLIST.has(o.itemId)) return 'manutencao'
  const t = sem(textoPendencia(o))
  if (MECANICA.test(t)) return 'manutencao'
  if (AVARIA.test(t)) return 'outras'
  return 'manutencao'
}

const URGENTE = /freio|baixad|inquerito|nao (esta )?lig|giroflex|sirene|vazament/
const PROGRAMADA = /oleo|alinham|amortec|embreag|revis|palhet|filtro|pastilh|suspens|pneu|estepe/
const IDS_PROGRAMADA = new Set(['oleo', 'troca', 'palhetas', 'filtroAC', 'condPneus', 'condPastilhas', 'pneus'])

// Bloco de uma pendência de manutenção
export function blocoDe(o) {
  if (o.bloco) return o.bloco
  const t = sem(textoPendencia(o))
  if (o.nivel === 'critico' || URGENTE.test(t)) return 'urgente'
  if (IDS_PROGRAMADA.has(o.itemId) || PROGRAMADA.test(t)) return 'programada'
  return 'demais'
}

export const ehManutencao = (o) => categoriaDe(o) === 'manutencao'

// Ordem: manutenção antes das outras alterações; dentro de cada uma, gravidade e data
export function ordenarPendencias(lista) {
  return [...lista].sort(
    (a, b) =>
      (categoriaDe(a) === 'manutencao' ? 0 : 1) - (categoriaDe(b) === 'manutencao' ? 0 : 1) ||
      (NIVEIS[b.nivel]?.ordem || 0) - (NIVEIS[a.nivel]?.ordem || 0) ||
      (a.abertaEm || '').localeCompare(b.abertaEm || ''),
  )
}
