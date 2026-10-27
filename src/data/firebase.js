// Modo Firebase: login individual, dados no Cloud Firestore e fotos no Cloud Storage.
import { initializeApp } from 'firebase/app'
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import {
  FieldPath,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { VIATURAS_INICIAIS } from './seed'
import { EMAIL_ADMIN, firebaseConfig } from '../firebase-config'
import { blobParaDataURL, comprimirFoto } from '../lib/foto'
import { travaAtiva } from '../lib/vistoria'


const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
// Cache local: o app continua funcionando sem sinal na garagem e sincroniza depois
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
// Fotos: por padrão vão comprimidas para o Firestore (gratuito no plano Spark).
// O Cloud Storage exige o plano Blaze desde fev. 2026; ative com VITE_USAR_STORAGE=1.
const usarStorage = import.meta.env.VITE_USAR_STORAGE === '1'
const storage = usarStorage ? getStorage(app) : null

export const modo = 'firebase'

const lista = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }))

export function onUsuario(cb) {
  let pararPerfil = () => {}
  const pararAuth = onAuthStateChanged(auth, (u) => {
    pararPerfil()
    if (!u) return cb(null)
    pararPerfil = onSnapshot(
      doc(db, 'usuarios', u.uid),
      (s) => cb(s.exists() ? { ...s.data(), id: u.uid, email: u.email } : { id: u.uid, email: u.email, perfil: 'pendente', semPerfil: true }),
      () => cb({ id: u.uid, email: u.email, perfil: 'pendente', semPerfil: true }),
    )
  })
  return () => {
    pararPerfil()
    pararAuth()
  }
}

export async function entrar(email, senha) {
  await signInWithEmailAndPassword(auth, email.trim(), senha)
}

export async function cadastrar({ email, senha, posto, nome }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha)
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    posto: posto.trim(),
    nome: nome.trim(),
    email: email.trim(),
    perfil: email.trim().toLowerCase() === EMAIL_ADMIN ? 'admin' : 'pendente',
    criadoEm: Date.now(),
  })
}

export const redefinirSenha = (email) => sendPasswordResetEmail(auth, email.trim())
export const sair = () => signOut(auth)

// Troca de senha dentro do app: confirma a senha atual e grava a nova
export async function alterarSenha(atual, nova) {
  const u = auth.currentUser
  if (!u) throw new Error('Entre de novo no app para trocar a senha.')
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, atual))
    await updatePassword(u, nova)
  } catch (e) {
    const msgs = {
      'auth/invalid-credential': 'A senha atual está incorreta.',
      'auth/wrong-password': 'A senha atual está incorreta.',
      'auth/weak-password': 'A nova senha precisa ter pelo menos 6 caracteres.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
      'auth/network-request-failed': 'Sem conexão com a internet.',
    }
    throw new Error(msgs[e?.code] || e?.message || 'Não foi possível trocar a senha.')
  }
}

export async function listarUsuarios() {
  return lista(await getDocs(collection(db, 'usuarios'))).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
}

export const definirPerfil = (uid, perfil) => updateDoc(doc(db, 'usuarios', uid), { perfil })
// Liberação e função na missão (perfil e função mudam juntos)
export const definirFuncao = (uid, mudanca) => updateDoc(doc(db, 'usuarios', uid), mudanca)

// Dados do próprio integrante (as regras não deixam mudar o perfil por aqui)
const CAMPOS_PESSOAIS = ['posto', 'nome', 'nomeInteiro', 'pelotao', 'telefone']
export async function salvarMeusDados(uid, dados) {
  const limpo = Object.fromEntries(CAMPOS_PESSOAIS.map((k) => [k, String(dados[k] || '').trim()]))
  await updateDoc(doc(db, 'usuarios', uid), { ...limpo, dadosEm: Date.now() })
}

// Escala: um documento por semana, com o id da segunda-feira (2026-10-12)
export function observarEscala(semana, cb) {
  return onSnapshot(
    doc(db, 'escalas', semana),
    (s) => cb(s.exists() ? s.data() : null),
    () => cb(null),
  )
}

// Todas as escalas (para o total de escalas de cada um)
export async function listarEscalas() {
  return lista(await getDocs(collection(db, 'escalas')))
}

