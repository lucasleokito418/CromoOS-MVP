"use client"

import React, { useEffect, useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Car, Bike, Sparkles } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Drawer } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Toggle } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"
import { type Cliente, type Veiculo, type Estofado } from "@/types/clientes"

const ORIGEM_OPTIONS = [
  { value: "sistema", label: "Sistema" },
  { value: "meta_ads", label: "Instagram/Facebook" },
  { value: "google_ads", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
]

const MONTADORAS_CARRO = [
  { value: "Chevrolet", label: "Chevrolet" },
  { value: "Fiat", label: "Fiat" },
  { value: "Ford", label: "Ford" },
  { value: "Honda", label: "Honda" },
  { value: "Hyundai", label: "Hyundai" },
  { value: "Jeep", label: "Jeep" },
  { value: "Renault", label: "Renault" },
  { value: "Toyota", label: "Toyota" },
  { value: "Volkswagen", label: "Volkswagen" },
  { value: "Outra", label: "Outra" },
]

const MONTADORAS_MOTO = [
  { value: "Honda", label: "Honda" },
  { value: "Yamaha", label: "Yamaha" },
  { value: "Suzuki", label: "Suzuki" },
  { value: "Kawasaki", label: "Kawasaki" },
  { value: "BMW", label: "BMW" },
  { value: "Outra", label: "Outra" },
]

const clientSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  whatsapp: z.string().optional().nullable(),
  whatsapp_opt_in: z.boolean(),
  telefone_extra: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
  cpf_cnpj: z.string().optional().nullable(),
  origem: z.string().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  veiculos: z.array(z.object({
    id: z.string().optional(),
    tipo: z.enum(["carro", "moto"]),
    marca: z.string().min(1, "Marca é obrigatória"),
    modelo: z.string().min(1, "Modelo é obrigatório"),
    cor: z.string().optional().nullable(),
    placa: z.string().optional().nullable(),
  })),
  estofados: z.array(z.object({
    id: z.string().optional(),
    descricao: z.string().min(1, "Descrição é obrigatória"),
    cor: z.string().optional().nullable(),
  })),
})

export type ClientFormValues = {
  nome: string
  whatsapp?: string | null
  whatsapp_opt_in: boolean
  telefone_extra?: string | null
  email?: string | null
  cpf_cnpj?: string | null
  origem?: string | null
  data_nascimento?: string | null
  estado?: string | null
  cidade?: string | null
  observacoes?: string | null
  veiculos: {
    id?: string
    tipo: "carro" | "moto"
    marca: string
    modelo: string
    cor?: string | null
    placa?: string | null
  }[]
  estofados: {
    id?: string
    descricao: string
    cor?: string | null
  }[]
}

interface ClienteDrawerProps {
  open: boolean
  onClose: () => void
  clienteInicial: Cliente | null
  onSalvo: () => void
}

