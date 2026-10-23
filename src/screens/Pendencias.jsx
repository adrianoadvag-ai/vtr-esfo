import { useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Selo, SeloNivel } from '../components/base'
import { NIVEIS, podeGerirViaturas } from '../config'
import { dataBR, diasAte, nomeCompleto } from '../lib/formato'

export default function Pendencias() {
  const { ocorrencias, usuario, api, hoje, recarregarOcorrencias, avisar } = useApp()
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
                  <span className="texto">{o.texto}</span>
                  <span className="meta">
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {o.status === 'aberta' ? <SeloNivel nivel={o.nivel} /> : <Selo nivel="ok">Resolvida {dataBR(o.resolvidaEm)}</Selo>}
                      <span>
                        desde {dataBR(o.abertaEm)}
                        {o.status === 'aberta' && dias > 0 ? ` (${dias} ${dias === 1 ? 'dia' : 'dias'})` : ''}
                      </span>
                    </span>
                    {o.obs && <span style={{ display: 'block', marginTop: 4 }}>{o.obs}</span>}
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