// Lê a escala de uma semana uma vez (para o relatório mensal)
export async function lerEscala(semana) {
  const s = await getDoc(doc(db, 'escalas', semana))
  return s.exists() ? s.data() : null
}

export async function salvarEscalaDia(semana, dia, valor, por) {
  await setDoc(
    doc(db, 'escalas', semana),
    { semana, dias: { [dia]: valor }, atualizadoEm: Date.now(), atualizadoPor: por },
    { mergeFields: ['semana', new FieldPath('dias', dia), 'atualizadoEm', 'atualizadoPor'] },
  )
}

export async function listarViaturas() {
  return lista(await getDocs(collection(db, 'viaturas'))).sort((a, b) => (a.ordem || 99) - (b.ordem || 99))
}

export async function salvarViatura(v) {
  const vid = v.id || `vtr-${String(v.prefixo).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const { id: _ignorar, ...dados } = v
  await setDoc(doc(db, 'viaturas', vid), dados)
  return { ...dados, id: vid }
}

// Apaga o cadastro da viatura. Os relatórios já enviados continuam no histórico.
export const excluirViatura = (vid) => deleteDoc(doc(db, 'viaturas', vid))

export async function carregarViaturasIniciais() {
  const b = writeBatch(db)
  for (const { id, ...v } of VIATURAS_INICIAIS) b.set(doc(db, 'viaturas', id), v)
  await b.commit()
}

// Todas as rodadas de vistoria de um dia (pode haver mais de um relatório por dia)
export function observarDia(data, cb) {
  return onSnapshot(query(collection(db, 'vistorias'), where('data', '==', data)), (snap) => cb(lista(snap)))
}

export async function salvarRegistro(vid, data, seq, vtrId, reg, por) {
  // mergeFields troca só o registro desta VTR, sem apagar o das outras
  await setDoc(
    doc(db, 'vistorias', vid),
    { data, seq, registros: { [vtrId]: { ...reg, por, em: Date.now() } } },
    { mergeFields: ['data', 'seq', new FieldPath('registros', vtrId)] },
  )
}

// Trava: só um cadete por vez mexe em cada VTR. Devolve { ok, trava } (trava = de quem é, se não deu)
export async function travarViatura(vid, data, seq, vtrId, eu, forcar = false) {
  const ref = doc(db, 'vistorias', vid)
  const minha = { uid: eu.uid, nome: eu.nome, em: Date.now() }
  const gravarTrava = (escrever) =>
    escrever(ref, { data, seq, travas: { [vtrId]: minha } }, { mergeFields: ['data', 'seq', new FieldPath('travas', vtrId)] })
  try {
    return await runTransaction(db, async (tx) => {
      const s = await tx.get(ref)
      const d = s.exists() ? s.data() : {}
      if (d.status === 'enviada') return { ok: false, enviada: true }
      const t = d.travas?.[vtrId]
      if (!forcar && travaAtiva(t) && t.uid !== eu.uid) return { ok: false, trava: t }
      gravarTrava((r, v, o) => tx.set(r, v, o))
      return { ok: true }
    })
  } catch (e) {
    // Sem sinal na garagem a transação não roda: segue sem trava para não parar a vistoria
    if (e?.code === 'unavailable' || !navigator.onLine) {
      gravarTrava(setDoc).catch(() => {})
      return { ok: true, offline: true }
    }
    throw e
  }
}

export async function liberarViatura(vid, vtrId, uid) {
  const ref = doc(db, 'vistorias', vid)
  try {
    await runTransaction(db, async (tx) => {
      const s = await tx.get(ref)
      if (!s.exists() || s.data().status === 'enviada') return
      if (s.data().travas?.[vtrId]?.uid !== uid) return
      tx.update(ref, new FieldPath('travas', vtrId), deleteField())
    })
  } catch {
    // Se não liberar agora, a trava expira sozinha
  }
}

// Cancela a vistoria de uma VTR: apaga o registro dela nesta rodada e libera a trava
export async function cancelarRegistro(vid, vtrId) {
  const ref = doc(db, 'vistorias', vid)
  const s = await getDoc(ref)
  if (!s.exists()) return
  if (s.data().status === 'enviada') throw new Error('Esta rodada já foi enviada.')
  await updateDoc(ref, new FieldPath('registros', vtrId), deleteField(), new FieldPath('travas', vtrId), deleteField())
}

export async function enviarVistoria(vid, data, { relatorio, responsaveis, auxiliares, supervisor, limpeza, consolidado = false, kms, novasOcorrencias, atualizarOcorrencias = [], por, viaturas, incluidas, restantes, proxima }) {
  const b = writeBatch(db)
  b.set(
    doc(db, 'vistorias', vid),
    { status: 'enviada', relatorio, responsaveis, auxiliares: auxiliares || [], supervisor: supervisor || '', limpeza, consolidado, incluidas, enviadaEm: Date.now(), enviadaPor: por },
    { merge: true },
  )
  for (const [v, k] of Object.entries(kms)) {
    const atual = viaturas.find((x) => x.id === v)?.kmAtual || 0
    if (k > atual) b.update(doc(db, 'viaturas', v), { kmAtual: k, ultimaVistoria: data })
  }
  for (const o of novasOcorrencias) b.set(doc(collection(db, 'ocorrencias')), o)
  // Descrição atualizada pelo vistoriador nas pendências que já estavam abertas
  for (const { id, ...campos } of atualizarOcorrencias) b.update(doc(db, 'ocorrencias', id), campos)
  // O que estava incompleto continua na próxima rodada do dia
  if (Object.keys(restantes).length) b.set(doc(db, 'vistorias', proxima.id), { data, seq: proxima.seq, registros: restantes })
  await b.commit()
}

export async function listarVistorias() {
  // Ordena no aparelho: assim não é preciso criar índice composto no Firestore
  const q = query(collection(db, 'vistorias'), where('status', '==', 'enviada'))
  return lista(await getDocs(q)).sort((a, b) => (b.enviadaEm || 0) - (a.enviadaEm || 0))
}

// Exclui um relatório enviado (ex.: teste), as pendências e fotos que ele criou, e corrige o KM das VTR
export async function excluirRelatorio(vid, { ocorrencias = [], fotos = [], kms = {} }) {
  const b = writeBatch(db)
  b.delete(doc(db, 'vistorias', vid))
  for (const o of ocorrencias) b.delete(doc(db, 'ocorrencias', o))
  for (const f of fotos) if (f?.startsWith('fs:')) b.delete(doc(db, 'fotos', f.slice(3)))
  for (const [v, k] of Object.entries(kms)) b.update(doc(db, 'viaturas', v), { kmAtual: k })
  await b.commit()
}

export async function listarOcorrencias() {
  return lista(await getDocs(collection(db, 'ocorrencias'))).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))
}

// Cria pendências de uma vez (ex.: importação do detalhamento da planilha)
export async function criarOcorrencias(lista) {
  const b = writeBatch(db)
  for (const o of lista) b.set(doc(collection(db, 'ocorrencias')), o)
  await b.commit()
}

export const resolverOcorrencia = (oid, { por, nota, data }) =>
  updateDoc(doc(db, 'ocorrencias', oid), { status: 'resolvida', resolvidaPor: por, notaResolucao: nota || '', resolvidaEm: data })

export async function enviarFoto(data, vtrId, arquivo) {
  if (!usarStorage) {
    const imagem = await blobParaDataURL(await comprimirFoto(arquivo, 900, 0.6))
    if (imagem.length > 900000) throw new Error('Foto grande demais.')
    const r = await addDoc(collection(db, 'fotos'), { imagem, data, vtrId, em: Date.now() })
    return `fs:${r.id}`
  }
  const blob = await comprimirFoto(arquivo)
  const caminho = `vistorias/${data}/${vtrId}/${Date.now()}.jpg`
  const r = ref(storage, caminho)
  await uploadBytes(r, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(r)
}

const cacheFotos = new Map()
export async function lerFoto(ref) {
  if (!ref?.startsWith('fs:')) return ref
  if (!cacheFotos.has(ref)) {
    cacheFotos.set(
      ref,
      getDoc(doc(db, 'fotos', ref.slice(3))).then((s) => (s.exists() ? s.data().imagem : null)),
    )
  }
  return cacheFotos.get(ref)
}
