// Viaturas iniciais, a partir do relatório de 20 out. 2026.
// O coordenador corrige os dados na tela Viaturas.

export const VIATURAS_INICIAIS = [
  { prefixo: '17692', modelo: 'Renault/Master', combustivel: 'diesel', usaArla: false, temRadio: true, nova: true, kmAtual: 2713, ordem: 1 },
  { prefixo: '16843', modelo: 'Ford/Ranger', combustivel: 'diesel', usaArla: true, temRadio: true, nova: false, kmAtual: 29670, kmProxTroca: 45000, dataUltimaTroca: '2026-08-03', ordem: 2 },
  { prefixo: '13659', modelo: 'Chevrolet/Trailblazer', combustivel: 'diesel', usaArla: false, temRadio: true, nova: false, kmAtual: 97042, dataUltimaTroca: '2026-06-09', ordem: 3 },
  { prefixo: '14058', modelo: 'Chevrolet/Trailblazer', combustivel: 'diesel', usaArla: false, temRadio: true, nova: false, kmAtual: 91660, kmProxTroca: 96464, dataUltimaTroca: '2026-08-24', ordem: 4 },
  { prefixo: '15603', modelo: 'Renault/Duster', combustivel: 'flex', usaArla: false, temRadio: true, nova: false, kmAtual: 37510, dataProxTroca: '2026-11-04', ordem: 5 },
  { prefixo: '15591', modelo: 'Renault/Duster', combustivel: 'flex', usaArla: false, temRadio: true, nova: false, kmAtual: 47717, kmProxTroca: 53482, dataProxTroca: '2026-11-07', ordem: 6 },
  { prefixo: '18148', modelo: 'Renault/Duster', combustivel: 'flex', usaArla: false, temRadio: true, nova: true, kmAtual: 8252, ordem: 7 },
  { prefixo: '17950', modelo: 'Renault/Duster', combustivel: 'flex', usaArla: false, temRadio: true, nova: true, kmAtual: 8022, ordem: 8 },
  { prefixo: '18170', modelo: 'Renault/Duster', combustivel: 'flex', usaArla: false, temRadio: true, nova: true, kmAtual: 8560, ordem: 9 },
  { prefixo: 'C4', modelo: 'Comando EsFO', combustivel: 'flex', usaArla: false, temRadio: false, nova: false, kmAtual: 74418, kmProxTroca: 78150, dataProxTroca: '2027-02-02', ordem: 10 },
].map((v) => ({ situacao: 'ativa', ...v, id: `vtr-${v.prefixo.toLowerCase()}` }))

export const USUARIOS_DEMO = [
  { id: 'demo-matheus', posto: 'Cad. 1º PM', nome: 'Matheus', perfil: 'vistoriador' },
  { id: 'demo-leonardo', posto: 'Cad. 1º PM/2', nome: 'Leonardo', perfil: 'vistoriador' },
  { id: 'demo-coord', posto: 'Cad.', nome: 'Coordenador', perfil: 'coordenador' },
]
