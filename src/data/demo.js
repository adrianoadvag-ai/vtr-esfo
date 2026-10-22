// Modo demonstração: tudo fica guardado só neste aparelho (localStorage).
// Serve para testar o app antes de ligar o Firebase.
import { VIATURAS_INICIAIS, USUARIOS_DEMO, escalaDemo } from './seed'
import { blobParaDataURL, comprimirFoto } from '../lib/foto'

const CHAVE = 'vtr-esfo-demo-v3'
const memoria = { dados: null }

function vazio() {
  return { usuarios: copia(USUARIOS_DEMO), viaturas: VIATURAS_INICIAIS, vistorias: {}, ocorrencias: [], escalas: escalaDemo(), sessao: null }
}

function ler() {
  if (memoria.dados) return memoria.dados
  try {
    const s = localStorage.getItem(CHAVE)
    memoria.dados = s ? JSON.parse(s) : vazio()
  } catch {
    memoria.dados = vazio()
  }
  return memoria.dados
}

function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(memoria.dados))
  } catch {
    // Sem armazenamento (aba privada ou cheio): os dados ficam só nesta sessão
  }
  ouvintes.forEach((f) => f())
}

const ouvintes = new Set()
const ouvir = (f) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}
const copia = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)))
const id = () => Math.random().toString(36).slice(2, 10)

export const modo = 'demo'

export function onUsuario(cb) {
  const emitir = () => {
    const d = ler()
    cb(d.sessao ? copia(d.usuarios.find((u) => u.id === d.sessao)) || null : null)
  }
  emitir()
  return ouvir(emitir)
}

export const usuariosDemo = () => copia(ler().usuarios)

export async function entrarDemo(uid) {
  ler().sessao = uid
  gravar()
}

export async function sair() {
  ler().sessao = null
  gravar()
}

export async function listarUsuarios() {
  return copia(ler().usuarios)
}

export async function definirPerfil(uid, perfil) {
  const u = ler().usuarios.find((x) => x.id === uid)
  if (u) u.perfil = perfil
  gravar()
}

export async function salvarMeusDados(uid, dados) {
  const u = ler().usuarios.find((x) => x.id === uid)
  if (u) for (const k of ['posto', 'nome', 'nomeInteiro', 'pelotao', 'telefone']) u[k] = String(dados[k] || '').trim()
  gravar()
}

export function observarEscala(semana, cb) {
  const emitir = () => cb(copia((ler().escalas || {})[semana] || null))
  emitir()
  return ouvir(emitir)
}

export async function salvarEscalaDia(semana, dia, valor, por) {
  const d = ler()
  d.escalas ||= {}
  const e = (d.escalas[semana] ||= { semana, dias: {} })
  e.dias[dia] = valor
  Object.assign(e, { atualizadoEm: Date.now(), atualizadoPor: por })
  gravar()
}

export async function listarViaturas() {
  return copia(ler().viaturas).sort((a, b) => (a.ordem || 99) - (b.ordem || 99))
}

export async function salvarViatura(v) {
  const d = ler()
  const vtr = { ...v, id: v.id || `vtr-${id()}` }
  const i = d.viaturas.findIndex((x) => x.id === vtr.id)
  if (i >= 0) d.viaturas[i] = vtr
  else d.viaturas.push(vtr)
  gravar()
  return vtr
}

export async function carregarViaturasIniciais() {
  ler().viaturas = copia(VIATURAS_INICIAIS)
  gravar()
}

export function observarDia(data, cb) {
  const emitir = () => cb(copia(Object.entries(ler().vistorias).filter(([, v]) => v.data === data).map(([k, v]) => ({ ...v, id: k }))))
  emitir()
  return ouvir(emitir)
}

export async function salvarRegistro(vid, data, seq, vtrId, reg, por) {
  const d = ler()
  const v = (d.vistorias[vid] ||= { data, seq, registros: {} })
  if (v.status === 'enviada') throw new Error('Esta rodada já foi enviada.')
  v.registros[vtrId] = { ...reg, por, em: Date.now() }
  gravar()
}

export async function enviarVistoria(vid, data, { relatorio, responsaveis, limpeza, kms, novasOcorrencias, por, incluidas, restantes, proxima }) {
  const d = ler()
  const v = d.vistorias[vid]
  if (!v) throw new Error('Nada para enviar.')
  if (v.status === 'enviada') throw new Error('Esta rodada já foi enviada.')
  Object.assign(v, { status: 'enviada', relatorio, responsaveis, limpeza, incluidas, enviadaEm: Date.now(), enviadaPor: por })
  for (const [vtrId, k] of Object.entries(kms)) {
    const vtr = d.viaturas.find((x) => x.id === vtrId)
    if (vtr && k > (vtr.kmAtual || 0)) vtr.kmAtual = k
  }
  for (const o of novasOcorrencias) d.ocorrencias.push({ ...o, id: id() })
  if (Object.keys(restantes).length) d.vistorias[proxima.id] = { data, seq: proxima.seq, registros: restantes }
  gravar()
}

export async function listarVistorias() {
  return copia(Object.entries(ler().vistorias).map(([k, v]) => ({ ...v, id: k })))
    .filter((v) => v.status === 'enviada')
    .sort((a, b) => (b.enviadaEm || 0) - (a.enviadaEm || 0))
}

export async function listarOcorrencias() {
  return copia(ler().ocorrencias).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))
}

export async function resolverOcorrencia(oid, { por, nota, data }) {
  const o = ler().ocorrencias.find((x) => x.id === oid)
  if (o) Object.assign(o, { status: 'resolvida', resolvidaPor: por, notaResolucao: nota || '', resolvidaEm: data })
  gravar()
}

export async function enviarFoto(_data, _vtrId, arquivo) {
  const blob = await comprimirFoto(arquivo, 800, 0.6)
  return blobParaDataURL(blob)
}

export async function apagarTudo() {
  memoria.dados = vazio()
  gravar()
}

export const lerFoto = async (ref) => ref
