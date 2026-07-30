"use client"

import React, { useEffect, useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Camera, Loader2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Drawer } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { useEmpresa } from "@/lib/contexts/empresa-context"

interface OrcamentoDrawerProps {
  open: boolean
  onClose: () => void
  orcamentoInicial: any | null
  onSalvo: () => void
}

const orcamentoSchema = z.object({
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  validade: z.string().optional().nullable(),
  desconto_tipo: z.enum(["percentual", "valor"]),
  desconto_valor: z.number(),
  observacoes: z.string().optional().nullable(),
  servicos: z.array(
    z.object({
      servico_id: z.string().min(1, "Serviço é obrigatório"),
      preco_aplicado: z.number().min(0, "Preço inválido"),
    })
  ).min(1, "Selecione ao menos um serviço"),
})

export type OrcamentoFormValues = {
  cliente_id: string
  data: string
  validade?: string | null
  desconto_tipo: "percentual" | "valor"
  desconto_valor: number
  observacoes?: string | null
  servicos: {
    servico_id: string
    preco_aplicado: number
  }[]
}

export function OrcamentoDrawer({ open, onClose, orcamentoInicial, onSalvo }: OrcamentoDrawerProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  
  // Options states
  const [clientes, setClientes] = useState<any[]>([])
  const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([])
  const { empresaId } = useEmpresa()

  // Upload/Photos states
  const [tempFiles, setTempFiles] = useState<File[]>([])
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string; signedUrl: string }[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrcamentoFormValues>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: {
      cliente_id: "",
      data: new Date().toISOString().slice(0, 10),
      validade: "",
      desconto_tipo: "valor",
      desconto_valor: 0,
      observacoes: "",
      servicos: [],
    },
  })

  const { fields: servicoFields, append: appendServico, remove: removeServico } = useFieldArray({
    control,
    name: "servicos",
  })

  const selectedClienteId = watch("cliente_id")
  const servicosSelecionados = watch("servicos") || []
  const descontoTipo = watch("desconto_tipo")
  const descontoValor = watch("desconto_valor") || 0

  // Fetch base options
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: listClientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome")
      setClientes(listClientes || [])

      const { data: listServicos } = await supabase
        .from("servicos")
        .select("id, nome, preco")
        .eq("ativo", true)
        .order("nome")
      setServicosDisponiveis(listServicos || [])
    }

    if (open) {
      loadData()
      setTempFiles([])
      setExistingPhotos([])
    }
  }, [open, supabase])

  // Load existing photos if editing
  useEffect(() => {
    async function loadPhotos() {
      if (!orcamentoInicial?.id || !open) return
      setLoadingPhotos(true)
      try {
        const { data: photos, error } = await supabase
          .from("orcamento_fotos")
          .select("id, url")
          .eq("orcamento_id", orcamentoInicial.id)

        if (error) throw error

        if (photos && photos.length > 0) {
          const signedPhotos = await Promise.all(
            photos.map(async (p) => {
              // The p.url contains the path in storage (e.g. {empresa_id}/orcamentos/{orcamento_id}/{filename})
              const { data, error: errSign } = await supabase.storage
                .from("anexos")
                .createSignedUrl(p.url, 3600)
              
              return {
                id: p.id,
                url: p.url,
                signedUrl: errSign ? "" : data?.signedUrl || "",
              }
            })
          )
          setExistingPhotos(signedPhotos)
        }
      } catch (err: any) {
        console.error("Erro ao carregar fotos:", err)
      } finally {
        setLoadingPhotos(false)
      }
    }

    loadPhotos()
  }, [orcamentoInicial, open, supabase])

  // Populate data when editing
  useEffect(() => {
    if (open && orcamentoInicial) {
      reset({
        cliente_id: orcamentoInicial.cliente_id,
        data: orcamentoInicial.data,
        validade: orcamentoInicial.validade || "",
        desconto_tipo: orcamentoInicial.desconto_tipo || "valor",
        desconto_valor: Number(orcamentoInicial.desconto_valor || 0),
        observacoes: orcamentoInicial.observacoes || "",
        servicos: (orcamentoInicial.orcamento_servicos || []).map((s: any) => ({
          servico_id: s.servico_id,
          preco_aplicado: Number(s.preco_aplicado),
        })),
      })
    } else if (open && !orcamentoInicial) {
      reset({
        cliente_id: "",
        data: new Date().toISOString().slice(0, 10),
        validade: "",
        desconto_tipo: "valor",
        desconto_valor: 0,
        observacoes: "",
        servicos: [],
      })
    }
  }, [open, orcamentoInicial, reset])

  const totalBruto = servicosSelecionados.reduce((acc, item) => acc + (item.preco_aplicado || 0), 0)
  const totalLiquido = Math.max(
    0,
    descontoTipo === "percentual"
      ? totalBruto * (1 - descontoValor / 100)
      : totalBruto - descontoValor
  )

  const handleAddServico = () => {
    if (servicosDisponiveis.length > 0) {
      appendServico({ servico_id: servicosDisponiveis[0].id, preco_aplicado: Number(servicosDisponiveis[0].preco) })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files)
      if (filesArr.length + tempFiles.length + existingPhotos.length > 20) {
        toast({
          variant: "warning",
          title: "Limite de fotos excedido",
          description: "O limite máximo é de 20 fotos por orçamento.",
        })
        return
      }
      setTempFiles(prev => [...prev, ...filesArr])
    }
  }

  const handleRemoveTempFile = (index: number) => {
    setTempFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingPhoto = async (photoId: string, urlPath: string) => {
    try {
      // 1. Delete from database
      const { error: errDb } = await supabase
        .from("orcamento_fotos")
        .delete()
        .eq("id", photoId)

      if (errDb) throw errDb

      // 2. Delete from storage
      await supabase.storage.from("anexos").remove([urlPath])

      setExistingPhotos(prev => prev.filter(p => p.id !== photoId))
      toast({
        variant: "success",
        title: "Foto removida",
      })
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Erro ao remover foto",
        description: err.message,
      })
    }
  }

  const onSubmit = async (values: OrcamentoFormValues) => {
    if (!empresaId) return

    startTransition(async () => {
      try {
        const payload = {
          empresa_id: empresaId,
          cliente_id: values.cliente_id,
          data: values.data,
          validade: values.validade || null,
          desconto_tipo: values.desconto_tipo,
          desconto_valor: values.desconto_valor,
          observacoes: values.observacoes || null,
          status: orcamentoInicial?.status || "pendente",
        }

        let orcamentoId = orcamentoInicial?.id

        if (orcamentoId) {
          // Update
          const { error: errUpdate } = await supabase
            .from("orcamentos")
            .update(payload)
            .eq("id", orcamentoId)
          if (errUpdate) throw errUpdate

          // Sync Services
          const { error: errDelServ } = await supabase
            .from("orcamento_servicos")
            .delete()
            .eq("orcamento_id", orcamentoId)
          if (errDelServ) throw errDelServ

          const payloadServicos = values.servicos.map(s => ({
            empresa_id: empresaId,
            orcamento_id: orcamentoId,
            servico_id: s.servico_id,
            preco_aplicado: s.preco_aplicado,
          }))

          const { error: errInsServ } = await supabase
            .from("orcamento_servicos")
            .insert(payloadServicos)
          if (errInsServ) throw errInsServ
        } else {
          // Create
          const { data: newOrcamento, error: errInsert } = await supabase
            .from("orcamentos")
            .insert(payload)
            .select("id")
            .single()

          if (errInsert || !newOrcamento) throw errInsert
          orcamentoId = newOrcamento.id

          const payloadServicos = values.servicos.map(s => ({
            empresa_id: empresaId,
            orcamento_id: orcamentoId,
            servico_id: s.servico_id,
            preco_aplicado: s.preco_aplicado,
          }))

          const { error: errInsServ } = await supabase
            .from("orcamento_servicos")
            .insert(payloadServicos)
          if (errInsServ) throw errInsServ
        }

        // Upload new photos
        for (const file of tempFiles) {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${fileExt}`
          const storagePath = `${empresaId}/orcamentos/${orcamentoId}/${fileName}`

          const { error: errUpload } = await supabase.storage
            .from("anexos")
            .upload(storagePath, file)

          if (errUpload) throw errUpload

          // Insert photo record
          const { error: errFoto } = await supabase
            .from("orcamento_fotos")
            .insert({
              empresa_id: empresaId,
              orcamento_id: orcamentoId,
              url: storagePath,
            })

          if (errFoto) throw errFoto
        }

        toast({
          variant: "success",
          title: orcamentoInicial ? "Orçamento atualizado" : "Orçamento criado",
          description: "Os dados foram salvos com sucesso.",
        })

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
      title={orcamentoInicial ? "Editar Orçamento" : "Novo Orçamento"}
      subtitle="Defina os serviços orçados, descontos e insira fotos"
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
        <div className="space-y-4">
          <Select
            label="Cliente *"
            value={selectedClienteId}
            onChange={(val) => setValue("cliente_id", val)}
            options={clientes.map(c => ({ value: c.id, label: c.nome }))}
            searchable
            placeholder="Selecione um cliente..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data *"
              type="date"
              error={errors.data?.message}
              {...register("data")}
            />
            <Input
              label="Validade"
              type="date"
              error={errors.validade?.message}
              {...register("validade")}
            />
          </div>

          <Textarea
            label="Observações"
            placeholder="Alguma observação comercial ou técnica..."
            {...register("observacoes")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Desconto"
              value={descontoTipo}
              onChange={(val) => setValue("desconto_tipo", val as any)}
              options={[
                { value: "valor", label: "Valor ($)" },
                { value: "percentual", label: "Pct (%)" },
              ]}
            />
            <Input
              label="Desconto"
              type="number"
              step="any"
              {...register("desconto_valor", { valueAsNumber: true })}
            />
          </div>
        </div>

        <hr className="border-border" />

        {/* Serviços */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Serviços Orçados</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={handleAddServico}
            >
              Adicionar Serviço
            </Button>
          </div>

          {servicoFields.map((field, index) => {
            const currentServId = watch(`servicos.${index}.servico_id`)
            return (
              <div key={field.id} className="flex gap-3 items-end p-3 bg-surface border border-border rounded relative">
                <button
                  type="button"
                  onClick={() => removeServico(index)}
                  className="absolute -top-2 -right-2 text-text-secondary hover:text-danger bg-surface border border-border p-1 rounded-full transition-colors"
                >
                  <Trash2 size={12} />
                </button>

                <div className="flex-1">
                  <Select
                    label="Serviço"
                    value={currentServId}
                    onChange={(val) => {
                      setValue(`servicos.${index}.servico_id`, val)
                      const sObj = servicosDisponiveis.find(s => s.id === val)
                      if (sObj) {
                        setValue(`servicos.${index}.preco_aplicado`, Number(sObj.preco))
                      }
                    }}
                    options={servicosDisponiveis.map(s => ({ value: s.id, label: s.nome }))}
                  />
                </div>

                <div className="w-32">
                  <Input
                    label="Preço Unitário"
                    type="number"
                    step="0.01"
                    error={errors.servicos?.[index]?.preco_aplicado?.message}
                    {...register(`servicos.${index}.preco_aplicado` as const, { valueAsNumber: true })}
                  />
                </div>
              </div>
            )
          })}

          {servicoFields.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-2 bg-surface/30 rounded border border-dashed border-border/55">
              Nenhum serviço orçado.
            </p>
          )}

          {servicoFields.length > 0 && (
            <div className="p-3 bg-surface rounded border border-border flex items-center justify-between text-sm">
              <span className="text-text-secondary font-medium">Total do Orçamento:</span>
              <span className="text-text-primary font-semibold tabular-nums">
                {totalLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          )}
        </div>

        <hr className="border-border" />

        {/* Fotos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
              <Camera size={14} /> Fotos de Anexo ({tempFiles.length + existingPhotos.length}/20)
            </h3>
            <label className="cursor-pointer inline-flex items-center justify-center font-inter font-medium rounded h-8 px-3 text-xs gap-1.5 bg-surface border border-border text-text-primary hover:bg-surface-hover transition-colors">
              <Plus size={14} /> Adicionar Fotos
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Existing Photos list */}
          {existingPhotos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-semibold text-text-secondary">Fotos Salvas</p>
              <div className="grid grid-cols-4 gap-2">
                {existingPhotos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square border border-border rounded overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.signedUrl} alt="Orçamento" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingPhoto(photo.id, photo.url)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Temp Files list */}
          {tempFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-semibold text-text-secondary">Novas Fotos (Aguardando Salvar)</p>
              <div className="grid grid-cols-4 gap-2">
                {tempFiles.map((file, idx) => {
                  const url = URL.createObjectURL(file)
                  return (
                    <div key={idx} className="relative aspect-square border border-border rounded overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Nova" className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => handleRemoveTempFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {existingPhotos.length === 0 && tempFiles.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-4 bg-surface/30 rounded border border-dashed border-border/55">
              Nenhuma foto anexada.
            </p>
          )}

          {loadingPhotos && (
            <div className="flex justify-center py-2 text-text-secondary text-xs items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Carregando fotos...
            </div>
          )}
        </div>
      </form>
    </Drawer>
  )
}
