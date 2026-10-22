import { useApp } from '../App'
import { Cabecalho, Icone, brasaoApmg, brasaoEsfo, useCarregar } from '../components/base'
import { dataExtensa, horaCurta } from '../lib/formato'

export default function Relatorio({ data }) {
  const { api, ir, avisar, vistoria, hoje } = useApp()
  const { dados: vistorias, carregando } = useCarregar(() => api.listarVistorias(), [data, vistoria?.status])
  const doc = data === hoje && vistoria?.status === 'enviada' ? vistoria : vistorias?.find((v) => v.data === data)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(doc.relatorio)
      avisar('Texto copiado. Cole no grupo do WhatsApp.')
    } catch {
      avisar('Não foi possível copiar. Toque e segure o texto para copiar.')
    }
  }
  async function compartilhar() {
    try {
      await navigator.share({ text: doc.relatorio })
    } catch {
      // cancelado pelo usuário
    }
  }

  return (
    <>
      <Cabecalho titulo="Relatório" sub={dataExtensa(data)} voltar={() => ir('historico')} />
      <main>
        {!doc ? (
          <div className="vazio">{carregando ? 'Carregando…' : 'Nenhum relatório enviado nesta data.'}</div>
        ) : (
          <>
            <div className="so-impressao">
              <img src={brasaoApmg} alt="" />
              <img src={brasaoEsfo} alt="" />
              <strong>Relatório de viaturas · EsFO · {dataExtensa(data)}</strong>
            </div>
            <p className="tela-sub nao-imprimir">
              Enviado às {horaCurta(doc.enviadaEm)} por {doc.enviadaPor}
            </p>
            <div className="botoes nao-imprimir" style={{ marginBottom: 12 }}>
              <button className="botao" onClick={copiar}>
                <Icone nome="Copy" /> Copiar
              </button>
              <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(doc.relatorio)}`} target="_blank" rel="noreferrer">
                <Icone nome="MessageCircle" /> WhatsApp
              </a>
            </div>
            <div className="botoes nao-imprimir" style={{ marginBottom: 16 }}>
              {!import.meta.env.VITE_PREVIA && typeof navigator !== 'undefined' && navigator.share && (
                <button className="botao secundario" onClick={compartilhar}>
                  <Icone nome="Share2" /> Compartilhar
                </button>
              )}
              {!import.meta.env.VITE_PREVIA && (
                <button className="botao secundario" onClick={() => window.print()}>
                  Imprimir / PDF
                </button>
              )}
            </div>
            <div className="bloco">
              <pre className="relatorio-texto">{doc.relatorio}</pre>
            </div>
          </>
        )}
      </main>
    </>
  )
}
