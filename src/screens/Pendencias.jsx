import { useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Selo, SeloNivel } from '../components/base'
import { NIVEIS, podeExcluirRelatorio, podeGerirViaturas } from '../config'
import { dataBR, diasAte, mensagemErro, nomeCompleto } from '../lib/formato'
import { DATA_PLANILHA, pendenciasDaPlanilha } from '../data/detalhamento-planilha'
import { textoPendencia } from '../lib/pendencia'

export default function Pendencias() {
  const { ocorrencias, usuario, api, hoje, recarregarOcorrencias, avisar, viaturas } = useApp()
  const [verResolvidas, setVerResolvidas] = useState(false)
  const [resolvendo, setResolvendo] = useState(null)
  const [nota, setNota] = useState('')

  const abertas = ocorrencias
    .filter((o) => o.status === 'aberta')
    .sort((a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem || a.abertaEm.localeCompare(b.abertaEm))
  const resolvidas = ocorrencias.filter((o) => o.status === 'resolvida')
  const lista = verResolvidas ? resolvidas : abertas

  async function resolver(o) {
    await api.resolverOcorrencia(o.id, { por: nomeCompleto(usuario), nota, data: hoje })
    setResolvendo(null)
    setNota('')
    recarregarOcorrencias()
    avisar(`Pendência da VTR ${o.prefixo} resolvida.`)
  }

  return (
    <>
      <Cabecalho titulo="Pendências" sub="Alterações que continuam até alguém resolver" />
      <main>
        {podeExcluirRelatorio(usuario) && !ocorrencias.some((o) => o.origem === 'planilha') && (
          <ImportarPlanilha viaturas={viaturas} usuario={usuario} api={api} avisar={avisar} recarregar={recarregarOcorrencias} />
        )}
        <div className="botoes" style={{ marginBottom: 16 }}>
          <button className={`opcao ${!verResolvidas ? 'marcada' : ''}`} onClick={() => setVerResolvidas(false)}>
            Em aberto ({abertas.length})
          </button>
          <button className={`opcao ${verResolvidas ? 'marcada' : ''}`} onClick={() => setVerResolvidas(true)}>
            Resolvidas ({resolvidas.length})
          </button>
        </div>
        {lista.length === 0 ? (
          <div className="bloco vazio">{verResolvidas ? 'Nenhuma pendência resolvida ainda.' : 'Nenhuma pendência em aberto.'}</div>
        ) : (
          <div className="bloco">
            {lista.map((o) => {
              const dias = -diasAte(o.abertaEm, hoje)
              return (
                <div className="achado" key={o.id}>
                  <span className="prefixo">{o.prefixo}</span>
                  <span className="texto">{textoPendencia(o)}</span>
                  <span className="meta">
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {o.status === 'aberta' ? <SeloNivel nivel={o.nivel} /> : <Selo nivel="ok">Resolvida {dataBR(o.resolvidaEm)}</Selo>}
                      <span>
                        desde {dataBR(o.abertaEm)}
                        {o.status === 'aberta' && dias > 0 ? ` (${dias} ${dias === 1 ? 'dia' : 'dias'})` : ''}
                      </span>
                    </span>
                    {o.obs && !o.descricao && <span style={{ display: 'block', marginTop: 4 }}>{o.obs}</span>}
                    {o.atualizadaEm && (
                      <span style={{ display: 'block', marginTop: 4 }}>
                        Atualizada em {dataBR(o.atualizadaEm)}
                        {o.atualizadaPor ? ` por ${o.atualizadaPor}` : ''}
                      </span>
                    )}
                    {o.origem === 'planilha' && <span style={{ display: 'block', marginTop: 4 }}>Importada da planilha de gestão</span>}
                    {o.notaResolucao && <span style={{ display: 'block', marginTop: 4 }}>Solução: {o.notaResolucao}</span>}
                    {o.status === 'aberta' &&
                      podeGerirViaturas(usuario) &&
                      (resolvendo === o.id ? (
                        <span style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                          <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            placeholder="O que foi feito? Ex.: pastilhas trocadas na oficina"
                            style={{ minHeight: 64 }}
                          />
                          <span className="botoes">
                            <button className="botao secundario" onClick={() => setResolvendo(null)}>
                              Cancelar
                            </button>
                            <button className="botao" onClick={() => resolver(o)}>
                              Marcar como resolvida
                            </button>
                          </span>
                        </span>
                      ) : (
                        <button className="botao texto" style={{ padding: 0, marginTop: 4 }} onClick={() => setResolvendo(o.id)}>
                          Resolver
                        </button>
                      ))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
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
      await api.criarOcorrencias(lista)
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
