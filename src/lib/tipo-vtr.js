// Tipos de viatura e dedução do tipo pelo modelo (para a silhueta em components/FiguraVtr.jsx).

export const TIPOS_VTR = {
  furgao: 'Furgão / van',
  suv: 'SUV',
  picape: 'Picape cabine dupla',
  sedan: 'Sedã / hatch',
  moto: 'Moto',
}

const PALAVRAS = [
  ['moto', /\b(moto|motocicleta|xre|xt\s?\d|cb\s?\d|tenere|falcon|lander|tiger|nx\s?\d|gs\s?\d)\b/],
  ['furgao', /\b(master|sprinter|ducato|boxer|jumper|daily|transit|kombi|van|furg[aã]o|micro|[oô]nibus)\b/],
  ['picape', /\b(ranger|hilux|s10|s-10|l200|amarok|frontier|toro|strada|saveiro|montana|maverick|oroch|picape|pick-?up|caminhonete)\b/],
  ['suv', /\b(duster|trailblazer|sw4|pajero|tracker|creta|compass|renegade|commander|kicks|t-cross|taos|ecosport|captur|hr-v|territory|tiguan|suv)\b/],
]

// Usa o tipo cadastrado; sem ele, deduz pelo modelo (VTR cadastradas antes do campo existir).
export function tipoDaViatura(v) {
  if (v?.tipo && TIPOS_VTR[v.tipo]) return v.tipo
  const m = String(v?.modelo || '').toLowerCase()
  for (const [tipo, re] of PALAVRAS) if (re.test(m)) return tipo
  return 'sedan'
}
