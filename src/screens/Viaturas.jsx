import { useEffect, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo } from '../components/base'
import { COMBUSTIVEIS, ORDENS_SERVICO, SITUACAO_INFO, SITUACOES, podeGerirViaturas } from '../config'
import { hojeISO, km, mensagemErro } from '../lib/formato'
import { comSituacao, infoSituacao, naFrota, seloSituacao, situacaoDe, textoSituacao } from '../lib/situacao'
import { trocaDeOleo } from '../lib/vistoria'
import FiguraVtr, { ModeloVtr } from '../components/FiguraVtr'
import { TIPOS_VTR, tipoDaViatura } from '../lib/tipo-vtr'

export default function Viaturas() {
  const { viaturas, ir, usuario, api, recarregarViaturas, avisar, hoje } = useApp()
  const gestor = podeGerirViaturas(usuario)
  const daFrota = viaturas.filter(naFrota)
  const foraDaFrota = viaturas.filter((v) => !naFrota(v))

  async function carregar() {
    await api.carregarViaturasIniciais()
    await recarregarViaturas()
    avisar('Viaturas do relatório de 20 out. carregadas.')
  }

  return (
    <>
      <Cabecalho
        titulo="Viaturas"
        sub={`${daFrota.length} na frota${foraDaFrota.length ? ` · ${foraDaFrota.length} fora` : ''}`}
        acao={
          gestor && (
            <button className="acao" onClick={() => ir('viatura/nova')} aria-label="Cadastrar viatura">
              <Icone nome="Plus" tamanho={24} />
            </button>
          )
        }
      />
      <main>
        {viaturas.length === 0 ? (
          <div className="bloco vazio">
            <p>Nenhuma viatura cadastrada.</p>
            {gestor && (
              <div className="botoes">
                <button className="botao" onClick={carregar}>
                  Usar as 10 VTR do relatório
                </button>
                <button className="botao secundario" onClick={() => ir('viatura/nova')}>
                  Cadastrar uma
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <ul className="bloco vtr-lista">
              {daFrota.map((v, i) => (
                <LinhaVtr key={v.id} v={v} i={i} hoje={hoje} ir={ir} />
              ))}
            </ul>
            {foraDaFrota.length > 0 && (
              <details className="fora-frota">
                <summary>Fora da frota ({foraDaFrota.length})</summary>
                <ul className="bloco vtr-lista">
                  {foraDaFrota.map((v, i) => (
                    <LinhaVtr key={v.id} v={v} i={daFrota.length + i} hoje={hoje} ir={ir} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>
    </>
  )
}

function LinhaVtr({ v, i, hoje, ir }) {
  const t = trocaDeOleo(v, null, hoje)
  const sit = situacaoDe(v)
  const selo = seloSituacao(v)
  return (
    <li>
      <button className={`vtr-linha com-num ${infoSituacao(v).vistoria ? '' : 'inativa'}`} onClick={() => ir(`vtr/${v.id}`)}>
        <span className="num">{i + 1}</span>
        <span className="prefixo">{v.prefixo}</span>
        <span className="vtr-desc">
          <FiguraVtr vtr={v} tamanho={56} />
          <span>
            <span className="modelo">
              <ModeloVtr modelo={v.modelo} />
            </span>
            <span className="detalhe" style={{ display: 'block' }}>
              {[v.placa, `${km(v.kmAtual)} km`, sit === 'foraDaFrota' ? '' : t.texto].filter(Boolean).join(' · ')}
            </span>
            {sit !== 'ativa' && v.motivoSituacao && <span className="detalhe motivo-linha">{textoSituacao(v, { rotulo: false })}</span>}
            <span className="selo-linha">
              {sit !== 'ativa' ? (
                <Selo nivel={selo.nivel}>{selo.texto}</Selo>
              ) : t.alerta ? (
                <Selo nivel="atencao">{t.nova ? 'Revisão' : 'Troca de óleo'}</Selo>
              ) : null}
            </span>
          </span>
        </span>
      </button>
    </li>
  )
}

export function EditarViatura({ id }) {
  const { viaturas, ir, api, recarregarViaturas, avisar, usuario } = useApp()
  const atual = viaturas.find((v) => v.id === id)
  const nova = id === 'nova'
  const [f, setF] = useState(
    (atual && { ...atual, situacao: situacaoDe(atual) }) || { prefixo: '', modelo: '', combustivel: 'flex', usaArla: false, temRadio: true, situacao: 'ativa', nova: true, kmAtual: '', ordem: viaturas.length + 1 },
  )
  const [erro, setErro] = useState('')
  // Aberta direto pelo endereço, a lista de viaturas chega depois: preenche o formulário quando ela chegar
  useEffect(() => {
    if (atual && !f.id) setF({ ...atual, situacao: situacaoDe(atual) }) // eslint-disable-line react-hooks/set-state-in-effect
  }, [atual]) // eslint-disable-line react-hooks/exhaustive-deps
  const voltar = () => ir(nova ? 'viaturas' : `vtr/${id}`)

  if (!podeGerirViaturas(usuario)) return null
  if (!nova && !atual) {
    return (
      <>
        <Cabecalho titulo="Viatura" voltar={() => ir('viaturas')} />
        <main className="vazio">Viatura não encontrada.</main>
      </>
    )
  }

  const campo = (k, tipo = 'text') => ({
    value: f[k] ?? '',
    onChange: (e) => setF({ ...f, [k]: tipo === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }),
  })
  const marca = (k) => ({ checked: Boolean(f[k]), onChange: (e) => setF({ ...f, [k]: e.target.checked }) })

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!String(f.prefixo).trim() || !String(f.modelo).trim()) return setErro('Informe prefixo e modelo.')
    if (nova && viaturas.some((v) => v.prefixo === String(f.prefixo).trim())) return setErro('Já existe uma viatura com este prefixo.')
    const sit = situacaoDe(f)
    if (SITUACAO_INFO[sit].motivo && !String(f.motivoSituacao || '').trim()) return setErro('Descreva o motivo da situação.')
    if (f.cartaoFinal && !/^\d{4}$/.test(f.cartaoFinal)) return setErro('Informe os 4 últimos dígitos do cartão.')
    if (f.ano && !/^\d{4}$/.test(String(f.ano))) return setErro('Ano de fabricação com 4 dígitos.')
    const comMotivo = comSituacao(
      atual || {},
      sit,
      { motivo: f.motivoSituacao || '', previsao: f.previsaoRetorno || '', ordemServico: f.ordemServico || '', numeroOS: f.numeroOS || '', oficina: f.oficina || '' },
      usuario,
      hojeISO(),
    )
    const situacaoDados = Object.fromEntries(
      ['situacao', 'motivoSituacao', 'previsaoRetorno', 'situacaoDesde', 'situacaoPor', 'ordemServico', 'numeroOS', 'oficina'].map((k) => [k, comMotivo[k]]),
    )
    const limpo = Object.fromEntries(Object.entries({ ...f, ...situacaoDados, tipo: f.tipo || tipoDaViatura(f), prefixo: String(f.prefixo).trim() }).filter(([, v]) => v !== '' && v !== undefined))
    const salva = await api.salvarViatura(limpo)
    await recarregarViaturas()
    avisar('Viatura salva.')
    ir(`vtr/${salva.id}`)
  }

  async function excluir() {
    const ok = window.confirm(
      `Excluir a VTR ${f.prefixo} do app?\n\nOs relatórios já enviados continuam no histórico, mas ela some da vistoria e da ficha. ` +
        'Se ela só saiu de uso, prefira a situação "Baixada" ou "Fora da frota".',
    )
    if (!ok) return
    try {
      await api.excluirViatura(id)
      await recarregarViaturas()
      avisar(`VTR ${f.prefixo} excluída.`)
      ir('viaturas')
    } catch (e) {
      avisar(mensagemErro(e, 'Não foi possível excluir.'))
    }
  }

  return (
    <>
      <Cabecalho titulo={nova ? 'Nova viatura' : `Editar VTR ${f.prefixo}`} sub={nova ? '' : f.modelo} voltar={voltar} />
      <main>
        <form className="bloco pad form" onSubmit={salvar}>
          <h3 className="form-grupo">Identificação</h3>
          <div className="dupla">
            <label>
              Prefixo
              <input className="entrada" {...campo('prefixo')} disabled={!nova} />
            </label>
            <label>
              Ordem no relatório
              <input className="entrada" type="number" {...campo('ordem', 'number')} />
            </label>
          </div>
          <label>
            Marca/modelo
            <input className="entrada" {...campo('modelo')} placeholder="Renault/Duster" />
          </label>
          <label>
            Tipo (figura da viatura)
            <span className="tipo-escolha">
              <FiguraVtr tipo={f.tipo || tipoDaViatura(f)} tamanho={72} />
              <select className="entrada" value={f.tipo || tipoDaViatura(f)} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                {Object.entries(TIPOS_VTR).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <div className="dupla">
            <label>
              Placa
              <input
                className="entrada"
                value={f.placa || ''}
                onChange={(e) => setF({ ...f, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) })}
                placeholder="BDS5F07"
                autoCapitalize="characters"
              />
            </label>
            <label>
              Ano de fabricação
              <input className="entrada" inputMode="numeric" value={f.ano || ''} onChange={(e) => setF({ ...f, ano: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="2020" />
            </label>
          </div>
          <label>
            Renavam
            <input className="entrada" inputMode="numeric" value={f.renavam || ''} onChange={(e) => setF({ ...f, renavam: e.target.value.replace(/\D/g, '').slice(0, 11) })} />
          </label>
          <label>
            Chassi
            <input
              className="entrada"
              value={f.chassi || ''}
              onChange={(e) => setF({ ...f, chassi: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17) })}
              autoCapitalize="characters"
            />
          </label>
          <label>
            Cartão de abastecimento (4 últimos dígitos)
            <input
              className="entrada"
              inputMode="numeric"
              value={f.cartaoFinal || ''}
              onChange={(e) => setF({ ...f, cartaoFinal: e.target.value.replace(/\D/g, '').slice(-4) })}
              placeholder="6304"
            />
            <small className="dica">Por segurança, o app guarda só o final do número.</small>
          </label>

          <h3 className="form-grupo">Uso</h3>
          <div className="dupla">
            <label>
              Combustível
              <select className="entrada" {...campo('combustivel')}>
                {Object.entries(COMBUSTIVEIS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Situação
              <select className="entrada" {...campo('situacao')}>
                {Object.entries(SITUACOES).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {situacaoDe(f) !== 'ativa' && (
            <>
              <label>
                {situacaoDe(f) === 'baixada' ? 'Motivo da baixa' : SITUACAO_INFO[situacaoDe(f)].motivo ? 'Motivo / restrição' : 'Observação (opcional)'}
                <textarea value={f.motivoSituacao || ''} onChange={(e) => setF({ ...f, motivoSituacao: e.target.value })} />
              </label>
              {SITUACAO_INFO[situacaoDe(f)].os && (
                <>
                  <label>
                    Ordem de serviço
                    <select className="entrada" {...campo('ordemServico')}>
                      <option value="">—</option>
                      {ORDENS_SERVICO.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="dupla">
                    <label>
                      Nº da OS
                      <input className="entrada" {...campo('numeroOS')} />
                    </label>
                    <label>
                      Oficina
                      <input className="entrada" {...campo('oficina')} />
                    </label>
                  </div>
                  <label>
                    Previsão de retorno (opcional)
                    <input className="entrada" type="date" {...campo('previsaoRetorno')} />
                  </label>
                </>
              )}
            </>
          )}
          <label className="chave">
            Usa Arla 32
            <input type="checkbox" {...marca('usaArla')} />
          </label>
          <label className="chave">
            Tem rádio
            <input type="checkbox" {...marca('temRadio')} />
          </label>
          {nova && (
            <label className="chave">
              VTR nova (ainda sem troca de óleo)
              <input type="checkbox" {...marca('nova')} />
            </label>
          )}
          <label>
            KM atual
            <input className="entrada" type="number" inputMode="numeric" {...campo('kmAtual', 'number')} />
          </label>
          <p className="tela-sub" style={{ margin: 0, fontSize: 14 }}>
            A troca de óleo (última troca, próxima troca ou revisão de VTR nova) é preenchida na tela de vistoria da viatura.
          </p>
          {erro && <div className="erro-form">{erro}</div>}
          <button className="botao cheio">Salvar viatura</button>
        </form>

        {!nova && (
          <button className="botao texto perigo cheio" style={{ marginTop: 16 }} onClick={excluir}>
            <Icone nome="Trash2" /> Excluir viatura
          </button>
        )}
      </main>
    </>
  )
}