export function ClienteDrawer({ open, onClose, clienteInicial, onSalvo }: ClienteDrawerProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const { empresaId } = useEmpresa()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: "",
      whatsapp: "",
      whatsapp_opt_in: true,
      telefone_extra: "",
      email: "",
      cpf_cnpj: "",
      origem: "sistema",
      data_nascimento: "",
      estado: "",
      cidade: "",
      observacoes: "",
      veiculos: [],
      estofados: [],
    },
  })

  const { fields: veiculoFields, append: appendVeiculo, remove: removeVeiculo } = useFieldArray({
    control,
    name: "veiculos",
  })

  const { fields: estofadoFields, append: appendEstofado, remove: removeEstofado } = useFieldArray({
    control,
    name: "estofados",
  })

  // Watch fields for reactive states
  const veiculosList = watch("veiculos")

  // Reset form when opening/changing initial values
  useEffect(() => {
    if (open) {
      if (clienteInicial) {
        reset({
          nome: clienteInicial.nome,
          whatsapp: clienteInicial.whatsapp || "",
          whatsapp_opt_in: clienteInicial.whatsapp_opt_in ?? true,
          telefone_extra: clienteInicial.telefone_extra || "",
          email: clienteInicial.email || "",
          cpf_cnpj: clienteInicial.cpf_cnpj || "",
          origem: clienteInicial.origem || "sistema",
          data_nascimento: clienteInicial.data_nascimento || "",
          estado: (clienteInicial.endereco as any)?.estado || "",
          cidade: (clienteInicial.endereco as any)?.cidade || "",
          observacoes: clienteInicial.observacoes || "",
          veiculos: clienteInicial.veiculos || [],
          estofados: clienteInicial.estofados || [],
        })
      } else {
        reset({
          nome: "",
          whatsapp: "",
          whatsapp_opt_in: true,
          telefone_extra: "",
          email: "",
          cpf_cnpj: "",
          origem: "sistema",
          data_nascimento: "",
          estado: "",
          cidade: "",
          observacoes: "",
          veiculos: [],
          estofados: [],
        })
      }
    }
  }, [open, clienteInicial, reset])

  const onSubmit = async (values: ClientFormValues) => {
    if (!empresaId) {
      toast({
        variant: "error",
        title: "Erro de permissão",
        description: "Não foi possível carregar a empresa atual.",
      })
      return
    }

    startTransition(async () => {
      try {
        const payloadCliente = {
          empresa_id: empresaId,
          nome: values.nome,
          whatsapp: values.whatsapp || null,
          whatsapp_opt_in: values.whatsapp_opt_in,
          telefone_extra: values.telefone_extra || null,
          email: values.email || null,
          cpf_cnpj: values.cpf_cnpj || null,
          origem: values.origem || null,
          data_nascimento: values.data_nascimento || null,
          observacoes: values.observacoes || null,
          endereco: {
            estado: values.estado || "",
            cidade: values.cidade || "",
          },
        }

        let clientId = clienteInicial?.id

        if (clientId) {
          // Update client
          const { error: errCliente } = await supabase
            .from("clientes")
            .update(payloadCliente)
            .eq("id", clientId)

          if (errCliente) throw errCliente

          // Sync Vehicles
          // Delete removed vehicles
          const keptVeiculoIds = values.veiculos.map(v => v.id).filter(Boolean)
          const { error: errDelV } = await supabase
            .from("veiculos")
            .delete()
            .eq("cliente_id", clientId)
            .not("id", "in", `(${keptVeiculoIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
          if (errDelV) throw errDelV

          // Insert / Update vehicles
          for (const v of values.veiculos) {
            const payloadVeiculo = {
              empresa_id: empresaId,
              cliente_id: clientId,
              tipo: v.tipo,
              marca: v.marca,
              modelo: v.modelo,
              cor: v.cor || null,
              placa: v.placa || null,
            }
            if (v.id) {
              await supabase.from("veiculos").update(payloadVeiculo).eq("id", v.id)
            } else {
              await supabase.from("veiculos").insert(payloadVeiculo)
            }
          }

          // Sync Estofados
          const keptEstofadoIds = values.estofados.map(e => e.id).filter(Boolean)
          const { error: errDelE } = await supabase
            .from("estofados")
            .delete()
            .eq("cliente_id", clientId)
            .not("id", "in", `(${keptEstofadoIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
          if (errDelE) throw errDelE

          for (const est of values.estofados) {
            const payloadEstofado = {
              empresa_id: empresaId,
              cliente_id: clientId,
              descricao: est.descricao,
              cor: est.cor || null,
            }
            if (est.id) {
              await supabase.from("estofados").update(payloadEstofado).eq("id", est.id)
            } else {
              await supabase.from("estofados").insert(payloadEstofado)
            }
          }

          toast({
            variant: "success",
            title: "Cliente atualizado",
            description: "Os dados foram salvos com sucesso.",
          })
        } else {
          // Insert client
          const { data: newClient, error: errCliente } = await supabase
            .from("clientes")
            .insert(payloadCliente)
            .select("id")
            .single()

          if (errCliente || !newClient) throw errCliente
          clientId = newClient.id

          // Insert vehicles
          if (values.veiculos.length > 0) {
            const payloadVeiculos = values.veiculos.map(v => ({
              empresa_id: empresaId,
              cliente_id: clientId!,
              tipo: v.tipo,
              marca: v.marca,
              modelo: v.modelo,
              cor: v.cor || null,
              placa: v.placa || null,
            }))
            const { error: errVeiculos } = await supabase.from("veiculos").insert(payloadVeiculos)
            if (errVeiculos) throw errVeiculos
          }

          // Insert estofados
          if (values.estofados.length > 0) {
            const payloadEstofados = values.estofados.map(est => ({
              empresa_id: empresaId,
              cliente_id: clientId!,
              descricao: est.descricao,
              cor: est.cor || null,
            }))
            const { error: errEstofados } = await supabase.from("estofados").insert(payloadEstofados)
            if (errEstofados) throw errEstofados
          }

          toast({
            variant: "success",
            title: "Cliente cadastrado",
            description: "Cadastro realizado com sucesso.",
          })
        }

        onSalvo()
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Erro ao salvar",
          description: err.message || "Erro desconhecido.",
        })
      }
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={clienteInicial ? "Editar Cliente" : "Novo Cliente"}
      subtitle={clienteInicial ? `Visualizando dados de ${clienteInicial.nome}` : "Cadastre um novo cliente e seus ativos"}
      maxWidth={520}
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isPending}>
            Salvar
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Dados Principais</h3>
          
          <Input
            label="Nome *"
            placeholder="Nome completo do cliente"
            error={errors.nome?.message}
            {...register("nome")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="WhatsApp"
              placeholder="(00) 00000-0000"
              error={errors.whatsapp?.message}
              {...register("whatsapp")}
            />
            <Input
              label="Telefone Extra"
              placeholder="(00) 0000-0000"
              error={errors.telefone_extra?.message}
              {...register("telefone_extra")}
            />
          </div>

          <div className="py-1">
            <Toggle
              label="WhatsApp Opt-in"
              description="Cliente aceita receber notificações automáticas via WhatsApp"
              checked={watch("whatsapp_opt_in")}
              onChange={(checked) => setValue("whatsapp_opt_in", checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="E-mail"
              placeholder="exemplo@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="CPF / CNPJ"
              placeholder="Apenas números"
              error={errors.cpf_cnpj?.message}
              {...register("cpf_cnpj")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Origem"
              value={watch("origem") || "sistema"}
              onChange={(val) => setValue("origem", val)}
              options={ORIGEM_OPTIONS}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              error={errors.data_nascimento?.message}
              {...register("data_nascimento")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Estado (UF)"
              placeholder="Ex: SP"
              maxLength={2}
              error={errors.estado?.message}
              {...register("estado")}
            />
            <Input
              label="Cidade"
              placeholder="Ex: São Paulo"
              error={errors.cidade?.message}
              {...register("cidade")}
            />
          </div>

          <Textarea
            label="Observações"
            placeholder="Informações adicionais importantes..."
            error={errors.observacoes?.message}
            {...register("observacoes")}
          />
        </div>

        <hr className="border-border" />

        {/* Veículos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Car size={14} /> Veículos
            </h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => appendVeiculo({ tipo: "carro", marca: "Chevrolet", modelo: "", cor: "", placa: "" })}
            >
              Adicionar
            </Button>
          </div>

          {veiculoFields.map((field, index) => {
            const tipo = watch(`veiculos.${index}.tipo`)
            const montadoras = tipo === "carro" ? MONTADORAS_CARRO : MONTADORAS_MOTO
            return (
              <div key={field.id} className="p-4 bg-surface border border-border rounded relative space-y-3">
                <button
                  type="button"
                  onClick={() => removeVeiculo(index)}
                  className="absolute top-3 right-3 text-text-secondary hover:text-danger p-1 rounded hover:bg-surface-hover transition-colors"
                >
                  <Trash2 size={14} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                  <Select
                    label="Tipo"
                    value={tipo}
                    onChange={(val) => {
                      setValue(`veiculos.${index}.tipo`, val as "carro" | "moto")
                      setValue(`veiculos.${index}.marca`, val === "carro" ? "Chevrolet" : "Honda")
                    }}
                    options={[
                      { value: "carro", label: "Carro" },
                      { value: "moto", label: "Moto" },
                    ]}
                  />
                  <Select
                    label="Marca"
                    value={watch(`veiculos.${index}.marca`)}
                    onChange={(val) => setValue(`veiculos.${index}.marca`, val)}
                    options={montadoras}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <Input
                      label="Modelo"
                      placeholder="Ex: Civic"
                      error={errors.veiculos?.[index]?.modelo?.message}
                      {...register(`veiculos.${index}.modelo` as const)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Cor"
                      placeholder="Ex: Preto"
                      {...register(`veiculos.${index}.cor` as const)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Placa"
                      placeholder="ABC-1234"
                      {...register(`veiculos.${index}.placa` as const)}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {veiculoFields.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-2 bg-surface/30 rounded border border-dashed border-border/55">
              Nenhum veículo adicionado ainda.
            </p>
          )}
        </div>

        <hr className="border-border" />

        {/* Estofados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} /> Estofados / Outros Ativos
            </h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => appendEstofado({ descricao: "", cor: "" })}
            >
              Adicionar
            </Button>
          </div>

          {estofadoFields.map((field, index) => (
            <div key={field.id} className="p-4 bg-surface border border-border rounded relative space-y-3">
              <button
                type="button"
                onClick={() => removeEstofado(index)}
                className="absolute top-3 right-3 text-text-secondary hover:text-danger p-1 rounded hover:bg-surface-hover transition-colors"
              >
                <Trash2 size={14} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                <Input
                  label="Descrição *"
                  placeholder="Ex: Sofá retrátil 3 lugares"
                  error={errors.estofados?.[index]?.descricao?.message}
                  {...register(`estofados.${index}.descricao` as const)}
                />
                <Input
                  label="Cor"
                  placeholder="Ex: Cinza"
                  {...register(`estofados.${index}.cor` as const)}
                />
              </div>
            </div>
          ))}

          {estofadoFields.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-2 bg-surface/30 rounded border border-dashed border-border/55">
              Nenhum estofado/outro ativo adicionado ainda.
            </p>
          )}
        </div>
      </form>
    </Drawer>
  )
}
