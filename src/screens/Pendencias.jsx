import { useEffect, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo, SeloNivel } from '../components/base'
import FiguraVtr, { ModeloVtr } from '../components/FiguraVtr'
import { NIVEIS, podeExcluirRelatorio, podeGerirViaturas } from '../config'
import { dataBR, diasAte, mensagemErro, nomeCompleto } from '../lib/formato'
import { DATA_PLANILHA, pendenciasDaPlanilha } from '../data/detalhamento-planilha'
import { textoPendencia } from '../lib/pendencia'
import { BLOCOS, CATEGORIAS, blocoDe, categoriaDe } from '../lib/categoria-pendencia'
import { trocaDeOleo } from '../lib/vistoria'
import { naFrota } from '../lib/situacao'

// Lembra a aba escolhida no aparelho
function lerAba() {
  try {
    return localStorage.getItem('pendencias-aba') === 'outras' ? 'outras' : 'manutencao'
  } catch {
    return 'manutencao'
  }
}

// Manutenção programada que o app calcula sozinho (não fica gravada): troca de óleo perto ou vencida
// e pneus/pastilhas em "Regular" na última conferência de segunda.
function automaticas(viaturas, abertas, vistorias, hoje) {
  const lista = []
  const ordem = [...(vistorias || [])].sort((a, b) => a.data.localeCompare(b.data) || (a.enviadaEm || 0) - (b.enviadaEm || 0))
  for (const v of viaturas.filter(naFrota)) {
    const t = trocaDeOleo(v, null, hoje)
    const jaAberta = abertas.some((o) => o.viaturaId === v.id && o.itemId === 'troca')
    if (t.alerta && !jaAberta) {
      const vencida = (t.faltaKm !== null && t.faltaKm < 0) || (t.faltaDias !== null && t.faltaDias < 0)
      lista.push({
        id: `auto-troca-${v.id}`,
        auto: true,
        viaturaId: v.id,
        prefixo: v.prefixo,
        modelo: v.modelo,
        texto: t.nova ? `Revisão: ${t.texto.replace(/^revisão /, '')}` : `Troca de óleo: ${t.texto}`,
        nivel: vencida ? 'critico' : 'atencao',
        bloco: 'programada',
        explica: 'Sai da lista quando a troca for registrada na vistoria ou na ficha.',
      })
    }
    for (const [itemId, nome] of [
      ['condPneus', 'Condição dos pneus'],
      ['condPastilhas', 'Condição das pastilhas'],
    ]) {
      let ultima = null
      for (const vis of ordem) {
        if (vis.incluidas && !vis.incluidas.includes(v.id)) continue
        const c = vis.registros?.[v.id]?.itens?.[itemId]?.condicao
        if (c) ultima = { c, data: vis.data }
      }
      if (ultima?.c === 'Regular') {
        lista.push({
          id: `auto-${itemId}-${v.id}`,
          auto: true,
          viaturaId: v.id,
          prefixo: v.prefixo,
          modelo: v.modelo,
          texto: `${nome}: Regular (conferência de ${dataBR(ultima.data)})`,
          nivel: 'atencao',
          bloco: 'programada',
          explica: 'Sai da lista quando a conferência de segunda marcar outra condição.',
        })
      }
    }
  }
  return lista
}

