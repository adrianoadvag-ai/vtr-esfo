import { useState } from 'react'
import { Icone, Selo } from './base'
import { TROCA } from '../config'
import { dataBR, hojeISO, km, mensagemErro, nomeCompleto, somarMeses } from '../lib/formato'
import { trocaDeOleo } from '../lib/vistoria'

// Troca de óleo na tela de vistoria: mostra a situação e deixa quem vistoria atualizar os dados
// (última troca, próxima por KM e por data) ou marcar a VTR como nova (revisão dos 10.000 km).
export default function CartaoTroca({ vtr, kmHoje, hoje, usuario, api, recarregarViaturas, avisar, podeEditar }) {
  const [f, setF] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const t = trocaDeOleo(vtr, kmHoje, hoje)

  function abrir() {
    const kmUlt = vtr.kmUltimaTroca ?? ''
    const dataUlt = vtr.dataUltimaTroca || ''
    setErro('')
    setF({
      nova: Boolean(vtr.nova),
      kmRevisao: vtr.kmRevisao || TROCA.revisaoNovaKm,
      dataUlt,
      kmUlt,
      kmProx: vtr.kmProxTroca ?? '',
      dataProx: vtr.dataProxTroca || '',
      // Só recalcula sozinho o que ninguém digitou à mão
      kmProxManual: Boolean(vtr.kmProxManual),
      dataProxManual: Boolean(vtr.dataProxManual),
    })
  }

  // Ao mudar a última troca, a próxima acompanha (10.000 km e 6 meses), salvo se foi digitada à mão
  function mudarUltima(mud) {
    const n = { ...f, ...mud }
    if (!n.kmProxManual) n.kmProx = n.kmUlt === '' ? '' : Number(n.kmUlt) + TROCA.intervaloKm
    if (!n.dataProxManual) n.dataProx = n.dataUlt ? somarMeses(n.dataUlt, TROCA.intervaloMeses) : ''
    setF(n)
  }

  async function salvar() {
    setErro('')
    let dados
    if (f.nova) {
      const rev = Number(f.kmRevisao)
      if (!rev) return setErro('Informe o KM da revisão.')
      dados = { nova: true, kmRevisao: rev }
    } else {
      const kmUlt = Number(f.kmUlt)
      const kmProx = Number(f.kmProx)
      if (!f.dataUlt) return setErro('Informe a data da última troca.')
      if (f.dataUlt > hoje) return setErro('A data da última troca não pode ser depois de hoje.')
      if (!kmUlt) return setErro('Informe o KM da última troca.')
      if (!kmProx || kmProx <= kmUlt) return setErro('O KM da próxima troca precisa ser maior que o da última.')
      if (f.dataProx && f.dataProx <= f.dataUlt) return setErro('A data da próxima troca precisa ser depois da última.')
      const mudouUltima = f.dataUlt !== vtr.dataUltimaTroca || kmUlt !== Number(vtr.kmUltimaTroca)
      dados = {
        nova: false,
        dataUltimaTroca: f.dataUlt,
        kmUltimaTroca: kmUlt,
        kmProxTroca: kmProx,
        kmProxManual: f.kmProxManual,
        dataProxTroca: f.dataProx || null,
        dataProxManual: f.dataProxManual,
        // Histórico (aparece na ficha da viatura e no relatório mensal)
        trocas: mudouUltima
          ? [...(vtr.trocas || []), { data: f.dataUlt, km: kmUlt, kmProx, dataProx: f.dataProx || null, por: nomeCompleto(usuario), em: hojeISO() }]
          : vtr.trocas || [],
      }
    }
    setSalvando(true)
    try {
      const limpo = Object.fromEntries(Object.entries({ ...vtr, ...dados }).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      await api.salvarViatura(limpo)
      await recarregarViaturas()
      setF(null)
      avisar(dados.nova ? `VTR ${vtr.prefixo}: nova, revisão aos ${km(dados.kmRevisao)} km.` : `Troca de óleo da VTR ${vtr.prefixo} atualizada.`)
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível salvar a troca de óleo.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bloco cartao-troca">
      <div className="campo-linha">
        <div className="icone-item">
          <Icone nome="Droplet" />
        </div>
        <div className="rotulo">
          Troca de óleo
          <small>
            {t.nova
              ? 'VTR nova, ainda sem troca'
              : vtr.dataUltimaTroca
                ? `Última em ${dataBR(vtr.dataUltimaTroca)}${vtr.kmUltimaTroca ? ` aos ${km(vtr.kmUltimaTroca)} km` : ''}`
                : 'Última troca não informada'}
          </small>
        </div>
        {t.alerta ? <Selo nivel="atencao">{t.nova ? 'Revisão' : 'Trocar'}</Selo> : t.semDados ? <Selo nivel="neutro">Sem dados</Selo> : <Selo nivel="ok">Em dia</Selo>}
      </div>

      {!f && (
        <div className="troca-resumo">
          {t.nova ? (
            <span>
              Revisão aos <strong>{km(t.kmAlvo)} km</strong> · {t.faltaKm < 0 ? `vencida há ${km(-t.faltaKm)} km` : `faltam ${km(t.faltaKm)} km`}
            </span>
          ) : t.semDados ? (
            <span>Preencha os dados da etiqueta da última troca.</span>
          ) : (
            <span>
              Próxima:{' '}
              {vtr.kmProxTroca && (
                <>
                  <strong>{km(vtr.kmProxTroca)} km</strong> ({t.faltaKm < 0 ? `vencida há ${km(-t.faltaKm)} km` : `faltam ${km(t.faltaKm)} km`})
                </>
              )}
              {vtr.kmProxTroca && vtr.dataProxTroca && ' ou '}
              {vtr.dataProxTroca && (
                <>
                  <strong>{dataBR(vtr.dataProxTroca)}</strong> ({t.faltaDias < 0 ? `vencida há ${-t.faltaDias} dias` : `faltam ${t.faltaDias} dias`})
                </>
              )}
            </span>
          )}
          {podeEditar && (
            <button className="botao texto" onClick={abrir}>
              <Icone nome="Pencil" tamanho={16} /> {t.semDados && !t.nova ? 'Preencher' : 'Atualizar'}
            </button>
          )}
        </div>
      )}

      {f && (
        <div className="form troca-form">
          <label className="chave">
            VTR nova (ainda sem troca de óleo)
            <input type="checkbox" checked={f.nova} onChange={(e) => setF({ ...f, nova: e.target.checked })} />
          </label>

          {f.nova ? (
            <label>
              Revisão aos (km)
              <input
                className="entrada"
                type="number"
                inputMode="numeric"
                value={f.kmRevisao}
                onChange={(e) => setF({ ...f, kmRevisao: e.target.value === '' ? '' : Number(e.target.value) })}
              />
              <small>O app avisa quando faltar {km(1000)} km. Depois da revisão, desmarque "VTR nova" e preencha a troca.</small>
            </label>
          ) : (
            <>
              <strong className="troca-titulo">Última troca (etiqueta)</strong>
              <div className="dupla">
                <label>
                  Data
                  <input className="entrada" type="date" max={hoje} value={f.dataUlt} onChange={(e) => mudarUltima({ dataUlt: e.target.value })} />
                </label>
                <label>
                  KM
                  <input
                    className="entrada"
                    type="number"
                    inputMode="numeric"
                    value={f.kmUlt}
                    placeholder={km(Number(kmHoje) || vtr.kmAtual) || ''}
                    onChange={(e) => mudarUltima({ kmUlt: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </label>
              </div>

              <strong className="troca-titulo">Próxima troca</strong>
              <div className="dupla">
                <label>
                  KM
                  <input
                    className="entrada"
                    type="number"
                    inputMode="numeric"
                    value={f.kmProx}
                    onChange={(e) => setF({ ...f, kmProx: e.target.value === '' ? '' : Number(e.target.value), kmProxManual: true })}
                  />
                </label>
                <label>
                  Data
                  <input className="entrada" type="date" value={f.dataProx} onChange={(e) => setF({ ...f, dataProx: e.target.value, dataProxManual: true })} />
                </label>
              </div>
              <small className="troca-nota">
                {f.kmProxManual || f.dataProxManual ? (
                  <>
                    Valores da etiqueta.{' '}
                    <button className="link-texto" onClick={() => mudarUltima({ kmProxManual: false, dataProxManual: false })}>
                      Calcular de novo ({km(TROCA.intervaloKm)} km e {TROCA.intervaloMeses} meses)
                    </button>
                  </>
                ) : (
                  `Calculada: ${km(TROCA.intervaloKm)} km e ${TROCA.intervaloMeses} meses após a última. Se a etiqueta tiver outra data ou KM, altere aqui.`
                )}
              </small>
            </>
          )}

          {erro && <div className="erro-form">{erro}</div>}
          <div className="botoes">
            <button className="botao secundario" onClick={() => setF(null)} disabled={salvando}>
              Cancelar
            </button>
            <button className="botao" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
