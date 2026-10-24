import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo, SeloNivel, brasaoApmg, brasaoEsfo, useCarregar } from '../components/base'
import { INICIO_RELATORIOS, SITUACOES } from '../config'
import { dataBR, diaMes, km, nomeCompleto } from '../lib/formato'
import { mesAnterior, mesDe, mesSeguinte, nomeMes, resumoMensal } from '../lib/frota'
import { gerarPdfMensal } from '../lib/mensal-pdf'
import FiguraVtr from '../components/FiguraVtr'

// Relatório do mês: situação de cada viatura, KM rodado, alterações, pendências e troca de óleo, com PDF
export default function Mensal({ mes: mesRota }) {
  const { api, ir, hoje, viaturas, ocorrencias, usuario, avisar, enviadasHoje } = useApp()
  const primeiro = mesDe(INICIO_RELATORIOS)
  const pedido = /^\d{4}-\d{2}$/.test(mesRota || '') ? mesRota : mesDe(hoje)
  const mes = pedido < primeiro ? primeiro : pedido
  const [gerando, setGerando] = useState(false)

  const { dados: vistorias, carregando } = useCarregar(() => api.listarVistorias(), [enviadasHoje.length])
  const r = useMemo(() => (vistorias ? resumoMensal({ mes, hoje, vistorias, viaturas, ocorrencias }) : null), [mes, hoje, vistorias, viaturas, ocorrencias])
  const podeCompartilharArquivo =
    typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] })

  async function pdf() {
    setGerando(true)
    try {
      return await gerarPdfMensal({ resumo: r, brasoes: [brasaoApmg, brasaoEsfo], geradoPor: nomeCompleto(usuario), hoje })
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
      await navigator.share({ files: [new File([blob], nome, { type: 'application/pdf' })], title: `Relatório mensal de viaturas · ${nomeMes(mes)}` })
    } catch (e) {
      if (e?.name !== 'AbortError') avisar('Não foi possível compartilhar o PDF.')
    }
  }

  return (
    <>
      <Cabecalho titulo="Relatório mensal" sub="Situação das viaturas no mês" voltar={() => ir('historico')} />
      <main>
        <div className="seletor-mes">
          <button onClick={() => ir(`mensal/${mesAnterior(mes)}`)} disabled={mes <= primeiro} aria-label="Mês anterior">
            <Icone nome="ChevronLeft" />
          </button>
          <strong>{nomeMes(mes, true)}</strong>
          <button onClick={() => ir(`mensal/${mesSeguinte(mes)}`)} disabled={mes >= mesDe(hoje)} aria-label="Próximo mês">
            <Icone nome="ChevronRight" />
          </button>
        </div>

        {!r ? (
          <div className="bloco vazio">{carregando ? 'Carregando…' : 'Não foi possível carregar os relatórios. Verifique a conexão.'}</div>
        ) : r.vazio ? (
          <div className="bloco vazio">O relatório mensal começa em {dataBR(INICIO_RELATORIOS)}.</div>
        ) : (
          <>
            <p className="tela-sub" style={{ margin: '0 0 12px', textAlign: 'center' }}>
              Período: {diaMes(r.de)} a {dataBR(r.ate)}
              {r.emAndamento ? ' (mês em andamento)' : ''}
            </p>
            <div className="botoes" style={{ marginBottom: 16 }}>
              <button className="botao" onClick={baixar} disabled={gerando}>
                <Icone nome="FileDown" /> {gerando ? 'Gerando…' : 'Baixar PDF'}
              </button>
              {podeCompartilharArquivo && (
                <button className="botao secundario" onClick={compartilhar} disabled={gerando}>
                  <Icone nome="Share2" /> Enviar PDF
                </button>
              )}
            </div>

            <div className="numeros">
              <div>
                <strong>{r.frota.ativas}</strong>
                <span>
                  VTR ativas
                  {r.frota.manutencao || r.frota.baixadas ? ` · ${r.frota.manutencao} em manutenção · ${r.frota.baixadas} baixadas` : ''}
                </span>
              </div>
              <div>
                <strong>{km(r.frota.kmRodados)}</strong>
                <span>km rodados no período</span>
              </div>
              <div>
                <strong>{r.frota.alteracoes}</strong>
                <span>alterações registradas</span>
              </div>
              <div>
                <strong>{r.frota.pendencias}</strong>
                <span>pendências em aberto</span>
              </div>
            </div>

            <h2 className="secao">Viaturas</h2>
            {r.porViatura.map((x) => (
              <FichaMensal key={x.vtr.id} x={x} ir={ir} />
            ))}
          </>
        )}
      </main>
    </>
  )
}

