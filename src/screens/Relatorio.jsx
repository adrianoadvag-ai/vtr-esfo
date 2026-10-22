import { useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, SeloNivel, brasaoApmg, brasaoEsfo, useCarregar } from '../components/base'
import { dataExtensa, horaCurta } from '../lib/formato'
import { estruturar, gerarPdf } from '../lib/relatorio'

export default function Relatorio({ data: id }) {
  const { api, ir, avisar, enviadasHoje } = useApp()
  const { dados: vistorias, carregando } = useCarregar(() => api.listarVistorias(), [id, enviadasHoje.length])
  const doc = enviadasHoje.find((v) => v.id === id) || vistorias?.find((v) => v.id === id)
  const [verTexto, setVerTexto] = useState(false)
  const [gerando, setGerando] = useState(false)

  const nomeArquivo = doc ? `relatorio-viaturas-${doc.id}.pdf` : ''
  const podeCompartilharArquivo =
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] })

  async function copiar() {
    try {
      await navigator.clipboard.writeText(doc.relatorio)
      avisar('Texto copiado. Cole no grupo do WhatsApp.')
    } catch {
      setVerTexto(true)
      avisar('Não foi possível copiar. Toque e segure o texto para copiar.')
    }
  }

  async function pdf() {
    setGerando(true)
    try {
      return await gerarPdf({
        texto: doc.relatorio,
        data: doc.data,
        enviadaEm: doc.enviadaEm,
        enviadaPor: doc.enviadaPor,
        brasoes: [brasaoApmg, brasaoEsfo],
        nomeArquivo,
      })
    } finally {
      setGerando(false)
    }
  }

  async function baixar() {
    try {
      const { blob, nome } = await pdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      avisar('PDF baixado.')
    } catch {
      avisar('Não foi possível gerar o PDF.')
    }
  }

  async function compartilhar() {
    try {
      const { blob, nome } = await pdf()
      await navigator.share({ files: [new File([blob], nome, { type: 'application/pdf' })], title: 'Relatório de viaturas' })
    } catch (e) {
      if (e?.name !== 'AbortError') avisar('Não foi possível compartilhar o PDF.')
    }
  }

  const r = doc ? estruturar(doc.relatorio) : null

  return (
    <>
      <Cabecalho titulo="Relatório" sub={doc ? `${dataExtensa(doc.data)} · ${horaCurta(doc.enviadaEm)}` : ''} voltar={() => ir('historico')} />
      <main>
        {!doc ? (
          <div className="vazio">{carregando ? 'Carregando…' : 'Relatório não encontrado.'}</div>
        ) : (
          <>
            <p className="tela-sub">Enviado por {doc.enviadaPor}</p>

            <div className="botoes" style={{ marginBottom: 8 }}>
              <button className="botao" onClick={copiar}>
                <Icone nome="Copy" /> Copiar texto
              </button>
              <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(doc.relatorio)}`} target="_blank" rel="noreferrer">
                <Icone nome="MessageCircle" /> WhatsApp
              </a>
            </div>
            <div className="botoes" style={{ marginBottom: 16 }}>
              <button className="botao secundario" onClick={baixar} disabled={gerando}>
                <Icone nome="FileDown" /> {gerando ? 'Gerando…' : 'Baixar PDF'}
              </button>
              {podeCompartilharArquivo && (
                <button className="botao secundario" onClick={compartilhar} disabled={gerando}>
                  <Icone nome="Share2" /> Enviar PDF
                </button>
              )}
            </div>

            <div className="botoes" style={{ marginBottom: 12 }}>
              <button className={`opcao ${!verTexto ? 'marcada' : ''}`} onClick={() => setVerTexto(false)}>
                Relatório
              </button>
              <button className={`opcao ${verTexto ? 'marcada' : ''}`} onClick={() => setVerTexto(true)}>
                Texto do WhatsApp
              </button>
            </div>

            {verTexto ? (
              <div className="bloco">
                <pre className="relatorio-texto">{doc.relatorio}</pre>
              </div>
            ) : (
              <Formatado r={r} />
            )}
          </>
        )}
      </main>
    </>
  )
}

function Formatado({ r }) {
  return (
    <>
      {r.alteracoes.length > 0 && (
        <>
          <h2 className="secao" style={{ marginTop: 0 }}>
            Alterações ({r.alteracoes.length})
          </h2>
          <div className="bloco">
            {r.alteracoes.map((x, i) => (
              <div className="achado" key={i} style={{ gridTemplateColumns: '1fr' }}>
                <span className="texto">{x.texto}</span>
                <span className="meta" style={{ gridColumn: 1 }}>
                  <SeloNivel nivel={x.nivel === 'info' ? null : x.nivel} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {r.pendencias.length > 0 && (
        <>
          <h2 className="secao">Pendências em aberto ({r.pendencias.length})</h2>
          <div className="bloco">
            {r.pendencias.map((p, i) => (
              <div className="achado" key={i} style={{ gridTemplateColumns: '1fr' }}>
                <span className="texto">{p}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="secao" style={r.alteracoes.length || r.pendencias.length ? {} : { marginTop: 0 }}>
        Viaturas ({r.vtrs.length})
      </h2>
      {r.vtrs.map((v) => (
        <div className="bloco ficha" key={`${v.numero}-${v.prefixo}`}>
          <div className="ficha-topo">
            <span className="prefixo">{v.prefixo}</span>
            <span className="modelo">{v.modelo}</span>
          </div>
          <dl className="ficha-dados">
            {v.linhas
              .filter((x) => x.rotulo !== 'Obs')
              .map((x, i) => (
                <div key={i} className={x.destaque ? 'destaque' : ''}>
                  <dt>{x.rotulo}</dt>
                  <dd>{x.valor}</dd>
                </div>
              ))}
          </dl>
          {v.linhas
            .filter((x) => x.rotulo === 'Obs')
            .map((x, i) => (
              <p className="ficha-obs" key={i}>
                {x.valor}
              </p>
            ))}
        </div>
      ))}

      <div className="bloco pad" style={{ marginTop: 12 }}>
        <div>
          <strong>Limpeza:</strong> {r.limpeza}
        </div>
        {r.responsaveis.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <strong>Responsável do dia:</strong>
            {r.responsaveis.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
