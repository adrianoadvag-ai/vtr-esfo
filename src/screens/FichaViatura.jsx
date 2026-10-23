import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo, SeloNivel, useCarregar } from '../components/base'
import { SITUACOES, podeGerirViaturas } from '../config'
import { combustivelTexto, dataBR, dataCurta, km, mensagemErro } from '../lib/formato'
import { leiturasDa, recorrencias, serieKm, trocasDa } from '../lib/frota'
import { trocaDeOleo } from '../lib/vistoria'

// Ficha de uma viatura: situação, KM ao longo do tempo, alterações que se repetem, pendências e trocas de óleo
export default function FichaViatura({ id }) {
  const { viaturas, ocorrencias, usuario, api, hoje, ir, avisar, recarregarViaturas, enviadasHoje } = useApp()
  const vtr = viaturas.find((v) => v.id === id)
  const gestor = podeGerirViaturas(usuario)
  const { dados: vistorias, carregando } = useCarregar(() => api.listarVistorias(), [enviadasHoje.length])
  const [verTodas, setVerTodas] = useState(false)
  const [mudando, setMudando] = useState(false)

  const leituras = useMemo(() => (vtr && vistorias ? leiturasDa(vtr, vistorias) : []), [vtr, vistorias])
  const recorrentes = useMemo(() => recorrencias(leituras), [leituras])
  const serie = useMemo(() => serieKm(leituras), [leituras])

  if (!vtr) {
    return (
      <>
        <Cabecalho titulo="Viatura" voltar={() => ir('viaturas')} />
        <main>
          <div className="bloco vazio">Viatura não encontrada.</div>
        </main>
      </>
    )
  }

  const situacao = vtr.situacao || 'ativa'
  const troca = trocaDeOleo(vtr, null, hoje)
  const pend = ocorrencias.filter((o) => o.viaturaId === vtr.id)
  const abertas = pend.filter((o) => o.status === 'aberta')
  const resolvidas = pend.filter((o) => o.status === 'resolvida').sort((a, b) => (b.resolvidaEm || '').localeCompare(a.resolvidaEm || ''))
  const trocas = trocasDa(vtr)
  const recentes = [...leituras].reverse()
  const mostradas = verTodas ? recentes : recentes.slice(0, 8)
  const ultima = recentes[0]

  async function mudarSituacao(nova) {
    if (nova === situacao || mudando) return
    setMudando(true)
    try {
      await api.salvarViatura({ ...vtr, situacao: nova })
      await recarregarViaturas()
      avisar(`VTR ${vtr.prefixo}: ${SITUACOES[nova].toLowerCase()}.`)
    } catch (e) {
      avisar(mensagemErro(e, 'Não foi possível mudar a situação.'))
    } finally {
      setMudando(false)
    }
  }

  return (
    <>
      <Cabecalho
        titulo={`VTR ${vtr.prefixo}`}
        sub={vtr.modelo}
        voltar={() => ir('viaturas')}
        acao={
          gestor && (
            <button className="acao" onClick={() => ir(`viatura/${vtr.id}`)} aria-label="Editar viatura">
              <Icone nome="Pencil" tamanho={22} />
            </button>
          )
        }
      />
      <main>
        <div className="bloco pad">
          <dl className="ficha-dados">
            <div>
              <dt>KM atual</dt>
              <dd className="num-grande">{km(vtr.kmAtual) || '—'}</dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>
                <Selo nivel={situacao === 'ativa' ? 'ok' : situacao === 'manutencao' ? 'atencao' : 'neutro'}>{SITUACOES[situacao]}</Selo>
              </dd>
            </div>
            <div className={troca.alerta ? 'destaque' : ''}>
              <dt>Troca de óleo</dt>
              <dd>{troca.texto}</dd>
            </div>
            <div>
              <dt>Última vistoria</dt>
              <dd>{ultima ? `${dataBR(ultima.data)}${ultima.comb != null ? ` · ${combustivelTexto(ultima.comb)}` : ''}` : vtr.ultimaVistoria ? dataBR(vtr.ultimaVistoria) : '—'}</dd>
            </div>
          </dl>
        </div>

        {gestor && (
          <>
            <h2 className="secao">Mudar situação</h2>
            <div className="botoes">
              {Object.entries(SITUACOES).map(([k, n]) => (
                <button key={k} className={`opcao ${situacao === k ? 'marcada' : ''}`} onClick={() => mudarSituacao(k)} disabled={mudando} aria-pressed={situacao === k}>
                  {n}
                </button>
              ))}
            </div>
            <p className="tela-sub" style={{ margin: '8px 0 0' }}>
              Em manutenção ou baixada, a VTR deixa de ser exigida na vistoria do dia.
            </p>
          </>
        )}

        <h2 className="secao">KM nas vistorias</h2>
        <div className="bloco pad">
          {carregando && !vistorias ? (
            <div className="vazio" style={{ padding: 8 }}>Carregando…</div>
          ) : serie.length < 2 ? (
            <div className="tela-sub" style={{ margin: 0 }}>
              {serie.length ? `Uma leitura até agora: ${km(serie[0].km)} km em ${dataBR(serie[0].data)}.` : 'Ainda não há relatórios com esta viatura.'}
            </div>
          ) : (
            <GraficoKm serie={serie} />
          )}
        </div>

        <h2 className="secao">Alterações que se repetem</h2>
        {recorrentes.length === 0 ? (
          <div className="bloco vazio">Nenhuma alteração registrada nos relatórios.</div>
        ) : (
          <div className="bloco">
            {recorrentes.map((r) => (
              <div className="achado" key={r.itemId}>
                <span className="prefixo">{r.vezes}×</span>
                <span className="texto">
                  {r.item}
                  <span className="detalhe-linha">{r.textos.join(', ')}</span>
                </span>
                <span className="meta">
                  <SeloNivel nivel={r.nivel} /> última em {dataBR(r.ultima)}
                </span>
              </div>
            ))}
          </div>
        )}

        <h2 className="secao">Pendências</h2>
        {pend.length === 0 ? (
          <div className="bloco vazio">Nenhuma pendência desta viatura.</div>
        ) : (
          <div className="bloco">
            {[...abertas, ...resolvidas.slice(0, 5)].map((o) => (
              <div className="achado" key={o.id} style={{ gridTemplateColumns: '1fr' }}>
                <span className="texto">{o.texto}</span>
                <span className="meta" style={{ gridColumn: 1 }}>
                  {o.status === 'aberta' ? <SeloNivel nivel={o.nivel} /> : <Selo nivel="ok">Resolvida {dataBR(o.resolvidaEm)}</Selo>} aberta em{' '}
                  {dataBR(o.abertaEm)}
                  {o.notaResolucao && <span style={{ display: 'block', marginTop: 4 }}>Solução: {o.notaResolucao}</span>}
                </span>
              </div>
            ))}
            {resolvidas.length > 5 && (
              <button className="botao texto cheio" onClick={() => ir('pendencias')}>
                Ver todas na aba Pendências
              </button>
            )}
          </div>
        )}

        <h2 className="secao">Trocas de óleo</h2>
        {trocas.length === 0 ? (
          <div className="bloco vazio">{vtr.nova ? 'VTR nova, ainda sem troca.' : 'Nenhuma troca registrada.'}</div>
        ) : (
          <ul className="bloco vtr-lista">
            {trocas.map((t, i) => (
              <li key={i} className="linha-simples">
                <span>{dataBR(t.data)}</span>
                <span className="detalhe">{[t.km && `${km(t.km)} km`, t.por].filter(Boolean).join(' · ') || 'registrada no cadastro'}</span>
              </li>
            ))}
          </ul>
        )}

        <h2 className="secao">Vistorias ({leituras.length})</h2>
        {recentes.length === 0 ? (
          <div className="bloco vazio">{carregando ? 'Carregando…' : 'Ainda não há relatórios com esta viatura.'}</div>
        ) : (
          <ul className="bloco vtr-lista">
            {mostradas.map((l) => (
              <li key={`${l.relatorioId}`}>
                <button className="vtr-linha" style={{ gridTemplateColumns: '1fr auto' }} onClick={() => ir(`relatorio/${l.relatorioId}`)}>
                  <span>
                    <span className="modelo">
                      {dataCurta(l.data)}
                      {l.km ? ` · ${km(l.km)} km` : ''}
                    </span>
                    <span className="detalhe" style={{ display: 'block' }}>
                      {l.naoVistoriada ? `Não vistoriada: ${l.motivo}` : l.achados.length ? l.achados.map((x) => x.texto).join('; ') : 'Sem alteração'}
                      {l.por ? ` · ${l.por}` : ''}
                    </span>
                  </span>
                  {l.naoVistoriada ? <Selo nivel="neutro">Não vistoriada</Selo> : l.achados.length ? <Selo nivel="atencao">{l.achados.length}</Selo> : <Selo nivel="ok">S/A</Selo>}
                </button>
              </li>
            ))}
            {recentes.length > mostradas.length && (
              <li>
                <button className="botao texto cheio" onClick={() => setVerTodas(true)}>
                  Ver todas ({recentes.length})
                </button>
              </li>
            )}
          </ul>
        )}
      </main>
    </>
  )
}

