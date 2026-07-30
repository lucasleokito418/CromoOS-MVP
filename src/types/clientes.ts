export interface Veiculo {
  id?: string
  tipo: 'carro' | 'moto'
  marca: string
  modelo: string
  cor?: string
  placa?: string
}

export interface Estofado {
  id?: string
  descricao: string
  cor?: string
}

export interface Cliente extends Record<string, unknown> {
  id: string
  nome: string
  whatsapp?: string | null
  whatsapp_opt_in?: boolean
  telefone_extra?: string | null
  email?: string | null
  cpf_cnpj?: string | null
  origem?: string | null
  data_nascimento?: string | null
  estado?: string | null
  cidade?: string | null
  observacoes?: string | null
  score?: number
  criado_em: string
  veiculos: Veiculo[]
  estofados: Estofado[]
}
