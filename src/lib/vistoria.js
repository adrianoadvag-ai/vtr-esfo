// Regras da vistoria: o que falta preencher, gravidade dos achados e texto do relatório.
import { ITENS, LIMITES, NIVEIS, TROCA, rotuloVaga } from '../config'
import { combustivelTexto, dataBR, dataExtensa, diasAte, km, saudacao } from './formato'

// Identificador da rodada: a 1ª do dia é a própria data; as seguintes, data-2, data-3…
// Trava de VTR: vale enquanto o celular de quem vistoria der sinal de vida (renova a cada minuto)
export const TRAVA_MS = 3 * 60 * 1000
export const travaAtiva = (t, agora = Date.now()) => Boolean(t && agora - (t.em || 0) < TRAVA_MS)
export const travaDeOutro = (rodada, vtrId, uid) => {
  const t = rodada?.travas?.[vtrId]
  return travaAtiva(t) && t.uid !== uid ? t : null
}

export const idRodada = (data, seq) => (seq > 1 ? `${data}-${seq}` : data)

export const itensDa = (vtr) => ITENS.filter((i) => !i.so || i.so(vtr))

export const registroVazio = () => ({ itens: {} })

const maior = (a, b) => (NIVEIS[a].ordem >= NIVEIS[b].ordem ? a : b)

// Situação da troca de óleo da viatura (com o KM informado hoje, se houver)
export function trocaDeOleo(vtr, kmHoje, hoje) {
  const kmRef = Number(kmHoje) || vtr.kmAtual || 0
  // VTR nova: ainda sem troca; o que vale é a revisão dos 10.000 km
  if (vtr.nova) {
    const kmAlvo = Number(vtr.kmRevisao) || TROCA.revisaoNovaKm
    const faltaKm = kmAlvo - kmRef
    return {
      nova: true,
      kmAlvo,
      faltaKm,
      faltaDias: null,
      alerta: faltaKm <= LIMITES.kmParaTroca,
      texto: faltaKm < 0 ? `revisão dos ${km(kmAlvo)} km vencida há ${km(-faltaKm)} km` : `revisão dos ${km(kmAlvo)} km: faltam ${km(faltaKm)} km`,
    }
  }
  const faltaKm = vtr.kmProxTroca ? vtr.kmProxTroca - kmRef : null
  const faltaDias = vtr.dataProxTroca ? diasAte(vtr.dataProxTroca, hoje) : null
  const alertaKm = faltaKm !== null && faltaKm <= LIMITES.kmParaTroca
  const alertaDias = faltaDias !== null && faltaDias <= LIMITES.diasParaTroca
  const partes = []
  if (faltaKm !== null) partes.push(faltaKm < 0 ? `vencida há ${km(-faltaKm)} km` : `faltam ${km(faltaKm)} km`)
  if (faltaDias !== null) partes.push(faltaDias < 0 ? `vencida há ${-faltaDias} dias` : `faltam ${faltaDias} dias`)
  return { faltaKm, faltaDias, alerta: alertaKm || alertaDias, semDados: !partes.length, texto: partes.join(' · ') || 'sem dados da troca' }
}

