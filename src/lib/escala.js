// Regras da escala semanal: dias, vagas, quem está de serviço e texto para o WhatsApp.
import { ESCALA, ROTINA } from '../config'
import { NOMES_DIAS, dataCurta, diaDaSemana, diaMes, hojeISO, nomeCompleto, segundaDa, somarDias } from './formato'

// No fim de semana, a tela já abre na semana seguinte
export function semanaPadrao(hoje = hojeISO()) {
  const dia = diaDaSemana(hoje)
  return dia === 0 || dia === 6 ? segundaDa(somarDias(hoje, 2)) : segundaDa(hoje)
}

export const diasDa = (semana) => ESCALA.dias.map((n) => somarDias(semana, n - 1))
export const vagasDo = (dia) => ESCALA.vagas[diaDaSemana(dia)] || 1
export const rotinaDo = (dia) => ROTINA[diaDaSemana(dia)] || ''

// Mesma pessoa: pelo id do cadastro, ou pelo nome quando foi digitado à mão
export const mesmaPessoa = (p, u) => Boolean(p && u && ((p.id && p.id === u.id) || (!p.id && p.nome === nomeCompleto(u))))

export function papelNoDia(diaEsc, u) {
  if (!diaEsc || !u) return null
  if ((diaEsc.responsaveis || []).some((p) => mesmaPessoa(p, u))) return 'responsavel'
  if (mesmaPessoa(diaEsc.supervisor, u)) return 'supervisor'
  return null
}

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
    const resp = nomesResponsaveis(d)
    L.push('', `*${NOMES_DIAS[diaDaSemana(dia)]} – ${diaMes(dia)}*`)
    L.push(`${resp.length > 1 ? 'Responsáveis' : 'Responsável'}: ${juntar(resp) || 'a definir'}`)
    L.push(`Supervisor: ${d?.supervisor?.nome || 'a definir'}`)
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

// Escala de um dia, já com os nomes atualizados
export function escalaDoDia(escalas, dia, usuarios) {
  const d = escalas?.[segundaDa(dia)]?.dias?.[dia]
  if (!d) return null
  return {
    responsaveis: (d.responsaveis || []).filter(Boolean).map((p) => ({ ...p, nome: nomeAtual(p, usuarios) })),
    supervisor: d.supervisor ? { ...d.supervisor, nome: nomeAtual(d.supervisor, usuarios) } : null,
  }
}
