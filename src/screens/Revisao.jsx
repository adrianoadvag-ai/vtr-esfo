import { useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, SeloNivel, useCarregar } from '../components/base'
import { NIVEIS } from '../config'
import { dataExtensa, nomeCompleto } from '../lib/formato'
import { ocorrenciasDoDia } from '../lib/ocorrencias'
import { avaliar, exigida, idRodada, montarRelatorio } from '../lib/vistoria'

export default function Revisao() {
  const { viaturas, vistoria, hoje, ir, api, usuario, ocorrencias, avisar, recarregarViaturas, recarregarOcorrencias } = useApp()
  const registros = vistoria?.registros || {}
  const eu = nomeCompleto(usuario)
  const [responsaveis, setResponsaveis] = useState(vistoria?.responsaveis?.length ? vistoria.responsaveis : [eu])
  const [limpeza, setLimpeza] = useState(vistoria?.limpeza || { ok: true, obs: '' })
  const [verTexto, setVerTexto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fora, setFora] = useState([]) // concluídas que o usuário tirou deste relatório
  const { dados: usuarios } = useCarregar(() => api.listarUsuarios(), [])

  const comRegistro = viaturas.filter((v) => registros[v.id])
  const concluidas = comRegistro.filter((v) => avaliar(v, registros[v.id], hoje).completo)
  const incompletas = comRegistro.filter((v) => !concluidas.includes(v))
  const incluidas = concluidas.filter((v) => !fora.includes(v.id))
  const regsIncluidos = Object.fromEntries(incluidas.map((v) => [v.id, registros[v.id]]))
  const achados = incluidas
    .flatMap((v) => avaliar(v, registros[v.id], hoje).achados.map((x) => ({ ...x, v })))
    .sort((a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem)
  const idsIncluidos = new Set(incluidas.map((v) => v.id))
  const abertas = ocorrencias.filter((o) => o.status === 'aberta')
  const abertasDestas = abertas.filter((o) => idsIncluidos.has(o.viaturaId))
  const pronto = incluidas.length > 0 && responsaveis.length > 0 && (limpeza.ok || limpeza.obs?.trim())

  const texto = montarRelatorio({
    data: hoje,
    viaturas: incluidas,
    registros: regsIncluidos,
    limpeza,
    responsaveis,
    pendenciasAbertas: abertasDestas,
    totalFrota: viaturas.filter(exigida).length,
  })

  const nomes = Array.from(new Set([eu, ...(usuarios || []).filter((u) => u.perfil !== 'pendente').map(nomeCompleto)]))
  const alternar = (n) => setResponsaveis((r) => (r.includes(n) ? r.filter((x) => x !== n) : [...r, n]))
  const alternarVtr = (id) => setFora((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  async function enviar() {
    setEnviando(true)
    try {
      const kms = Object.fromEntries(
        incluidas.filter((v) => !registros[v.id].naoVistoriada && registros[v.id].km).map((v) => [v.id, Number(registros[v.id].km)]),
      )
      const novasOcorrencias = ocorrenciasDoDia({ data: hoje, viaturas: incluidas, registros: regsIncluidos, abertas, por: eu })
      // Incompletas e as que ficaram de fora seguem para a próxima rodada do dia
      const restantes = Object.fromEntries(Object.entries(registros).filter(([id]) => !idsIncluidos.has(id)))
      const seq = (vistoria.seq || 1) + 1
      await api.enviarVistoria(vistoria.id, hoje, {
        relatorio: texto,
        responsaveis,
        limpeza,
        kms,
        novasOcorrencias,
        por: eu,
        viaturas,
        incluidas: [...idsIncluidos],
        restantes,
        proxima: { id: idRodada(hoje, seq), seq },
      })
      recarregarViaturas()
      recarregarOcorrencias()
      avisar('Relatório enviado. Copie para o WhatsApp ou baixe o PDF.')
      ir(`relatorio/${vistoria.id}`)
    } catch (e) {
      avisar(e.message || 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  if (concluidas.length === 0) {
    return (
      <>
        <Cabecalho titulo="Revisar e enviar" sub={dataExtensa(hoje)} voltar={() => ir('hoje')} />
        <main>
          <div className="bloco vazio">
            <p>Nenhuma viatura concluída nesta rodada. Conclua a vistoria de ao menos uma para gerar o relatório.</p>
            <button className="botao" onClick={() => ir('hoje')}>
              Voltar para as viaturas
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo="Revisar e enviar" sub={dataExtensa(hoje)} voltar={() => ir('hoje')} />
      <main>
        <h2 className="secao" style={{ marginTop: 0 }}>
          Viaturas neste relatório ({incluidas.length})
        </h2>
        <p className="tela-sub" style={{ margin: '0 0 10px' }}>
          Toque para tirar ou incluir. As que ficarem de fora continuam salvas para o próximo relatório de hoje.
        </p>
        <div className="chips">
          {concluidas.map((v) => (
            <button
              key={v.id}
              className={`opcao ${fora.includes(v.id) ? '' : 'marcada'}`}
              onClick={() => alternarVtr(v.id)}
              aria-pressed={!fora.includes(v.id)}
            >
              {v.prefixo} · {v.modelo.split('/').at(-1)}
            </button>
          ))}
        </div>
        {incompletas.length > 0 && (
          <p className="tela-sub" style={{ margin: '10px 0 0' }}>
            Incompletas, ficam para depois:{' '}
            {incompletas.map((v, i) => (
              <span key={v.id}>
                {i > 0 && ', '}
                <button className="botao texto" style={{ minHeight: 0, padding: 0 }} onClick={() => ir(`vistoria/${v.id}`)}>
                  {v.prefixo}
                </button>
              </span>
            ))}
          </p>
        )}

        <h2 className="secao">
          {achados.length ? `Alterações (${achados.length})` : 'Nenhuma alteração nestas viaturas'}
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
