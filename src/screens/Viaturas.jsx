import { useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo } from '../components/base'
import { SITUACOES, podeGerirViaturas } from '../config'
import { dataBR, hojeISO, km, mensagemErro, nomeCompleto } from '../lib/formato'
import { trocaDeOleo } from '../lib/vistoria'

export default function Viaturas() {
  const { viaturas, ir, usuario, api, recarregarViaturas, avisar, hoje } = useApp()
  const gestor = podeGerirViaturas(usuario)

  async function carregar() {
    await api.carregarViaturasIniciais()
    await recarregarViaturas()
    avisar('Viaturas do relatório de 20 out. carregadas.')
  }

  return (
    <>
      <Cabecalho
        titulo="Viaturas"
        sub={`${viaturas.length} cadastradas`}
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
          <ul className="bloco vtr-lista">
            {viaturas.map((v, i) => {
              const t = trocaDeOleo(v, null, hoje)
              return (
                <li key={v.id}>
                  <button className={`vtr-linha com-num ${v.situacao === 'baixada' ? 'inativa' : ''}`} onClick={() => ir(`vtr/${v.id}`)}>
                    <span className="num">{i + 1}</span>
                    <span className="prefixo">{v.prefixo}</span>
                    <span>
                      <span className="modelo">{v.modelo}</span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {km(v.kmAtual)} km · {t.texto}
                      </span>
                    </span>
                    {(v.situacao || 'ativa') !== 'ativa' ? (
                      <Selo nivel={v.situacao === 'manutencao' ? 'atencao' : 'neutro'}>{SITUACOES[v.situacao]}</Selo>
                    ) : t.alerta ? (
                      <Selo nivel="atencao">Troca de óleo</Selo>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}

export function EditarViatura({ id }) {
  const { viaturas, ir, api, recarregarViaturas, avisar, usuario } = useApp()
  const atual = viaturas.find((v) => v.id === id)
  const nova = id === 'nova'
  const [f, setF] = useState(
    atual || { prefixo: '', modelo: '', combustivel: 'flex', usaArla: false, temRadio: true, situacao: 'ativa', nova: true, kmAtual: '', ordem: viaturas.length + 1 },
  )
  const [troca, setTroca] = useState(null)
  const [erro, setErro] = useState('')
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
    const limpo = Object.fromEntries(Object.entries({ ...f, prefixo: String(f.prefixo).trim() }).filter(([, v]) => v !== '' && v !== undefined))
    const salva = await api.salvarViatura(limpo)
    await recarregarViaturas()
    avisar('Viatura salva.')
    ir(`vtr/${salva.id}`)
  }

  async function excluir() {
    const ok = window.confirm(
      `Excluir a VTR ${f.prefixo} do app?\n\nOs relatórios já enviados continuam no histórico, mas ela some da vistoria e da ficha. ` +
        'Se ela só saiu de uso, prefira a situação "Baixada".',
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

  async function registrarTroca() {
    const kmTroca = Number(troca.km)
    if (!kmTroca) return setErro('Informe o KM da troca.')
    const v = {
      ...f,
      nova: false,
      dataUltimaTroca: hojeISO(),
      // Histórico das trocas (aparece na ficha e no relatório mensal)
      trocas: [...(f.trocas || []), { data: hojeISO(), km: kmTroca, por: nomeCompleto(usuario) }],
      kmProxTroca: kmTroca + Number(troca.intervalo || 10000),
      dataProxTroca: troca.data || undefined,
      kmAtual: Math.max(Number(f.kmAtual) || 0, kmTroca),
    }
    const limpo = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined))
    await api.salvarViatura(limpo)
    await recarregarViaturas()
    setF(limpo)
    setTroca(null)
    avisar(`Troca registrada. Próxima aos ${km(limpo.kmProxTroca)} km.`)
  }

  return (
    <>
      <Cabecalho titulo={nova ? 'Nova viatura' : `Editar VTR ${f.prefixo}`} sub={nova ? '' : f.modelo} voltar={voltar} />
      <main>
        <form className="bloco pad form" onSubmit={salvar}>
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
          <div className="dupla">
            <label>
              Combustível
              <select className="entrada" {...campo('combustivel')}>
                <option value="flex">Flex</option>
                <option value="gasolina">Gasolina</option>
                <option value="diesel">Diesel</option>
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
          <label className="chave">
            Usa Arla 32
            <input type="checkbox" {...marca('usaArla')} />
          </label>
          <label className="chave">
            Tem rádio
            <input type="checkbox" {...marca('temRadio')} />
          </label>
          <label className="chave">
            VTR nova (ainda sem troca de óleo)
            <input type="checkbox" {...marca('nova')} />
          </label>
          <label>
            KM atual
            <input className="entrada" type="number" inputMode="numeric" {...campo('kmAtual', 'number')} />
          </label>
          {!f.nova && (
            <div className="dupla">
              <label>
                Próx. troca (KM)
                <input className="entrada" type="number" inputMode="numeric" {...campo('kmProxTroca', 'number')} />
              </label>
              <label>
                Próx. troca (data)
                <input className="entrada" type="date" {...campo('dataProxTroca')} />
              </label>
            </div>
          )}
          {f.dataUltimaTroca && <div style={{ color: 'var(--tinta-2)', fontSize: 14 }}>Última troca registrada em {dataBR(f.dataUltimaTroca)}.</div>}
          {erro && <div className="erro-form">{erro}</div>}
          <button className="botao cheio">Salvar viatura</button>
        </form>

        {!nova && (
          <div className="bloco pad" style={{ marginTop: 12 }}>
            {!troca ? (
              <button className="botao secundario cheio" onClick={() => setTroca({ km: f.kmAtual || '', intervalo: 10000, data: '' })}>
                <Icone nome="Droplet" /> Registrar troca de óleo feita hoje
              </button>
            ) : (
              <div className="form">
                <strong>Troca de óleo de hoje</strong>
                <div className="dupla">
                  <label>
                    KM na troca
                    <input className="entrada" type="number" inputMode="numeric" value={troca.km} onChange={(e) => setTroca({ ...troca, km: e.target.value })} />
                  </label>
                  <label>
                    Próxima em (km)
                    <input
                      className="entrada"
                      type="number"
                      inputMode="numeric"
                      value={troca.intervalo}
                      onChange={(e) => setTroca({ ...troca, intervalo: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Data limite da próxima (se houver)
                  <input className="entrada" type="date" value={troca.data} onChange={(e) => setTroca({ ...troca, data: e.target.value })} />
                </label>
                <div className="botoes">
                  <button className="botao secundario" onClick={() => setTroca(null)}>
                    Cancelar
                  </button>
                  <button className="botao" onClick={registrarTroca}>
                    Registrar troca
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!nova && (
          <button className="botao texto perigo cheio" style={{ marginTop: 16 }} onClick={excluir}>
            <Icone nome="Trash2" /> Excluir viatura
          </button>
        )}
      </main>
    </>
  )
}
