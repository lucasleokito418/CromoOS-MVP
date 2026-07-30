'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Mic, MicOff, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { CardBriefing } from './CardBriefing'
import { BriefingDiario } from '@/lib/ia/briefing'
import {
  obterHistoricoMensagens,
  enviarMensagemAssistente,
  transcreverAudio,
} from '@/app/actions/assistente'

interface AssistenteClientProps {
  initialBriefing: BriefingDiario
  userDisplayName: string
}

interface Mensagem {
  id?: string
  papel: 'usuario' | 'assistente'
  conteudo: string
  criado_em?: string
}

export function AssistenteClient({ initialBriefing, userDisplayName }: AssistenteClientProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [enviando, setEnviando] = useState(false)
  
  // Áudio/Gravação
  const [gravando, setGravando] = useState(false)
  const [transcrevendo, setTranscrevendo] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Carrega histórico inicial
  useEffect(() => {
    async function carregar() {
      try {
        const hist = await obterHistoricoMensagens()
        setMensagens(hist as Mensagem[])
      } catch (err) {
        console.error('Erro ao carregar histórico:', err)
      } finally {
        setCarregandoHistorico(false)
      }
    }
    carregar()
  }, [])

  // Auto-scroll para a última mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, enviando, transcrevendo])

  const handleEnviar = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!texto.trim() || enviando || transcrevendo) return

    const mensagemUsuario = texto.trim()
    setTexto('')
    setEnviando(true)

    // Adiciona localmente a mensagem do usuário
    setMensagens((prev) => [...prev, { papel: 'usuario', conteudo: mensagemUsuario }])

    try {
      const res = await enviarMensagemAssistente(mensagemUsuario)
      if (res.error) {
        // Se der erro, o Server Action já retornou um fallback amigável ou o erro
        setMensagens((prev) => [
          ...prev,
          { papel: 'assistente', conteudo: res.resposta || `Erro: ${res.error}` },
        ])
      } else if (res.resposta) {
        setMensagens((prev) => [...prev, { papel: 'assistente', conteudo: res.resposta! }])
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      setMensagens((prev) => [
        ...prev,
        { papel: 'assistente', conteudo: 'Ocorreu um erro ao processar a resposta. Tente novamente.' },
      ])
    } finally {
      setEnviando(false)
    }
  }

  // Gravação de Áudio
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        
        // Para parar os tracks do microfone
        stream.getTracks().forEach((track) => track.stop())

        // Envia para o backend para transcrição
        setTranscrevendo(true)
        try {
          const formData = new FormData()
          // Whisper precisa de extensão de arquivo para identificar formato
          const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
          formData.append('file', file)

          const res = await transcreverAudio(formData)
          if (res.error) {
            alert(`Erro na transcrição: ${res.error}`)
          } else if (res.text && res.text.trim()) {
            // Insere o texto no input e já submete a mensagem
            setTexto(res.text)
          }
        } catch (err) {
          console.error('Erro ao processar áudio:', err)
        } finally {
          setTranscrevendo(false)
        }
      }

      mediaRecorder.start()
      setGravando(true)
    } catch (err) {
      console.error('Erro ao acessar microfone:', err)
      alert('Não foi possível acessar seu microfone. Verifique as permissões do navegador.')
    }
  }

  const pararGravacao = () => {
    if (mediaRecorderRef.current && gravando) {
      mediaRecorderRef.current.stop()
      setGravando(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] bg-canvas">
      {/* Header com Briefing Fixo */}
      <div className="p-4 border-b border-border/50 bg-canvas shrink-0">
        <CardBriefing briefing={initialBriefing} />
      </div>

      {/* Histórico de Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 flex flex-col">
        {carregandoHistorico ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-2">
            <Loader2 className="animate-spin text-text-primary" size={24} />
            <span className="text-xs">Carregando conversa...</span>
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="flex flex-col items-center gap-4">
              <img
                src="/icon-owl.png"
                alt=""
                className="w-32 h-32 object-contain select-none"
                style={{ filter: 'grayscale(100%)', opacity: 0.15 }}
              />
              <div className="space-y-3">
                <h2 className="text-3xl font-oswald font-semibold text-text-primary">Como posso te ajudar hoje?</h2>
                <p className="text-xs text-text-secondary">
                  Você pode perguntar sobre agendamentos de hoje, resumo financeiro do mês, dados de algum cliente, orçamentos pendentes e mais.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-4">
            {mensagens.map((msg, idx) => {
              const isUser = msg.papel === 'usuario'
              return (
                <div
                  key={idx}
                  className={[
                    'flex gap-3 max-w-[85%]',
                    isUser ? 'self-end flex-row-reverse' : 'self-start',
                  ].join(' ')}
                >
                  <Avatar
                    name={isUser ? userDisplayName : 'IA'}
                    src={!isUser ? undefined : undefined} // IA usa iniciais ou avatar
                    size="sm"
                    className={!isUser ? 'bg-zinc-800 text-text-primary border border-border/50' : 'bg-accent text-accent-on'}
                  />
                  <div
                    className={[
                      'rounded p-3.5 text-sm leading-relaxed border',
                      isUser
                        ? 'bg-surface border-border/80 text-text-primary rounded-tr-none'
                        : 'bg-surface/30 border-border/30 text-text-primary rounded-tl-none',
                    ].join(' ')}
                  >
                    <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                  </div>
                </div>
              )
            })}

            {/* Indicador de Envio/Pensamento */}
            {enviando && (
              <div className="flex gap-3 max-w-[85%] self-start items-center">
                <Avatar name="IA" size="sm" className="bg-zinc-800 text-text-primary border border-border/50" />
                <div className="rounded-r rounded-b bg-surface/30 border border-border/30 p-3.5 text-sm flex items-center gap-2 text-text-secondary">
                  <Loader2 className="animate-spin text-text-primary" size={14} />
                  <span>Kaboré OS IA está analisando os dados...</span>
                </div>
              </div>
            )}

            {/* Indicador de Transcrição */}
            {transcrevendo && (
              <div className="flex gap-3 max-w-[85%] self-end flex-row-reverse items-center">
                <Avatar name={userDisplayName} size="sm" className="bg-accent text-accent-on" />
                <div className="rounded-l rounded-b bg-surface border border-border p-3.5 text-sm flex items-center gap-2 text-text-secondary">
                  <Loader2 className="animate-spin text-text-primary" size={14} />
                  <span>Transcrevendo áudio...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Caixa de Entrada de Texto / Áudio */}
      <div className="p-4 bg-canvas border-t border-border/50 shrink-0">
        <form onSubmit={handleEnviar} className="max-w-3xl mx-auto flex items-end gap-2 relative">
          <div className="flex-1 relative flex items-center bg-surface border border-border rounded focus-within:border-text-secondary/50 transition-colors">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEnviar()
                }
              }}
              placeholder={gravando ? 'Gravando áudio...' : 'Pergunte algo para o assistente...'}
              disabled={enviando || transcrevendo || gravando}
              rows={1}
              className={[
                'w-full bg-transparent border-none text-sm p-3.5 pr-12 outline-none resize-none text-text-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed max-h-[120px]',
              ].join(' ')}
            />

            {/* Botão de Gravação de Áudio */}
            <div className="absolute right-2 bottom-2">
              {gravando ? (
                <button
                  type="button"
                  onClick={pararGravacao}
                  className="p-2 rounded bg-danger hover:bg-danger/80 text-white animate-pulse"
                  title="Parar gravação"
                >
                  <MicOff size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={iniciarGravacao}
                  disabled={enviando || transcrevendo}
                  className="p-2 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Gravar áudio"
                >
                  <Mic size={16} />
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!texto.trim() || enviando || transcrevendo || gravando}
            className="h-[48px] px-5 rounded shrink-0 font-semibold"
            iconLeft={<Send size={16} />}
          >
            Enviar
          </Button>
        </form>
      </div>
    </div>
  )
}
