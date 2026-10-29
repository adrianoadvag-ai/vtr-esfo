// Regras da escala semanal: dias, vagas, quem está de serviço e texto para o WhatsApp.
import { ESCALA, FUNCOES, ROTINA, ativoNaMissao, funcaoDe, rotuloVaga } from '../config'
import { NOMES_DIAS, dataCurta, diaDaSemana, diaMes, hojeISO, nomeCompleto, segundaDa, somarDias } from './formato'

// No fim de semana, a tela já abre na semana seguinte
export function semanaPadrao(hoje = hojeISO()) {
  const dia = diaDaSemana(hoje)
  return dia === 0 || dia === 6 ? segundaDa(somarDias(hoje, 2)) : segundaDa(hoje)
}

export const diasDa = (semana) => ESCALA.dias.map((n) => somarDias(semana, n - 1))
export const vagasDo = (dia) => ESCALA.vagas[diaDaSemana(dia)] || 1
export const vagasAuxiliar = () => ESCALA.auxiliares || 1
export const rotinaDo = (dia) => ROTINA[diaDaSemana(dia)] || ''

// Mesma pessoa: pelo id do cadastro, ou pelo nome quando foi digitado à mão
export const mesmaPessoa = (p, u) => Boolean(p && u && ((p.id && p.id === u.id) || (!p.id && p.nome === nomeCompleto(u))))

export function papelNoDia(diaEsc, u) {
  if (!diaEsc || !u) return null
  if ((diaEsc.responsaveis || []).slice(0, 1).some((p) => mesmaPessoa(p, u))) return 'responsavel'
  if ((diaEsc.auxiliares || []).some((p) => mesmaPessoa(p, u))) return 'auxiliar'
  return null
}

// Gestor (3º ano, chave 'supervisor') não entra na escala; quando vistoria, aparece como "(gestor)"
export function atuaComoGestor(diaEsc, u) {
  if (papelNoDia(diaEsc, u)) return false
  return funcaoDe(u) === 'supervisor'
}

export const nomesAuxiliares = (diaEsc) => (diaEsc?.auxiliares || []).filter((p) => p?.nome).map((p) => p.nome)

export const nomesResponsaveis = (diaEsc) => (diaEsc?.responsaveis || []).filter((p) => p?.nome).map((p) => p.nome)

export function juntar(nomes) {
  if (nomes.length <= 1) return nomes[0] || ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

// Próximos dias de serviço (de hoje em diante) a partir das semanas carregadas
export function proximosServicos(escalas, u, hoje = hojeISO()) {
  const lista = []
  for (const e of escalas) {
    if (!e?.dias) continue
    for (const [dia, diaEsc] of Object.entries(e.dias)) {
      const papel = papelNoDia(diaEsc, u)
      if (papel && dia >= hoje) lista.push({ dia, papel })
    }
  }
  return lista.sort((a, b) => a.dia.localeCompare(b.dia))
}

export function textoEscala(semana, escala) {
  const dias = diasDa(semana)
  const L = ['*Escala · Missão Viaturas EsFO*', `Semana de ${diaMes(dias[0])} a ${diaMes(dias[dias.length - 1])}`]
  for (const dia of dias) {
    const d = escala?.dias?.[dia]
    const resp = nomesResponsaveis(d).slice(0, vagasDo(dia))
    L.push('', `*${NOMES_DIAS[diaDaSemana(dia)]} – ${diaMes(dia)}*`)
    const aux = nomesAuxiliares(d)
    L.push(`${rotuloVaga('auxiliares', aux.length)}: ${juntar(aux) || 'a definir'}`)
    L.push(`${rotuloVaga('responsaveis', resp.length)}: ${juntar(resp) || 'a definir'}`)
    L.push(`Rotina: ${rotinaDo(dia)}`)
  }
  return L.join('\n')
}

export const rotuloDia = (dia) => dataCurta(dia)

// Nome atual de quem está na escala (se mudou o nome de guerra, acompanha o cadastro)
export function nomeAtual(p, usuarios = []) {
  if (!p) return ''
  const u = p.id && usuarios.find((x) => x.id === p.id)
  return u ? nomeCompleto(u) : p.nome || ''
}

// Escala de um dia, já com os nomes atualizados.
// Escalas antigas podem ter dois supervisores na segunda e um gestor: valem só as vagas atuais.
export function escalaDoDia(escalas, dia, usuarios) {
  const d = escalas?.[segundaDa(dia)]?.dias?.[dia]
  if (!d) return null
  return {
    responsaveis: (d.responsaveis || []).slice(0, vagasDo(dia)).filter(Boolean).map((p) => ({ ...p, nome: nomeAtual(p, usuarios) })),
    auxiliares: (d.auxiliares || []).slice(0, vagasAuxiliar()).filter(Boolean).map((p) => ({ ...p, nome: nomeAtual(p, usuarios) })),
    supervisor: null,
  }
}

// Total de escalas de cada um, por papel, a partir do primeiro dia de missão com relatório
// (como na planilha: inclui as semanas já lançadas)
export const PAPEIS = [
  { papel: 'responsavel', nome: FUNCOES.responsavel.grupo, funcao: 'responsavel' },
  { papel: 'auxiliar', nome: FUNCOES.auxiliar.grupo, funcao: 'auxiliar' },
]

export function totaisEscala(escalas = [], inicio, usuarios = []) {
  const totais = Object.fromEntries(PAPEIS.map((p) => [p.papel, new Map()]))
  const chave = (p) => p.id || `nome:${p.nome}`
  const somar = (papel, p) => {
    if (!p?.nome && !p?.id) return
    const t = totais[papel]
    const k = chave(p)
    const u = p.id && usuarios.find((x) => x.id === p.id)
    const atual = t.get(k) || { id: p.id, nome: u ? nomeCompleto(u) : p.nome, total: 0 }
    atual.total += 1
    t.set(k, atual)
  }
  if (inicio) {
    for (const e of escalas) {
      for (const [dia, d] of Object.entries(e?.dias || {})) {
        if (dia < inicio || !d) continue
        for (const p of (d.responsaveis || []).slice(0, vagasDo(dia))) somar('responsavel', p)
        for (const p of (d.auxiliares || []).slice(0, vagasAuxiliar())) somar('auxiliar', p)
      }
    }
  }
  // Quem tem a função e ainda não foi escalado aparece com zero
  for (const { papel, funcao } of PAPEIS) {
    for (const u of usuarios) {
      if (!ativoNaMissao(u) || funcaoDe(u) !== funcao) continue
      if (!totais[papel].has(u.id)) totais[papel].set(u.id, { id: u.id, nome: nomeCompleto(u), total: 0 })
    }
  }
  return PAPEIS.map((p) => ({
    ...p,
    lista: [...totais[p.papel].values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR')),
  }))
}

// Nomes das funções (para os rótulos)
export const nomeFuncao = (f) => FUNCOES[f]?.nome || ''