export default function Pendencias() {
  const { ocorrencias, usuario, api, hoje, recarregarOcorrencias, avisar, viaturas } = useApp()
  const [aba, setAbaEstado] = useState(lerAba)
  const [verResolvidas, setVerResolvidas] = useState(false)
  const [vtrFiltro, setVtrFiltro] = useState('')
  const [acao, setAcao] = useState(null) // { id, tipo: 'resolver' | 'arquivar' }
  const [nota, setNota] = useState('')
  const [abertosVtr, setAbertosVtr] = useState({})
  const [vistorias, setVistorias] = useState(null)
  const pode = podeGerirViaturas(usuario)

  useEffect(() => {
    let vivo = true
    api
      .listarVistorias()
      .then((l) => vivo && setVistorias(l))
      .catch(() => vivo && setVistorias([]))
    return () => {
      vivo = false
    }
  }, [api])

  const setAba = (a) => {
    setAbaEstado(a)
    setVtrFiltro('')
    setAcao(null)
    try {
      localStorage.setItem('pendencias-aba', a)
    } catch {
      // sem armazenamento: vale só nesta tela
    }
  }

  const abertas = ocorrencias.filter((o) => o.status === 'aberta')
  const autos = automaticas(viaturas, abertas, vistorias, hoje)
  const daAba = (o) => categoriaDe(o) === aba
  const emAberto = [...abertas.filter(daAba), ...(aba === 'manutencao' ? autos : [])].sort(
    (a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem || (a.abertaEm || '9').localeCompare(b.abertaEm || '9'),
  )
  const fechadas = ocorrencias
    .filter((o) => (o.status === 'resolvida' || o.status === 'arquivada') && daAba(o))
    .sort((a, b) => (b.resolvidaEm || b.arquivadaEm || '').localeCompare(a.resolvidaEm || a.arquivadaEm || ''))
  const nManut = abertas.filter((o) => categoriaDe(o) === 'manutencao').length + autos.length
  const nOutras = abertas.filter((o) => categoriaDe(o) === 'outras').length
  const base = verResolvidas ? fechadas : emAberto

  const ordemVtr = Object.fromEntries(viaturas.map((v, i) => [v.prefixo, i]))
  const contaVtr = base.reduce((m, o) => ({ ...m, [o.prefixo]: (m[o.prefixo] || 0) + 1 }), {})
  const prefixos = Object.keys(contaVtr).sort((a, b) => (ordemVtr[a] ?? 99) - (ordemVtr[b] ?? 99) || a.localeCompare(b))
  const lista = base.filter((o) => !vtrFiltro || o.prefixo === vtrFiltro)
  const vtrDe = (o) => viaturas.find((v) => v.id === o.viaturaId) || { prefixo: o.prefixo, modelo: o.modelo }
  // Pendências antigas, gravadas antes da separação: a categoria foi deduzida pelo texto
  const deduzidas = abertas.some((o) => !o.categoria)

  async function concluir(o) {
    try {
      if (acao.tipo === 'arquivar') {
        await api.atualizarOcorrencia(o.id, { status: 'arquivada', arquivadaPor: nomeCompleto(usuario), arquivadaEm: hoje, notaResolucao: nota })
        avisar(`Alteração da VTR ${o.prefixo} arquivada.`)
      } else {
        await api.resolverOcorrencia(o.id, { por: nomeCompleto(usuario), nota, data: hoje })
        avisar(`Pendência da VTR ${o.prefixo} resolvida.`)
      }
      setAcao(null)
      setNota('')
      recarregarOcorrencias()
    } catch (e) {
      avisar(mensagemErro(e, 'Não foi possível salvar.'))
    }
  }

  async function mover(o) {
    const nova = categoriaDe(o) === 'manutencao' ? 'outras' : 'manutencao'
    try {
      await api.atualizarOcorrencia(o.id, { categoria: nova, categoriaPor: nomeCompleto(usuario), categoriaEm: hoje })
      await recarregarOcorrencias()
      avisar(`Pendência da VTR ${o.prefixo} movida para ${CATEGORIAS[nova].nome}.`)
    } catch (e) {
      avisar(mensagemErro(e, 'Não foi possível mover.'))
    }
  }

  async function reabrir(o) {
    try {
      await api.atualizarOcorrencia(o.id, { status: 'aberta' })
      await recarregarOcorrencias()
      avisar(`Alteração da VTR ${o.prefixo} voltou para a lista.`)
    } catch (e) {
      avisar(mensagemErro(e, 'Não foi possível reabrir.'))
    }
  }

  const cartao = (o, { mostrarVtr = true } = {}) => (
    <Cartao
      key={o.id}
      o={o}
      vtr={vtrDe(o)}
      mostrarVtr={mostrarVtr}
      hoje={hoje}
      pode={pode}
      acao={acao?.id === o.id ? acao : null}
      nota={nota}
      setNota={setNota}
      iniciar={(tipo) => {
        setAcao({ id: o.id, tipo })
        setNota('')
      }}
      cancelar={() => setAcao(null)}
      concluir={() => concluir(o)}
      mover={() => mover(o)}
      reabrir={() => reabrir(o)}
    />
  )

  return (
    <>
      <Cabecalho titulo="Pendências" sub={CATEGORIAS[aba].explica} />
      <main>
        {podeExcluirRelatorio(usuario) && !ocorrencias.some((o) => o.origem === 'planilha') && (
          <ImportarPlanilha viaturas={viaturas} usuario={usuario} api={api} avisar={avisar} recarregar={recarregarOcorrencias} />
        )}
        <div className="abas-pend" role="tablist">
          {Object.entries(CATEGORIAS).map(([id, c]) => (
            <button key={id} role="tab" aria-selected={aba === id} className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
              <Icone nome={id === 'manutencao' ? 'Wrench' : 'ClipboardList'} tamanho={18} />
              {c.nome}
              <b>{id === 'manutencao' ? nManut : nOutras}</b>
            </button>
          ))}
        </div>
        <div className="botoes" style={{ marginBottom: 14 }}>
          <button className={`opcao ${!verResolvidas ? 'marcada' : ''}`} onClick={() => setVerResolvidas(false)}>
            Em aberto ({emAberto.length})
          </button>
          <button className={`opcao ${verResolvidas ? 'marcada' : ''}`} onClick={() => setVerResolvidas(true)}>
            {aba === 'outras' ? 'Encerradas' : 'Resolvidas'} ({fechadas.length})
          </button>
        </div>

        {aba === 'outras' && !verResolvidas && deduzidas && nOutras > 0 && (
          <p className="aviso-separacao">
            As pendências registradas antes da separação foram classificadas pelo texto. Se alguma estiver no lugar errado, use <b>Mover para manutenção</b>.
          </p>
        )}

        {base.length > 0 && prefixos.length > 1 && (
          <div className="filtros-pendencias">
            <span className="filtro-rotulo">Viatura</span>
            <div className="chips rolagem">
              <button className={`chip ${!vtrFiltro ? 'marcado' : ''}`} onClick={() => setVtrFiltro('')}>
                Todas <b>{base.length}</b>
              </button>
              {prefixos.map((p) => (
                <button key={p} className={`chip ${vtrFiltro === p ? 'marcado' : ''}`} onClick={() => setVtrFiltro(vtrFiltro === p ? '' : p)}>
                  {p} <b>{contaVtr[p]}</b>
                </button>
              ))}
            </div>
          </div>
        )}

        {lista.length === 0 ? (
          <div className="bloco vazio">
            {base.length
              ? 'Nenhuma pendência dessa viatura.'
              : verResolvidas
                ? 'Nada resolvido ainda.'
                : aba === 'manutencao'
                  ? 'Nenhuma manutenção pendente.'
                  : 'Nenhuma outra alteração registrada.'}
          </div>
        ) : verResolvidas ? (
          <div className="bloco">{lista.map((o) => cartao(o))}</div>
        ) : aba === 'manutencao' ? (
          Object.entries(BLOCOS).map(([id, b]) => {
            const doBloco = lista.filter((o) => blocoDe(o) === id)
            if (!doBloco.length) return null
            return (
              <section key={id} className={`bloco-manut bloco-${id}`}>
                <h2 className="secao">
                  {b.nome} <span className="conta">{doBloco.length}</span>
                </h2>
                <p className="tela-sub explica-bloco">{b.explica}</p>
                <div className="bloco">{doBloco.map((o) => cartao(o))}</div>
              </section>
            )
          })
        ) : (
          // Outras alterações: agrupadas por viatura, recolhidas
          [...new Set(lista.map((o) => o.prefixo))]
            .sort((a, b) => (ordemVtr[a] ?? 99) - (ordemVtr[b] ?? 99) || a.localeCompare(b))
            .map((p) => {
              const itens = lista.filter((o) => o.prefixo === p)
              const aberto = Boolean(vtrFiltro) || abertosVtr[p]
              return (
                <div key={p} className="bloco grupo-vtr">
                  <button className="grupo-vtr-topo" aria-expanded={aberto} onClick={() => setAbertosVtr((m) => ({ ...m, [p]: !m[p] }))}>
                    <span className="pend-vtr">
                      <FiguraVtr vtr={vtrDe(itens[0])} tamanho={44} />
                      <span className="prefixo">{p}</span>
                      <span className="modelo">
                        <ModeloVtr modelo={vtrDe(itens[0]).modelo || ''} />
                      </span>
                    </span>
                    <span className="recolher-acao">
                      {itens.length} <Icone nome={aberto ? 'ChevronUp' : 'ChevronDown'} tamanho={18} />
                    </span>
                  </button>
                  {aberto && itens.map((o) => cartao(o, { mostrarVtr: false }))}
                </div>
              )
            })
        )}
      </main>
    </>
  )
}

function Cartao({ o, vtr, mostrarVtr, hoje, pode, acao, nota, setNota, iniciar, cancelar, concluir, mover, reabrir }) {
  const dias = o.abertaEm ? -diasAte(o.abertaEm, hoje) : 0
  const manut = categoriaDe(o) === 'manutencao'
  return (
    <div className="achado pendencia">
      {mostrarVtr && (
        <span className="pend-vtr">
          <FiguraVtr vtr={vtr} tamanho={52} />
          <span className="prefixo">{o.prefixo}</span>
          <span className="modelo">
            <ModeloVtr modelo={vtr.modelo || ''} />
          </span>
        </span>
      )}
      <span className="texto">{o.auto ? o.texto : textoPendencia(o)}</span>
      <span className="meta">
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {o.status === 'resolvida' ? (
            <Selo nivel="ok">Resolvida {dataBR(o.resolvidaEm)}</Selo>
          ) : o.status === 'arquivada' ? (
            <Selo nivel="neutro">Arquivada {dataBR(o.arquivadaEm)}</Selo>
          ) : manut ? (
            <SeloNivel nivel={o.nivel} />
          ) : null}
          {o.auto ? (
            <Selo nivel="neutro">Automática</Selo>
          ) : (
            <span>
              desde {dataBR(o.abertaEm)}
              {o.status === 'aberta' && dias > 0 ? ` (${dias} ${dias === 1 ? 'dia' : 'dias'})` : ''}
            </span>
          )}
        </span>
        {o.auto && <span style={{ display: 'block', marginTop: 4 }}>{o.explica}</span>}
        {o.obs && !o.descricao && <span style={{ display: 'block', marginTop: 4 }}>{o.obs}</span>}
        {o.atualizadaEm && (
          <span style={{ display: 'block', marginTop: 4 }}>
            Atualizada em {dataBR(o.atualizadaEm)}
            {o.atualizadaPor ? ` por ${o.atualizadaPor}` : ''}
          </span>
        )}
        {o.origem === 'planilha' && <span style={{ display: 'block', marginTop: 4 }}>Importada da planilha de gestão</span>}
        {o.notaResolucao && (
          <span style={{ display: 'block', marginTop: 4 }}>
            {o.status === 'arquivada' ? 'Motivo' : 'Solução'}: {o.notaResolucao}
          </span>
        )}
        {o.status === 'aberta' &&
          !o.auto &&
          pode &&
          (acao ? (
            <span style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={acao.tipo === 'arquivar' ? 'Por que não será consertada? (opcional)' : 'O que foi feito? Ex.: pastilhas trocadas na oficina'}
                style={{ minHeight: 64 }}
              />
              <span className="botoes">
                <button className="botao secundario" onClick={cancelar}>
                  Cancelar
                </button>
                <button className="botao" onClick={concluir}>
                  {acao.tipo === 'arquivar' ? 'Arquivar' : 'Marcar como resolvida'}
                </button>
              </span>
            </span>
          ) : (
            <span className="acoes-pend">
              <button className="botao texto" onClick={() => iniciar('resolver')}>
                Resolver
              </button>
              {!manut && (
                <button className="botao texto" onClick={() => iniciar('arquivar')}>
                  Arquivar
                </button>
              )}
              <button className="botao texto mover" onClick={mover}>
                <Icone nome="ArrowLeftRight" tamanho={14} /> {manut ? 'Mover para outras alterações' : 'Mover para manutenção'}
              </button>
            </span>
          ))}
        {o.status === 'arquivada' && pode && (
          <span className="acoes-pend">
            <button className="botao texto" onClick={reabrir}>
              Voltar para a lista
            </button>
          </span>
        )}
      </span>
    </div>
  )
}

// Importa o "Detalhamento atualizado" da planilha de gestão (19/10/2026) como pendências abertas, uma única vez
function ImportarPlanilha({ viaturas, usuario, api, avisar, recarregar }) {
  const [aberto, setAberto] = useState(false)
  const [importando, setImportando] = useState(false)
  const { lista, semVtr } = pendenciasDaPlanilha(viaturas, `${nomeCompleto(usuario)} (importado da planilha)`)
  const porVtr = lista.reduce((m, o) => ({ ...m, [o.prefixo]: [...(m[o.prefixo] || []), o] }), {})

  async function importar() {
    setImportando(true)
    try {
      await api.criarOcorrencias(lista.map((o) => ({ ...o, categoria: categoriaDe(o) })))
      await recarregar()
      avisar(`${lista.length} pendências importadas da planilha.`)
    } catch (e) {
      avisar(mensagemErro(e, 'Não foi possível importar.'))
    } finally {
      setImportando(false)
    }
  }

  if (!lista.length) return null
  return (
    <div className="bloco pad importar-planilha">
      <strong>Detalhamento da planilha</strong>
      <p className="tela-sub" style={{ margin: '4px 0 8px', fontSize: 14 }}>
        Traz o <em>Detalhamento atualizado</em> da planilha de gestão (conferência de {dataBR(DATA_PLANILHA)}) como pendências abertas: {lista.length} itens
        de {Object.keys(porVtr).length} VTR. A planilha não é alterada.
      </p>
      {aberto ? (
        <>
          {Object.entries(porVtr).map(([pref, itens]) => (
            <div key={pref} className="importar-vtr">
              <span className="prefixo">{pref}</span>
              <ol>
                {itens.map((o) => (
                  <li key={o.itemId}>
                    {o.descricao} <small>({dataBR(o.abertaEm)})</small>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {semVtr.length > 0 && (
            <p className="tela-sub" style={{ fontSize: 13 }}>
              Ficam de fora as VTR que ainda não estão no app: {semVtr.join(', ')}.
            </p>
          )}
          <div className="botoes">
            <button className="botao" onClick={importar} disabled={importando}>
              {importando ? 'Importando…' : `Importar ${lista.length} pendências`}
            </button>
            <button className="botao secundario" onClick={() => setAberto(false)} disabled={importando}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button className="botao secundario" onClick={() => setAberto(true)}>
          Ver e importar
        </button>
      )}
    </div>
  )
}
