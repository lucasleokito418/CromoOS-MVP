"use client"

import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

interface PdfComprovanteProps {
  venda: any
  empresa: any
  formato: "A4" | "notinha" | "notinha_mini"
}

// Custom styles for each layout
const styles = StyleSheet.create({
  // Base
  page: {
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
    marginBottom: 5,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
  },
  infoLabel: {
    color: "#666",
  },
  infoVal: {
    fontWeight: "medium",
  },
  
  // Table
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  colDesc: {
    flex: 2,
    fontSize: 9,
  },
  colPrice: {
    flex: 1,
    textAlign: "right",
    fontSize: 9,
  },

  // Totals
  totalsBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    fontSize: 10,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    fontSize: 12,
    fontWeight: "bold",
  },

  // A4 specific
  a4Page: {
    padding: 30,
    fontSize: 10,
  },
  a4HeaderRight: {
    textAlign: "right",
  },

  // Thermal receipts specific
  thermalPage: {
    padding: 10,
    fontSize: 8,
  },
  centerText: {
    textAlign: "center",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "dashed",
    marginVertical: 6,
  },
})

export function PdfComprovante({ venda, empresa, formato }: PdfComprovanteProps) {
  const sum = venda.venda_servicos?.reduce((acc: number, s: any) => acc + Number(s.preco_aplicado), 0) || 0
  const desc = Number(venda.desconto_valor || 0)
  const total = Math.max(
    0,
    venda.desconto_tipo === "percentual" ? sum * (1 - desc / 100) : sum - desc
  )

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const dataVenda = new Date(venda.criado_em).toLocaleDateString("pt-BR")
  const horaVenda = new Date(venda.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  if (formato === "A4") {
    return (
      <Document>
        <Page size="A4" style={[styles.page, styles.a4Page]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={styles.title}>{empresa?.nome || "Kaboré OS Estúdio"}</Text>
                {empresa?.cnpj && <Text style={styles.subtitle}>CNPJ: {empresa.cnpj}</Text>}
                {empresa?.telefone && <Text style={styles.subtitle}>Tel: {empresa.telefone}</Text>}
              </View>
              <View style={styles.a4HeaderRight}>
                <Text style={{ fontSize: 14, fontWeight: "bold" }}>COMPROVANTE DE VENDA</Text>
                <Text style={styles.subtitle}>Venda #{venda.numero_sequencial}</Text>
                <Text style={styles.subtitle}>{dataVenda} às {horaVenda}</Text>
              </View>
            </View>
          </View>

          {/* Client & Staff Info */}
          <View style={{ marginBottom: 15 }}>
            <Text style={styles.sectionTitle}>Dados do Atendimento</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoVal}>{venda.clientes?.nome || "Cliente avulso"}</Text>
            </View>
            {venda.clientes?.whatsapp && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>WhatsApp:</Text>
                <Text style={styles.infoVal}>{venda.clientes.whatsapp}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Profissional:</Text>
              <Text style={styles.infoVal}>{venda.perfis?.nome || "Não informado"}</Text>
            </View>
          </View>

          {/* Items */}
          <Text style={styles.sectionTitle}>Serviços Prestados</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDesc, { fontWeight: "bold" }]}>Descrição</Text>
              <Text style={[styles.colPrice, { fontWeight: "bold" }]}>Valor</Text>
            </View>
            {venda.venda_servicos?.map((vs: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDesc}>{vs.servicos?.nome || "Serviço"}</Text>
                <Text style={styles.colPrice}>{formatCurrency(Number(vs.preco_aplicado))}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={styles.infoLabel}>Subtotal:</Text>
              <Text style={styles.infoVal}>{formatCurrency(sum)}</Text>
            </View>
            {desc > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.infoLabel}>Desconto ({venda.desconto_tipo === "percentual" ? `${desc}%` : "R$"}):</Text>
                <Text style={[styles.infoVal, { color: "#d9383a" }]}>
                  -{formatCurrency(venda.desconto_tipo === "percentual" ? sum * (desc / 100) : desc)}
                </Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Payments */}
          {venda.pagamentos && venda.pagamentos.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
              {venda.pagamentos.map((p: any, idx: number) => (
                <View key={idx} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {p.metodo.toUpperCase()} {p.parcelas > 1 ? `(${p.parcelas}x)` : ""}
                  </Text>
                  <Text style={styles.infoVal}>{formatCurrency(Number(p.valor))}</Text>
                </View>
              ))}
            </View>
          )}
        </Page>
      </Document>
    )
  }

  // Receipts sizes: Notinha (80mm width = 226pt) | Notinha Mini (58mm width = 164pt)
  const isMini = formato === "notinha_mini"
  const pageWidth = isMini ? 164 : 226
  
  return (
    <Document>
      <Page size={[pageWidth, 500]} style={[styles.page, styles.thermalPage]}>
        {/* Header */}
        <View style={[styles.centerText, { marginBottom: 5 }]}>
          <Text style={{ fontSize: 10, fontWeight: "bold" }}>{empresa?.nome || "Kaboré OS"}</Text>
          {empresa?.cnpj && <Text style={{ fontSize: 7, color: "#555" }}>CNPJ: {empresa.cnpj}</Text>}
          <Text style={{ fontSize: 7, color: "#555" }}>Venda #{venda.numero_sequencial}</Text>
          <Text style={{ fontSize: 7, color: "#555" }}>{dataVenda} {horaVenda}</Text>
        </View>

        <View style={styles.divider} />

        {/* Client & Staff */}
        <View style={{ fontSize: 7, marginBottom: 5 }}>
          <Text>Cliente: {venda.clientes?.nome || "Consumidor Avulso"}</Text>
          <Text>Profissional: {venda.perfis?.nome || "—"}</Text>
        </View>

        <View style={styles.divider} />

        {/* Services */}
        <View style={{ marginVertical: 3 }}>
          {venda.venda_servicos?.map((vs: any, idx: number) => (
            <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2, fontSize: 7 }}>
              <Text style={{ flex: 2 }}>{vs.servicos?.nome || "Serviço"}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{formatCurrency(Number(vs.preco_aplicado))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Totals */}
        <View style={{ fontSize: 7 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(sum)}</Text>
          </View>
          {desc > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <Text>Desconto:</Text>
              <Text>-{formatCurrency(venda.desconto_tipo === "percentual" ? sum * (desc / 100) : desc)}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2, fontWeight: "bold", fontSize: 9 }}>
            <Text>TOTAL:</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Payments */}
        {venda.pagamentos && venda.pagamentos.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={{ fontSize: 7 }}>
              {venda.pagamentos.map((p: any, idx: number) => (
                <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                  <Text>{p.metodo.toUpperCase()}:</Text>
                  <Text>{formatCurrency(Number(p.valor))}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.divider} />
        
        <View style={[styles.centerText, { marginTop: 5 }]}>
          <Text style={{ fontSize: 7 }}>Obrigado pela preferência!</Text>
        </View>
      </Page>
    </Document>
  )
}
