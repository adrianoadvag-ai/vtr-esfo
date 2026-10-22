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

import { hojeISO, segundaDa, somarDias } from '../lib/formato'

export const USUARIOS_DEMO = [
  { id: 'demo-coord', posto: 'Cad.', nome: 'Romeiro', nomeInteiro: 'Adriano Romeiro', pelotao: '1º Pelotão Alfa', telefone: '41999990001', email: 'romeiro@exemplo.com', perfil: 'coordenador' },
  { id: 'demo-muniz', posto: 'Cad.', nome: 'Muniz', nomeInteiro: 'Lucas Muniz', pelotao: '1º Pelotão Alfa', telefone: '41999990002', email: 'muniz@exemplo.com', perfil: 'vistoriador' },
  { id: 'demo-vitor', posto: 'Cad.', nome: 'Vitor Luiz', nomeInteiro: 'Vitor Luiz Santos', pelotao: '1º Pelotão Bravo', telefone: '41999990003', email: 'vitor@exemplo.com', perfil: 'vistoriador' },
  { id: 'demo-forcassim', posto: 'Cad.', nome: 'Forcassim', nomeInteiro: 'Pedro Forcassim', pelotao: '1º Pelotão Bravo', telefone: '41999990004', email: 'forcassim@exemplo.com', perfil: 'vistoriador' },
  { id: 'demo-leonardo', posto: 'Cad.', nome: 'Leonardo', email: 'leonardo@exemplo.com', perfil: 'vistoriador' },
  { id: 'demo-denichevicz', posto: 'Cad.', nome: 'Denichevicz', nomeInteiro: 'Rafael Denichevicz', pelotao: '1º Pelotão Alfa', telefone: '41999990006', email: 'denichevicz@exemplo.com', perfil: 'supervisao' },
  { id: 'demo-novo', posto: 'Cad.', nome: 'Ítalo', email: 'italo@exemplo.com', perfil: 'pendente' },
]

// Escala da semana atual para a demonstração
export function escalaDemo() {
  const seg = segundaDa(hojeISO())
  const p = (id, nome) => ({ id, nome: `Cad. ${nome}` })
  const dias = {
    [seg]: { responsaveis: [p('demo-muniz', 'Muniz'), p('demo-leonardo', 'Leonardo')], supervisor: p('demo-coord', 'Romeiro') },
    [somarDias(seg, 1)]: { responsaveis: [p('demo-muniz', 'Muniz')], supervisor: p('demo-denichevicz', 'Denichevicz') },
    [somarDias(seg, 2)]: { responsaveis: [p('demo-vitor', 'Vitor Luiz')], supervisor: { nome: 'Cad. Euzébio' } },
    [somarDias(seg, 3)]: { responsaveis: [p('demo-forcassim', 'Forcassim')], supervisor: p('demo-coord', 'Romeiro') },
    [somarDias(seg, 4)]: { responsaveis: [p('demo-leonardo', 'Leonardo')], supervisor: p('demo-coord', 'Romeiro') },
  }
  return { [seg]: { semana: seg, dias } }
}
