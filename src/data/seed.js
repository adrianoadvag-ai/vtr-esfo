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

// Equipe da demonstração, a partir da escala de out. 2026
// (chaves de função: coordenador = Comandante, supervisor = Gestor, responsavel = Supervisor, auxiliar = Responsável)
const pessoa = (id, posto, nome, funcao, extra = {}) => ({ id: `demo-${id}`, posto, nome, funcao, perfil: funcao === 'coordenador' ? 'coordenador' : 'vistoriador', email: `${id}@exemplo.com`, ...extra })

export const USUARIOS_DEMO = [
  pessoa('romeiro', 'Cad.', 'Romeiro', 'responsavel', { perfil: 'admin', nomeInteiro: 'Adriano Romeiro', pelotao: '1º Pelotão Alfa', telefone: '41999990001' }),
  pessoa('tenente', 'Ten.', 'Comandante', 'coordenador'),
  pessoa('barata', 'Cad.', 'Barata', 'supervisor'),
  pessoa('matumoto', 'Cad.', 'Matumoto', 'supervisor'),
  pessoa('vinicius', 'Cad.', 'Vinícius', 'supervisor'),
  pessoa('euzebio', 'Cad.', 'Euzébio', 'responsavel'),
  pessoa('italo', 'Cad.', 'Ítalo', 'responsavel'),
  pessoa('matheus', 'Cad.', 'Matheus', 'responsavel'),
  pessoa('guedes', 'Cad.', 'Guedes', 'responsavel'),
  pessoa('kutianski', 'Cad.', 'Kutianski', 'responsavel'),
  pessoa('leonardo', 'Cad.', 'Leonardo', 'auxiliar'),
  pessoa('ronald', 'Cad.', 'Ronald', 'auxiliar'),
  pessoa('muniz', 'Cad.', 'Muniz', 'auxiliar', { nomeInteiro: 'Lucas Muniz', pelotao: '1º Pelotão Alfa', telefone: '41999990002' }),
  pessoa('vitor', 'Cad.', 'Vitor Luiz', 'auxiliar'),
  pessoa('forcassim', 'Cad.', 'Forcassim', 'auxiliar'),
  { id: 'demo-novo', posto: 'Cad.', nome: 'Castro', email: 'castro@exemplo.com', perfil: 'pendente' },
]

// Escala da semana atual para a demonstração (como na planilha de 05/10/2026)
export function escalaDemo() {
  const seg = segundaDa(hojeISO())
  const p = (id) => {
    const u = USUARIOS_DEMO.find((x) => x.id === `demo-${id}`)
    return { id: u.id, nome: `${u.posto} ${u.nome}` }
  }
  const dia = (resp, aux, sup) => ({ responsaveis: resp.map(p), auxiliares: [p(aux)], supervisor: p(sup) })
  const dias = {
    [seg]: dia(['euzebio', 'italo'], 'leonardo', 'matumoto'),
    [somarDias(seg, 1)]: dia(['matheus'], 'ronald', 'vinicius'),
    [somarDias(seg, 2)]: dia(['guedes'], 'muniz', 'barata'),
    [somarDias(seg, 3)]: dia(['romeiro'], 'vitor', 'matumoto'),
    [somarDias(seg, 4)]: dia(['kutianski'], 'forcassim', 'vinicius'),
  }
  return { [seg]: { semana: seg, dias } }
}