// Avalia o registro de uma VTR: completo? quais achados e qual a gravidade?
export function avaliar(vtr, reg = {}, hoje) {
  const itens = itensDa(vtr)
  const pendentes = []
  const achados = []

  if (reg.naoVistoriada) {
    return {
      completo: Boolean(reg.motivoNao && reg.motivoNao.trim()),
      pendentes: reg.motivoNao ? [] : ['Motivo da não vistoria'],
      achados: [],
      nivel: null,
      estado: 'nao',
    }
  }

  if (reg.km === undefined || reg.km === null || reg.km === '') pendentes.push('KM')
  else if (vtr.kmAtual && Number(reg.km) < vtr.kmAtual) pendentes.push('KM menor que o último registrado')
  if (reg.comb === undefined || reg.comb === null) pendentes.push('Combustível')
  if (vtr.usaArla && (reg.arla === undefined || reg.arla === null)) pendentes.push('Arla')

  for (const it of itens) {
    const r = reg.itens?.[it.id]
    if (!r || !r.estado) pendentes.push(it.nome)
    else if (r.estado === 'alt') {
      const opcoes = r.alts?.length ? r.alts : ['Com alteração']
      const nivel = opcoes.reduce((n, o) => maior(n, it.niveis?.[o] || it.nivel), 'info')
      achados.push({ nivel, itemId: it.id, item: it.nome, texto: `${it.nome}: ${opcoes.join(', ')}` })
    }
  }

  const temAlt = achados.length > 0
  if (temAlt && !(reg.obs && reg.obs.trim())) pendentes.push('Observação da alteração')

  if (reg.comb !== undefined && reg.comb !== null && reg.comb <= LIMITES.combustivelAtencao) {
    achados.push({ nivel: 'atencao', itemId: 'combustivel', item: 'Combustível', texto: `Combustível: ${combustivelTexto(reg.comb)}` })
  }
  if (vtr.usaArla && reg.arla !== undefined && reg.arla !== null && reg.arla <= LIMITES.combustivelAtencao) {
    achados.push({ nivel: 'atencao', itemId: 'arla', item: 'Arla 32', texto: `Arla: ${combustivelTexto(reg.arla).replace(' de tanque', '')}` })
  }
  const troca = trocaDeOleo(vtr, reg.km, hoje)
  if (troca.alerta) {
    const item = troca.nova ? 'Revisão' : 'Troca de óleo'
    achados.push({ nivel: 'atencao', itemId: 'troca', item, texto: troca.nova ? `Revisão: ${troca.texto.replace(/^revisão /, '')}` : `Troca de óleo: ${troca.texto}` })
  }

  const nivel = achados.reduce((n, a) => (n ? maior(n, a.nivel) : a.nivel), null)
  const estado = pendentes.length ? (Object.keys(reg.itens || {}).length || reg.km ? 'andamento' : 'pendente') : temAlt ? 'alt' : 'ok'
  return { completo: pendentes.length === 0, pendentes, achados, nivel, estado }
}

export const exigida = (vtr) => (vtr.situacao || 'ativa') === 'ativa'