// Linha simples do KM por dia. Toque num ponto para ver o valor.
function GraficoKm({ serie }) {
  const [sel, setSel] = useState(serie.length - 1)
  const W = 340
  const H = 150
  const m = { t: 14, r: 12, b: 24, l: 12 }
  const min = Math.min(...serie.map((p) => p.km))
  const max = Math.max(...serie.map((p) => p.km))
  const faixa = max - min || 1
  const x = (i) => m.l + (i * (W - m.l - m.r)) / (serie.length - 1)
  const y = (v) => m.t + (1 - (v - min) / faixa) * (H - m.t - m.b)
  const caminho = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.km).toFixed(1)}`).join(' ')
  const p = serie[sel]
  const rodado = max - min

  return (
    <figure className="grafico-km">
      <figcaption>
        <strong>{km(p.km)} km</strong> em {dataBR(p.data)}
        <span>
          {km(rodado)} km rodados de {dataBR(serie[0].data)} a {dataBR(serie.at(-1).data)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`KM de ${km(min)} a ${km(max)} entre ${dataBR(serie[0].data)} e ${dataBR(serie.at(-1).data)}`}>
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="eixo" />
        <path d={caminho} className="linha" />
        <line x1={x(sel)} x2={x(sel)} y1={m.t} y2={H - m.b} className="guia" />
        {serie.map((pt, i) => (
          <g key={pt.data} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)} style={{ cursor: 'pointer' }}>
            <rect x={x(i) - 12} y={0} width={24} height={H} fill="transparent" />
            <circle cx={x(i)} cy={y(pt.km)} r={i === sel ? 5 : 3.5} className={i === sel ? 'ponto sel' : 'ponto'} />
          </g>
        ))}
        <text x={m.l} y={H - 6} className="rotulo-eixo">
          {dataCurta(serie[0].data)}
        </text>
        <text x={W - m.r} y={H - 6} className="rotulo-eixo" textAnchor="end">
          {dataCurta(serie.at(-1).data)}
        </text>
      </svg>
    </figure>
  )
}
