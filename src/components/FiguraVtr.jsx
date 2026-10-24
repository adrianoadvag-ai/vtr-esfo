// Silhueta da viatura conforme o tipo (furgão, SUV, picape, sedã/hatch, moto).
// Desenhos genéricos, sem reproduzir nenhum modelo de fábrica.

import { TIPOS_VTR, tipoDaViatura } from '../lib/tipo-vtr'

const Roda = ({ x, r }) => (
  <>
    <circle className="fv-ar" cx={x} cy="60" r={r + 2} />
    <circle className="fv-wh" cx={x} cy="61" r={r} />
    <circle className="fv-rm" cx={x} cy="61" r={Math.round(r * 0.55)} />
    <circle className="fv-wh" cx={x} cy="61" r="2" />
  </>
)

const Giroflex = ({ x, y, w = 11, h = 6 }) => (
  <>
    <rect className="fv-rd" x={x} y={y} width={w} height={h} rx="1" />
    <rect className="fv-bl" x={x + w} y={y} width={w} height={h} rx="1" />
  </>
)

const DESENHOS = {
  furgao: (
    <>
      <Giroflex x={52} y={0} />
      <path className="fv-bd" d="M4 60 L4 14 Q4 6 12 6 L104 6 Q110 6 114 11 L130 32 L144 37 Q148 39 148 45 L148 60 Z" />
      <rect className="fv-st" x="4" y="40" width="134" height="3" />
      <polygon className="fv-wn" points="109,12 127,32 109,32" />
      <rect className="fv-wn" x="88" y="12" width="18" height="20" rx="2" />
      <rect className="fv-wn" x="12" y="12" width="24" height="14" rx="2" />
      <path className="fv-ln" d="M58 10 L58 56 M85 10 L85 56 M8 8 L8 56" />
      <rect className="fv-bp" x="77" y="34" width="5" height="2" />
      <rect className="fv-bp" x="98" y="36" width="5" height="2" />
      <polygon className="fv-bp" points="104,22 108,22 108,28 102,28" />
      <rect className="fv-hl" x="140" y="42" width="7" height="5" rx="1" />
      <rect className="fv-tl" x="4" y="44" width="4" height="8" />
      <rect className="fv-bp" x="138" y="52" width="11" height="8" rx="2" />
      <rect className="fv-bp" x="2" y="52" width="10" height="8" rx="2" />
      <Roda x={30} r={11} />
      <Roda x={120} r={11} />
    </>
  ),
  suv: (
    <>
      <rect className="fv-bp" x="50" y="5" width="52" height="2" />
      <Giroflex x={64} y={0} h={5} />
      <path className="fv-bd" d="M4 60 L4 38 Q4 30 12 29 L30 27 L45 10 Q48 8 53 8 L100 8 Q106 8 110 12 L126 27 L142 31 Q148 33 148 41 L148 60 Z" />
      <rect className="fv-st" x="4" y="40" width="136" height="3" />
      <polygon className="fv-wn" points="33,27 49,12 72,12 72,27" />
      <polygon className="fv-wn" points="77,12 100,12 114,27 77,27" />
      <path className="fv-ln" d="M75 12 L75 56 M118 28 L118 56 M34 28 L34 50" />
      <rect className="fv-bp" x="64" y="32" width="5" height="2" />
      <rect className="fv-bp" x="107" y="32" width="5" height="2" />
      <polygon className="fv-bp" points="117,20 122,20 122,26 116,26" />
      <rect className="fv-hl" x="140" y="34" width="7" height="5" rx="1" />
      <rect className="fv-tl" x="4" y="33" width="4" height="8" />
      <rect className="fv-bp" x="138" y="50" width="11" height="10" rx="2" />
      <rect className="fv-bp" x="2" y="50" width="10" height="10" rx="2" />
      <Roda x={32} r={13} />
      <Roda x={120} r={13} />
    </>
  ),
  picape: (
    <>
      <Giroflex x={82} y={0} />
      <path className="fv-bd" d="M4 60 L4 30 L68 30 L72 10 Q73 8 77 8 L108 8 Q112 8 115 12 L128 28 L144 32 Q148 34 148 40 L148 60 Z" />
      <rect className="fv-bp" x="4" y="28" width="64" height="3" />
      <rect className="fv-st" x="4" y="40" width="136" height="3" />
      <polygon className="fv-wn" points="76,13 92,13 92,28 74,28" />
      <polygon className="fv-wn" points="96,13 108,13 120,28 96,28" />
      <path className="fv-ln" d="M70 31 L70 56 M94 13 L94 56 M122 28 L122 56" />
      <rect className="fv-bp" x="85" y="33" width="5" height="2" />
      <rect className="fv-bp" x="113" y="33" width="5" height="2" />
      <polygon className="fv-bp" points="119,20 124,20 124,26 118,26" />
      <rect className="fv-hl" x="140" y="35" width="7" height="5" rx="1" />
      <rect className="fv-tl" x="4" y="33" width="4" height="9" />
      <rect className="fv-bp" x="138" y="50" width="11" height="10" rx="2" />
      <rect className="fv-bp" x="2" y="50" width="10" height="10" rx="2" />
      <Roda x={32} r={13} />
      <Roda x={122} r={13} />
    </>
  ),
  sedan: (
    <>
      <Giroflex x={69} y={5} />
      <path className="fv-bd" d="M4 60 L4 42 Q4 35 12 34 L34 31 L52 15 Q56 12 62 12 L100 12 Q106 12 110 16 L124 31 L142 34 Q148 35 148 43 L148 60 Z" />
      <rect className="fv-st" x="4" y="44" width="136" height="3" />
      <polygon className="fv-wn" points="40,31 56,17 76,17 76,31" />
      <polygon className="fv-wn" points="81,17 100,17 112,31 81,31" />
      <path className="fv-ln" d="M79 17 L79 56 M116 31 L116 56 M40 32 L40 52" />
      <rect className="fv-bp" x="69" y="36" width="5" height="2" />
      <rect className="fv-bp" x="106" y="36" width="5" height="2" />
      <polygon className="fv-bp" points="114,24 119,24 119,29 113,29" />
      <rect className="fv-hl" x="140" y="38" width="7" height="5" rx="1" />
      <rect className="fv-tl" x="4" y="37" width="4" height="7" />
      <rect className="fv-bp" x="138" y="52" width="11" height="8" rx="2" />
      <rect className="fv-bp" x="2" y="52" width="10" height="8" rx="2" />
      <Roda x={32} r={11} />
      <Roda x={120} r={11} />
    </>
  ),
  moto: (
    <>
      <path className="fv-mk" d="M28 56 L60 46 M112 34 L122 56 M104 20 L112 34" />
      <path className="fv-ln" d="M40 52 L72 52" style={{ strokeWidth: 3 }} />
      <circle className="fv-wh" cx="28" cy="56" r="16" />
      <circle className="fv-rm" cx="28" cy="56" r="9" />
      <circle className="fv-wh" cx="28" cy="56" r="3" />
      <circle className="fv-wh" cx="122" cy="56" r="16" />
      <circle className="fv-rm" cx="122" cy="56" r="9" />
      <circle className="fv-wh" cx="122" cy="56" r="3" />
      <path className="fv-bd" d="M44 42 L58 28 L96 28 L110 36 L94 46 L56 48 Z" />
      <polygon className="fv-bp" points="40,36 60,26 78,26 72,32" />
      <polygon className="fv-wn" points="104,14 110,14 112,28 106,28" />
      <circle className="fv-hl" cx="115" cy="30" r="3" />
      <Giroflex x={96} y={8} w={7} h={5} />
    </>
  ),
}

export default function FiguraVtr({ vtr, tipo, tamanho = 64, className = '' }) {
  const t = tipo || tipoDaViatura(vtr)
  return (
    <svg
      className={`figura-vtr ${className}`}
      viewBox="0 0 152 76"
      width={tamanho}
      height={Math.round((tamanho * 76) / 152)}
      role="img"
      aria-label={TIPOS_VTR[t]}
    >
      <ellipse className="fv-gs" cx="76" cy="73" rx="72" ry="3" />
      {DESENHOS[t]}
    </svg>
  )
}

// Modelo com quebra de linha permitida depois da barra (Chevrolet/ Trailblazer)
export function ModeloVtr({ modelo }) {
  const partes = String(modelo || '').split('/')
  return partes.map((x, i) => (
    <span key={i}>
      {x}
      {i < partes.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </span>
  ))
}