// Monta o texto do relatório no formato usado no WhatsApp
export function montarRelatorio({ data, viaturas, registros, limpeza, responsaveis, auxiliares = [], supervisor, pendenciasAbertas = [], totalFrota, agora = new Date() }) {
  const L = []
  L.push(`Com licença, Senhores. ${saudacao(agora)}`)
  L.push('')
  const lista = viaturas
  const parcial = totalFrota && lista.length < totalFrota ? ` (${lista.length} de ${totalFrota} viaturas)` : ''
  L.push(`Segue o relatório das viaturas: ${dataExtensa(data)}${parcial}`)

  const alteracoes = []
  for (const v of lista) {
    const a = avaliar(v, registros[v.id] || {}, data)
    for (const x of a.achados) alteracoes.push({ v, ...x })
  }
  alteracoes.sort((a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem)

  if (alteracoes.length) {
    L.push('')
    L.push(`⚠️ *Alterações (${alteracoes.length})*`)
    for (const x of alteracoes) {
      L.push(`- ${NIVEIS[x.nivel].nome.toUpperCase()} · ${x.v.prefixo} ${x.v.modelo}: ${x.texto}`)
    }
  }

  const hojeIds = new Set(alteracoes.map((x) => `${x.v.id}:${x.itemId}`))
  const antigas = pendenciasAbertas.filter((p) => !hojeIds.has(`${p.viaturaId}:${p.itemId}`))
  if (antigas.length) {
    L.push('')
    L.push(`📌 *Pendências em aberto (${antigas.length})*`)
    for (const p of antigas) L.push(`- ${p.prefixo}: ${p.texto} (desde ${dataBR(p.abertaEm)})`)
  }

  lista.forEach((v, i) => {
    const r = registros[v.id] || {}
    L.push('')
    L.push(`${i + 1}. ${v.prefixo} - ${v.modelo}`)
    L.push('')
    const por = r.por ? `* Vistoriada por: ${r.por}` : null
    if (r.naoVistoriada) {
      L.push(`* Não vistoriada: ${r.motivoNao || ''}`)
      if (r.por) L.push(`* Registrado por: ${r.por}`)
      return
    }
    if (v.situacao === 'manutencao') L.push(`* Situação: em manutenção${v.motivoSituacao ? ` (${v.motivoSituacao})` : ''}`)
    L.push(`* KM: ${km(r.km)}`)
    const t = trocaDeOleo(v, r.km, data)
    if (t.nova) {
      L.push(`* Próx. troca: VTR nova, revisão aos ${km(t.kmAlvo)} km (${t.faltaKm < 0 ? 'vencida' : `faltam ${km(t.faltaKm)} km`})`)
    } else if (t.semDados) {
      L.push(`* Próx. troca: sem dados${v.dataUltimaTroca ? ` (última em ${dataBR(v.dataUltimaTroca)})` : ''}`)
    } else {
      const kmTxt = v.kmProxTroca ? `${km(v.kmProxTroca)} km (${t.faltaKm < 0 ? 'vencida' : `faltam ${km(t.faltaKm)} km`})` : ''
      const dataTxt = v.dataProxTroca ? dataBR(v.dataProxTroca) : ''
      L.push(`* Próx. troca: ${[kmTxt, dataTxt].filter(Boolean).join(' ou ')}`)
    }
    if (v.usaArla) L.push(`* Arla: ${combustivelTexto(r.arla).replace(' de tanque', '')}`)
    const it = Object.fromEntries(itensDa(v).map((x) => [x.id, x]))
    const linha = (id) => {
      const d = it[id]
      if (!d) return
      const s = r.itens?.[id]
      L.push(`* ${d.rel}: ${s?.estado === 'alt' ? (s.alts?.length ? s.alts.join(', ') : 'Com alteração') : d.okTexto}`)
    }
    linha('oleo')
    linha('fluidos')
    L.push(`* Combustível: ${combustivelTexto(r.comb)}`)
    linha('sinais')
    linha('radio')
    // Itens novos: uma linha só quando tudo está sem alteração
    const compactos = itensDa(v).filter((x) => x.compacto)
    const comAlt = compactos.filter((x) => r.itens?.[x.id]?.estado === 'alt')
    for (const x of comAlt) linha(x.id)
    const semAlt = compactos.filter((x) => !comAlt.includes(x))
    if (semAlt.length) {
      const t = juntar(semAlt.map((x) => x.rel.toLowerCase()))
      L.push(`* ${t[0].toUpperCase()}${t.slice(1)}: S/A`)
    }
    if (r.obs && r.obs.trim()) L.push(`* Obs: ${r.obs.trim()}`)
    if (por) L.push(por)
  })

  L.push('')
  L.push(
    limpeza?.ok === false
      ? `Condições gerais de limpeza: necessita limpeza${limpeza.obs ? ` (${limpeza.obs})` : ''}.`
      : 'Condições gerais de limpeza: Limpeza realizada dentro do padrão.',
  )
  // Assinaturas: Responsável (1º ano /2), Supervisor (1º ano /1) e Gestor (3º ano)
  const assinar = (campo, nomes) => {
    if (!nomes.length) return
    L.push('')
    L.push(`${rotuloVaga(campo, nomes.length)}:`)
    for (const n of nomes) L.push(n)
  }
  assinar('auxiliares', auxiliares)
  assinar('responsaveis', responsaveis)
  assinar('supervisor', supervisor ? [supervisor] : [])
  return L.join('\n')
}

function juntar(arr) {
  if (arr.length <= 1) return arr.join('')
  return `${arr.slice(0, -1).join(', ')} e ${arr.at(-1)}`
}
