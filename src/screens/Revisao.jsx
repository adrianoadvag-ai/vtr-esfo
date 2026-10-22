import { useEffect, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, SeloNivel, useCarregar } from '../components/base'
import { NIVEIS } from '../config'
import { dataExtensa, nomeCompleto } from '../lib/formato'
import { ocorrenciasDoDia } from '../lib/ocorrencias'
import { avaliar, exigida, montarRelatorio } from '../lib/vistoria'

export default function Revisao() {
  const { viaturas, vistoria, hoje, ir, api, usuario, ocorrencias, avisar, recarregarViaturas, recarregarOcorrencias } = useApp()
  const registros = vistoria?.registros || {}
  const eu = nomeCompleto(usuario)
  const [responsaveis, setResponsaveis] = useState(vistoria?.responsaveis?.length ? vistoria.responsaveis : [eu])
  const [limpeza, setLimpeza] = useState(vistoria?.limpeza || { ok: true, obs: '' })
  const [verTexto, setVerTexto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const { dados: usuarios } = useCarregar(() => api.listarUsuarios(), [])

  const enviada = vistoria?.status === 'enviada'
  useEffect(() => {
    if (enviada && !enviando) ir(`relatorio/${hoje}`)
  }, [enviada, enviando, ir, hoje])
  if (enviada) return null

  const lista = viaturas.filter((v) => exigida(v) || registros[v.id])
  const faltando = lista.filter((v) => exigida(v) && !avaliar(v, registros[v.id], hoje).completo)
  const achados = lista
    .flatMap((v) => avaliar(v, registros[v.id], hoje).achados.map((x) => ({ ...x, v })))
    .sort((a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem)
  const abertas = ocorrencias.filter((o) => o.status === 'aberta')
  const pronto = faltando.length === 0 && responsaveis.length > 0 && (limpeza.ok || limpeza.obs?.trim())

  const texto = montarRelatorio({ data: hoje, viaturas, registros, limpeza, responsaveis, pendenciasAbertas: abertas })

  const nomes = Array.from(new Set([eu, ...(usuarios || []).filter((u) => u.perfil !== 'pendente').map(nomeCompleto)]))
  const alternar = (n) => setResponsaveis((r) => (r.includes(n) ? r.filter((x) => x !== n) : [...r, n]))

  async function enviar() {
    setEnviando(true)
    try {
      const kms = Object.fromEntries(
        Object.entries(registros)
          .filter(([, r]) => !r.naoVistoriada && r.km)
          .map(([id, r]) => [id, Number(r.km)]),
      )
      const novasOcorrencias = ocorrenciasDoDia({ data: hoje, viaturas: lista, registros, abertas, por: eu })
      await api.enviarVistoria(hoje, { relatorio: texto, responsaveis, limpeza, kms, novasOcorrencias, por: eu, viaturas })
      recarregarViaturas()
      recarregarOcorrencias()
      avisar('Relatório enviado. Agora é só copiar para o WhatsApp.')
      ir(`relatorio/${hoje}`)
    } catch (e) {
      avisar(e.message || 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Cabecalho titulo="Revisar e enviar" sub={dataExtensa(hoje)} voltar={() => ir('hoje')} />
      <main>
        {faltando.length > 0 && (
          <div className="bloco pad" style={{ marginBottom: 16, borderColor: 'var(--atencao)' }}>
            <strong>Ainda faltam {faltando.length} viaturas:</strong>{' '}
            {faltando.map((v, i) => (
              <span key={v.id}>
                {i > 0 && ', '}
                <button className="botao texto" style={{ minHeight: 0, padding: 0 }} onClick={() => ir(`vistoria/${v.id}`)}>
                  {v.prefixo}
                </button>
              </span>
            ))}
          </div>
        )}

        <h2 className="secao" style={{ marginTop: 0 }}>
          {achados.length ? `Alterações (${achados.length})` : 'Nenhuma alteração hoje'}
        </h2>
        {achados.length > 0 && (
          <div className="bloco">
            {achados.map((x, i) => (
              <button
                key={i}
                className="achado"
                style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderTop: i ? '1px solid var(--linha)' : 0 }}
                onClick={() => ir(`vistoria/${x.v.id}`)}
              >
                <span className="prefixo">{x.v.prefixo}</span>
                <span className="texto">{x.texto}</span>
                <span className="meta">
                  <SeloNivel nivel={x.nivel} />
                </span>
              </button>
            ))}
          </div>
        )}

        <h2 className="secao">Limpeza geral</h2>
        <div className="bloco">
          <div className="item">
            <div className="linha">
              <div className="icone-item">
                <Icone nome="Sparkles" />
              </div>
              <div className="rotulo">Limpeza dentro do padrão</div>
              <button
                className={`redondo alerta ${limpeza.ok === false ? 'marcado' : ''}`}
                onClick={() => setLimpeza({ ...limpeza, ok: false })}
                aria-pressed={limpeza.ok === false}
                aria-label="Necessita limpeza"
              >
                <Icone nome="TriangleAlert" />
              </button>
              <button
                className={`redondo tique ${limpeza.ok ? 'marcado' : ''}`}
                onClick={() => setLimpeza({ ok: true, obs: '' })}
                aria-pressed={limpeza.ok}
                aria-label="Limpeza dentro do padrão"
              >
                <Icone nome="Check" tamanho={24} strokeWidth={3} />
              </button>
            </div>
          </div>
          {limpeza.ok === false && (
            <div className="obs exigida" style={{ borderTop: '1px solid var(--linha)' }}>
              <label htmlFor="limpeza">O que precisa de limpeza?</label>
              <textarea id="limpeza" value={limpeza.obs} onChange={(e) => setLimpeza({ ok: false, obs: e.target.value })} />
            </div>
          )}
        </div>

        <h2 className="secao">Responsáveis do dia</h2>
        <div className="chips">
          {nomes.map((n) => (
            <button key={n} className={`opcao ${responsaveis.includes(n) ? 'marcada' : ''}`} onClick={() => alternar(n)}>
              {n}
            </button>
          ))}
        </div>

        <h2 className="secao">Relatório</h2>
        <div className="bloco">
          {verTexto ? (
            <pre className="relatorio-texto">{texto}</pre>
          ) : (
            <button className="botao texto cheio" onClick={() => setVerTexto(true)}>
              Ver o texto que será gerado
            </button>
          )}
        </div>
      </main>

      <div className="rodape-fixo">
        <button className="botao cheio" disabled={!pronto || enviando} onClick={enviar}>
          <Icone nome="Send" /> {enviando ? 'Enviando…' : 'Enviar relatório'}
        </button>
      </div>
    </>
  )
}
