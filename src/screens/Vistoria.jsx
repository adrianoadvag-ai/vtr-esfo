import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, FotoMini, Icone, ItemTique, Marcador } from '../components/base'
import { LIMITES, podeVistoriar } from '../config'
import { km, nomeCompleto } from '../lib/formato'
import { avaliar, exigida, itensDa, trocaDeOleo } from '../lib/vistoria'

export default function Vistoria({ vtrId }) {
  const { viaturas, vistoria, hoje, ir, api, usuario, avisar } = useApp()
  const vtr = viaturas.find((v) => v.id === vtrId)
  const enviada = vistoria?.status === 'enviada'
  const somenteLeitura = enviada || !podeVistoriar(usuario)

  const [reg, setReg] = useState(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const carregado = useRef(null)
  const timer = useRef(null)
  const pendente = useRef(null)
  // Rodada aberta no momento da gravação (muda depois de um envio)
  const rodada = useRef(vistoria)
  rodada.current = vistoria

  // Carrega o registro desta VTR uma vez por tela (depois o estado local manda)
  useEffect(() => {
    if (carregado.current === vtrId) return
    if (vistoria === undefined) return
    carregado.current = vtrId
    setReg(vistoria?.registros?.[vtrId] || { itens: {} })
  }, [vtrId, vistoria])

  // Salva sozinho 400 ms depois da última mudança, e ao sair da tela
  const gravar = (r) => {
    pendente.current = r
    clearTimeout(timer.current)
    timer.current = setTimeout(descarregar, 400)
  }
  const descarregar = () => {
    const r = pendente.current
    if (!r) return
    pendente.current = null
    const { por: _p, em: _e, ...limpo } = r
    const { id, seq } = rodada.current
    api.salvarRegistro(id, hoje, seq, vtrId, limpo, nomeCompleto(usuario)).catch((e) => avisar(e.message))
  }
  useEffect(() => () => {
    clearTimeout(timer.current)
    descarregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vtrId])

  const mudar = (patch) => {
    if (somenteLeitura) return
    setReg((r) => {
      const novo = { ...r, ...patch }
      gravar(novo)
      return novo
    })
  }
  const mudarItem = (id, valor) => {
    if (somenteLeitura) return
    setReg((r) => {
      const itens = { ...(r.itens || {}) }
      if (valor) itens[id] = valor
      else delete itens[id]
      const novo = { ...r, itens }
      gravar(novo)
      return novo
    })
  }

  const ordem = useMemo(() => viaturas.filter((v) => v.situacao !== 'baixada'), [viaturas])

  if (!vtr) {
    return (
      <>
        <Cabecalho titulo="Viatura" voltar={() => ir('hoje')} />
        <main className="vazio">Viatura não encontrada.</main>
      </>
    )
  }
  if (!reg) return <Cabecalho titulo={`VTR ${vtr.prefixo}`} voltar={() => ir('hoje')} />

  const a = avaliar(vtr, reg, hoje)
  const troca = trocaDeOleo(vtr, reg.km, hoje)
  const kmNum = reg.km === '' || reg.km === undefined ? null : Number(reg.km)
  const kmMenor = kmNum !== null && vtr.kmAtual && kmNum < vtr.kmAtual
  const kmSalto = kmNum !== null && vtr.kmAtual && kmNum - vtr.kmAtual > LIMITES.saltoKm
  const temAlt = Object.values(reg.itens || {}).some((x) => x.estado === 'alt')
  const nivelItem = (it) => {
    const v = reg.itens?.[it.id]
    if (v?.estado !== 'alt') return null
    const ops = v.alts?.length ? v.alts : [null]
    return ops.some((o) => (it.niveis?.[o] || it.nivel) === 'critico') ? 'critico' : 'atencao'
  }

  const proxima = () => {
    clearTimeout(timer.current)
    descarregar()
    const i = ordem.findIndex((v) => v.id === vtrId)
    const depois = [...ordem.slice(i + 1), ...ordem.slice(0, i)]
    const regs = { ...(vistoria?.registros || {}), [vtrId]: reg }
    const prox = depois.find((v) => exigida(v) && !avaliar(v, regs[v.id], hoje).completo)
    if (prox) ir(`vistoria/${prox.id}`)
    else ir(podeVistoriar(usuario) && !enviada ? 'revisao' : 'hoje')
  }

  async function addFoto(e) {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    setEnviandoFoto(true)
    try {
      const url = await api.enviarFoto(hoje, vtrId, arq)
      mudar({ fotos: [...(reg.fotos || []), url] })
    } catch {
      avisar('Não foi possível enviar a foto. Verifique a conexão e tente de novo.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  return (
    <>
      <Cabecalho titulo={`VTR ${vtr.prefixo}`} sub={vtr.modelo} voltar={() => ir('hoje')} />
      <main>
        <div className="vtr-topo">
          <span className="prefixo">{vtr.prefixo}</span>
          <span className="modelo">{vtr.modelo}</span>
        </div>
        <div className="vtr-info">
          Último KM {km(vtr.kmAtual) || '—'} · Troca de óleo: {troca.texto}
        </div>

        {reg.naoVistoriada ? (
          <div className="bloco obs">
            <label htmlFor="motivo">Motivo da não vistoria</label>
            <textarea
              id="motivo"
              value={reg.motivoNao || ''}
              onChange={(e) => mudar({ motivoNao: e.target.value })}
              placeholder="Ex.: viatura na oficina desde 18/10"
              disabled={somenteLeitura}
            />
            {!somenteLeitura && (
              <button className="botao texto" style={{ marginTop: 8 }} onClick={() => mudar({ naoVistoriada: false })}>
                Fazer a vistoria desta viatura
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bloco">
              <div className="campo-linha">
                <div className="icone-item">
                  <Icone nome="Gauge" />
                </div>
                <label className="rotulo" htmlFor="km">
                  KM atual
                </label>
                <input
                  id="km"
                  className="entrada-km"
                  inputMode="numeric"
                  value={reg.km === undefined || reg.km === null ? '' : km(reg.km)}
                  onChange={(e) => {
                    const n = e.target.value.replace(/\D/g, '')
                    mudar({ km: n === '' ? '' : Number(n) })
                  }}
                  placeholder={km(vtr.kmAtual) || '0'}
                  disabled={somenteLeitura}
                />
              </div>
              {kmMenor && <div className="aviso erro">Menor que o último KM registrado ({km(vtr.kmAtual)}). Confira o hodômetro.</div>}
              {!kmMenor && kmSalto && (
                <div className="aviso atencao">
                  {km(kmNum - vtr.kmAtual)} km desde o último registro. Confira se o número está certo.
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--linha)' }}>
                <Marcador rotulo="Combustível" icone="Fuel" valor={reg.comb} onChange={(n) => mudar({ comb: n })} desativado={somenteLeitura} />
              </div>
              {vtr.usaArla && (
                <div style={{ borderTop: '1px solid var(--linha)' }}>
                  <Marcador rotulo="Arla 32" icone="Droplet" valor={reg.arla} onChange={(n) => mudar({ arla: n })} desativado={somenteLeitura} />
                </div>
              )}
            </div>

            <div className="bloco">
              {itensDa(vtr).map((it) => (
                <ItemTique
                  key={it.id}
                  item={it}
                  valor={reg.itens?.[it.id]}
                  onChange={(v) => mudarItem(it.id, v)}
                  nivel={nivelItem(it)}
                  desativado={somenteLeitura}
                />
              ))}
            </div>

            <div className={`bloco obs ${temAlt && !(reg.obs || '').trim() ? 'exigida' : ''}`}>
              <label htmlFor="obs">{temAlt ? 'Descreva a alteração' : 'Observações (opcional)'}</label>
              <textarea
                id="obs"
                value={reg.obs || ''}
                onChange={(e) => mudar({ obs: e.target.value })}
                placeholder={temAlt ? 'O que foi encontrado, avisos no painel, desde quando…' : 'Ex.: situação do pneu resolvida'}
                disabled={somenteLeitura}
              />
              <div className="fotos">
                {(reg.fotos || []).map((f, i) => (
                  <FotoMini
                    key={f}
                    refFoto={f}
                    alt={`Foto ${i + 1} da VTR ${vtr.prefixo}`}
                    onRemover={somenteLeitura ? null : () => mudar({ fotos: reg.fotos.filter((x) => x !== f) })}
                  />
                ))}
                {!somenteLeitura && (
                  <label className="add-foto" aria-label="Adicionar foto">
                    <span style={{ display: 'grid', placeItems: 'center', gap: 2 }}>
                      <Icone nome="Camera" />
                      {enviandoFoto ? 'Enviando…' : 'Foto'}
                    </span>
                    <input type="file" accept="image/*" capture="environment" onChange={addFoto} hidden />
                  </label>
                )}
              </div>
            </div>

            {!somenteLeitura && (
              <button className="botao texto" style={{ marginTop: 8 }} onClick={() => mudar({ naoVistoriada: true })}>
                Não foi possível vistoriar esta viatura
              </button>
            )}
          </>
        )}
      </main>

      <div className="rodape-fixo">
        {!a.completo && !somenteLeitura && <div className="falta">
            {a.pendentes.length === 1 ? 'Falta' : `Faltam ${a.pendentes.length}`}: {a.pendentes.slice(0, 3).join(', ')}
            {a.pendentes.length > 3 ? '…' : ''}
          </div>}
        {a.completo && !somenteLeitura ? (
          <div className="botoes" style={{ flexWrap: 'nowrap' }}>
            <button
              className="botao secundario"
              onClick={() => {
                clearTimeout(timer.current)
                descarregar()
                ir('revisao')
              }}
            >
              <Icone nome="Send" /> Enviar
            </button>
            <button className="botao" style={{ flex: 2 }} onClick={proxima}>
              Próxima VTR
            </button>
          </div>
        ) : (
          <button className="botao cheio" onClick={proxima}>
            {somenteLeitura ? 'Próxima viatura' : 'Salvar e ir para a próxima'}
          </button>
        )}
      </div>
    </>
  )
}