function FichaMensal({ x, ir }) {
  const { vtr, troca } = x
  return (
    <section className={`bloco ficha mensal-vtr ${x.situacao === 'baixada' ? 'inativa' : ''}`} aria-label={`VTR ${vtr.prefixo}`}>
      <button className="ficha-topo linha-botao" onClick={() => ir(`vtr/${vtr.id}`)}>
        <span className="prefixo">{vtr.prefixo}</span>
        <FiguraVtr vtr={vtr} tamanho={56} />
        <span className="modelo">{vtr.modelo}</span>
        {x.situacao !== 'ativa' && <Selo nivel={x.situacao === 'manutencao' ? 'atencao' : 'neutro'}>{SITUACOES[x.situacao]}</Selo>}
        <Icone nome="ChevronRight" style={{ marginLeft: 'auto', color: 'var(--tinta-2)' }} />
      </button>
      <dl className="ficha-dados">
        <div>
          <dt>KM no período</dt>
          <dd>{x.kmInicial ? `${km(x.kmInicial)} → ${km(x.kmFinal)}` : 'Sem leitura'}</dd>
        </div>
        <div>
          <dt>Rodado</dt>
          <dd>{x.kmInicial ? `${km(x.rodado)} km` : '—'}</dd>
        </div>
        <div>
          <dt>Vistoriada</dt>
          <dd>
            {x.vistorias} {x.vistorias === 1 ? 'dia' : 'dias'}
            {x.naoVistoriada ? ` · ${x.naoVistoriada} sem vistoria` : ''}
          </dd>
        </div>
        <div className={troca.alerta ? 'destaque' : ''}>
          <dt>{troca.nova ? 'Revisão (VTR nova)' : 'Troca de óleo'}</dt>
          <dd>
            {troca.nova
              ? `Aos ${km(troca.kmAlvo)} km (${troca.faltaKm < 0 ? `vencida há ${km(-troca.faltaKm)} km` : `faltam ${km(troca.faltaKm)} km`})`
              : troca.texto[0].toUpperCase() + troca.texto.slice(1)}
          </dd>
        </div>
      </dl>

      {x.alteracoes.length + x.pendencias.length + x.trocas.length === 0 ? (
        <p className="mensal-nada">Sem alterações no período.</p>
      ) : (
        <ul className="mensal-lista">
          {x.alteracoes.map((g) => (
            <li key={g.texto}>
              <SeloNivel nivel={g.nivel} />
              <span>
                {g.texto}
                <small>
                  {g.vezes > 1 ? `${g.vezes} vistorias, de ${diaMes(g.primeira)} a ${diaMes(g.ultima)}` : `em ${diaMes(g.ultima)}`}
                </small>
              </span>
            </li>
          ))}
          {x.pendencias.map((o) => (
            <li key={o.id}>
              <Selo nivel="neutro">Pendência</Selo>
              <span>
                {o.texto}
                <small>em aberto desde {dataBR(o.abertaEm)}</small>
              </span>
            </li>
          ))}
          {x.trocas.map((t, i) => (
            <li key={`t${i}`}>
              <Selo nivel="ok">Troca</Selo>
              <span>
                Troca de óleo feita em {dataBR(t.data)}
                {t.km ? ` aos ${km(t.km)} km` : ''}
                {t.por && <small>registrada por {t.por}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
