"use client"

import type React from "react"

import { useState, useRef, DragEvent } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, Eye, ChevronLeft, ChevronRight, TableIcon, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import jsPDF from "jspdf"
import "jspdf-autotable"



interface InitiativeData {
  ws?: string
  aligned?: string
  initiativeName?: string
  initiativeDescription?: string
  feasibility?: string
  risks?: string
  estimatedImpact?: string
  initiativeOwner?: string
  mainArea?: string
  archetypes?: string
  initiativeNameIdeationSession?: string
  initiativeDescriptionIdeationSession?: string
}

export default function ExcelReader() {
  const [data, setData] = useState<InitiativeData[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    ws: "",
    aligned: "",
    initiativeName: "",
    feasibility: "",
    estimatedImpact: "",
    initiativeOwner: "",
    mainArea: "",
    archetypes: "",
  })

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<number[]>([])

  const [viewMode, setViewMode] = useState<"table" | "individual">("table")
  const [currentIndividualIndex, setCurrentIndividualIndex] = useState(0)
  const [showUpload, setShowUpload] = useState(true)

  const dropRef = useRef<HTMLDivElement>(null)

  const filteredData = data.filter((item) => {
    return (
      (!filters.ws || item.ws?.toLowerCase().includes(filters.ws.toLowerCase())) &&
      (!filters.aligned || item.aligned?.toLowerCase().includes(filters.aligned.toLowerCase())) &&
      (!filters.initiativeName || item.initiativeName?.toLowerCase().includes(filters.initiativeName.toLowerCase())) &&
      (!filters.feasibility || item.feasibility?.toLowerCase().includes(filters.feasibility.toLowerCase())) &&
      (!filters.estimatedImpact ||
        item.estimatedImpact?.toLowerCase().includes(filters.estimatedImpact.toLowerCase())) &&
      (!filters.initiativeOwner ||
        item.initiativeOwner?.toLowerCase().includes(filters.initiativeOwner.toLowerCase())) &&
      (!filters.mainArea || item.mainArea?.toLowerCase().includes(filters.mainArea.toLowerCase())) &&
      (!filters.archetypes || item.archetypes?.toLowerCase().includes(filters.archetypes.toLowerCase()))
    )
  })

  const handleFilterChange = (column: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value }))
  }

  const clearFilters = () => {
    setFilters({
      ws: "",
      aligned: "",
      initiativeName: "",
      feasibility: "",
      estimatedImpact: "",
      initiativeOwner: "",
      mainArea: "",
      archetypes: "",
    })
  }

  // Novo handler para drag and drop
  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  // Função central para processar o arquivo
  const processFile = async (file: File) => {
    setIsLoading(true)
    setFileName(file.name)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      
      // Buscar a planilha "Initiatives" primeiro, senão usar a primeira
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes("initiative")
      ) || workbook.SheetNames[0]
      
      console.log("Planilhas disponíveis:", workbook.SheetNames)
      console.log("Planilha selecionada:", sheetName)
      
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // Debug: mostrar as primeiras linhas do arquivo
      console.log("Primeiras 5 linhas do arquivo:")
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        console.log(`Linha ${i}:`, jsonData[i])
      }

      // Procurar a linha do cabeçalho de forma mais flexível
      let headerRowIdx = -1
      let startColumn = 0
      
      // PRIMEIRO: Tentar estrutura conhecida (linha 2, coluna B)
      if (jsonData.length > 1) {
        const knownHeaderRow = jsonData[1] as (string | undefined)[]
        if (knownHeaderRow.length > 1 && knownHeaderRow[1]) {
          const secondCell = String(knownHeaderRow[1]).trim()
          // Verificar se a segunda célula da linha 2 contém um indicador de cabeçalho
          if (secondCell === "#" || secondCell.toLowerCase().includes("ws") || 
              secondCell.toLowerCase().includes("priorit")) {
            headerRowIdx = 1 // linha 2 do Excel
            startColumn = 1   // coluna B
            console.log("Estrutura conhecida detectada: linha 2, coluna B")
          }
        }
      }
      
      // SEGUNDO: Se não encontrar na estrutura conhecida, usar busca flexível
      if (headerRowIdx === -1) {
        // Buscar linha que começa com '#' na coluna B
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | undefined)[]
          if (row[1] && String(row[1]).trim().startsWith("#")) {
            headerRowIdx = i
            startColumn = 1
            console.log(`Cabeçalho encontrado na linha ${i} (começa com #)`)
            break
          }
        }
      }
      
      // TERCEIRO: Buscar por palavras-chave conhecidas
      if (headerRowIdx === -1) {
        const headerKeywords = ["WS", "Aligned", "Prioritised", "Initiative Name", "Feasibility", "Risks"]
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | undefined)[]
          const foundKeywords = headerKeywords.filter(keyword => 
            row.some(cell => cell && String(cell).toLowerCase().includes(keyword.toLowerCase()))
          )
          if (foundKeywords.length >= 2) {
            headerRowIdx = i
            // Determinar coluna inicial baseada em onde encontramos as palavras-chave
            startColumn = (!row[0] || String(row[0]).trim() === "") ? 1 : 0
            console.log(`Cabeçalho encontrado na linha ${i} (por palavras-chave):`, foundKeywords)
            break
          }
        }
      }
      
      // QUARTO: Usar linha com mais células preenchidas
      if (headerRowIdx === -1) {
        let maxCells = 0
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i] as (string | undefined)[]
          const filledCells = row.filter(cell => cell && String(cell).trim() !== "").length
          if (filledCells > maxCells && filledCells > 3) {
            maxCells = filledCells
            headerRowIdx = i
            startColumn = (!row[0] || String(row[0]).trim() === "") ? 1 : 0
          }
        }
        if (headerRowIdx !== -1) {
          console.log(`Cabeçalho presumido na linha ${headerRowIdx} (mais células preenchidas: ${maxCells})`)
        }
      }
      
      if (headerRowIdx === -1) {
        throw new Error("Nenhum cabeçalho válido foi encontrado no arquivo. Verifique se o arquivo contém as colunas esperadas (WS, Aligned, Initiative Name, etc.).")
      }
      
      const fullHeaderRow = jsonData[headerRowIdx] as (string | undefined)[]
      const headerRow = fullHeaderRow.slice(startColumn)
      const dataRows = jsonData.slice(headerRowIdx + 1).map(row => (row as (string | undefined)[]).slice(startColumn))
      
      console.log(`Lendo da linha ${headerRowIdx + 1}, coluna ${String.fromCharCode(65 + startColumn)}`)
      console.log("Cabeçalho extraído:", headerRow)

      const columnMapping: { [key: string]: keyof InitiativeData } = {
        // Mapeamentos para a estrutura real do Excel
        "#": "ws",
        "WS": "ws",
        "Prioritised": "aligned",  // Nome real da coluna no Excel
        "Aligned": "aligned",      // Fallback
        "Initiative Name": "initiativeName",
        "Initiative Description": "initiativeDescription",
        "Feasibility": "feasibility",
        "Risks": "risks",
        "Estimated Impact": "estimatedImpact",
        "Initiative Owner": "initiativeOwner",
        "Main Area": "mainArea",
        "Archetipes": "archetypes",  // Com erro de ortografia como no Excel original
        "Archetypes": "archetypes",  // Versão correta como fallback
        "Initiative Name Ideation Session": "initiativeNameIdeationSession",
        "Initiative Description Ideation Session": "initiativeDescriptionIdeationSession",
        
        // Mapeamentos alternativos (case-insensitive)
        "ws": "ws",
        "prioritised": "aligned",
        "aligned": "aligned",
        "initiative name": "initiativeName",
        "initiative description": "initiativeDescription",
        "feasibility": "feasibility",
        "risks": "risks",
        "estimated impact": "estimatedImpact",
        "initiative owner": "initiativeOwner",
        "main area": "mainArea",
        "archetipes": "archetypes",
        "archetypes": "archetypes",
        "initiative name ideation session": "initiativeNameIdeationSession",
        "initiative description ideation session": "initiativeDescriptionIdeationSession",
      }

      // Função para encontrar o mapeamento correto (case-insensitive e flexível)
      const findMapping = (header: string): keyof InitiativeData | undefined => {
        if (!header) return undefined
        
        const cleanHeader = String(header).trim()
        
        // Tentar mapeamento exato primeiro
        if (columnMapping[cleanHeader]) {
          return columnMapping[cleanHeader]
        }
        
        // Tentar mapeamento case-insensitive
        const lowerHeader = cleanHeader.toLowerCase()
        if (columnMapping[lowerHeader]) {
          return columnMapping[lowerHeader]
        }
        
        // Tentar mapeamento parcial para casos onde o cabeçalho pode ter texto extra
        for (const [key, value] of Object.entries(columnMapping)) {
          if (key.toLowerCase().includes(lowerHeader) || lowerHeader.includes(key.toLowerCase())) {
            if (key.length > 2 && lowerHeader.length > 2) { // Evitar matches muito pequenos
              return value
            }
          }
        }
        
        return undefined
      }

      const parsedData: InitiativeData[] = dataRows
        .map((row) => {
          const item: InitiativeData = {}
          headerRow.forEach((header: string | undefined, index: number) => {
            if (!header) return
            const mappedKey = findMapping(header)
            if (mappedKey && row[index] !== undefined && row[index] !== null && String(row[index]).trim() !== "") {
              item[mappedKey] = String(row[index]).trim()
            }
          })
          return item
        })
        .filter((item) => Object.keys(item).length > 0)
      
      console.log(`Dados processados: ${parsedData.length} linhas válidas encontradas`)
      console.log("Primeira linha de dados:", parsedData[0])
      
      if (parsedData.length === 0) {
        throw new Error("Nenhuma linha de dados válida foi encontrada. Verifique se o arquivo contém dados após o cabeçalho.")
      }

      setData(parsedData)
      setShowUpload(false)  // Ocultar o upload após sucesso
      setViewMode("individual")
      setCurrentIndividualIndex(0)
    } catch (error: any) {
      console.error("Erro detalhado ao ler arquivo:", error)
      alert(error.message || "Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.")
    } finally {
      setIsLoading(false)
    }
  }

  const createResponsivePDF = (item: InitiativeData) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    let yPosition = 25

    // Função para adicionar texto responsivo
    const addResponsiveText = (
      text: string,
      fontSize: number,
      fontStyle: "normal" | "bold" = "normal",
      color = "black",
    ) => {
      doc.setFontSize(fontSize)
      doc.setFont("helvetica", fontStyle)
      doc.setTextColor(color)

      const lines = doc.splitTextToSize(text, contentWidth)
      const lineHeight = fontSize * 0.4

      // Verificar se precisa de nova página
      if (yPosition + lines.length * lineHeight > pageHeight - 20) {
        doc.addPage()
        yPosition = 25
      }

      doc.text(lines, margin, yPosition)
      yPosition += lines.length * lineHeight + 3
      return yPosition
    }

    // Função para adicionar campo
    const addField = (label: string, value: string | undefined, isTitle = false) => {
      if (!value || value === "N/A") value = "Not specified"

      if (isTitle) {
        addResponsiveText(label, 14, "bold", "#2563eb")
        addResponsiveText(value, 16, "bold", "#000000")
      } else {
        addResponsiveText(label, 10, "bold", "#666666")
        addResponsiveText(value, 11, "normal", "#000000")
      }
      yPosition += 5
    }

    // Título principal
    addResponsiveText("Initiative Details", 20, "bold", "#1e40af")
    yPosition += 10

    // Informações principais
    addField("WS", item.ws)
    addField("Aligned", item.aligned)
    addField("Initiative Name", item.initiativeName, true)
    addField("Initiative Description", item.initiativeDescription)
    addField("Feasibility", item.feasibility)
    addField("Risks", item.risks)
    addField("Estimated Impact", item.estimatedImpact)
    addField("Initiative Owner", item.initiativeOwner)
    addField("Main Area", item.mainArea)
    addField("Archetypes", item.archetypes)

    // Seção de Ideação
    yPosition += 15
    addResponsiveText("AI Ideation Session", 16, "bold", "#1e40af")
    yPosition += 5

    addField("Initiative Name Ideation Session", item.initiativeNameIdeationSession)
    addField("Initiative Description Ideation Session", item.initiativeDescriptionIdeationSession)

    // Footer responsivo
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor("#666666")
      const footerText = `Generated on ${new Date().toLocaleDateString("en-US")} - Page ${i} of ${pageCount}`
      const textWidth = doc.getTextWidth(footerText)
      doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10)
    }

    return doc
  }

  const exportSelectedToPDF = () => {
    if (selectedRows.length === 0) {
      alert("Select at least one initiative to export.")
      return
    }

    selectedRows.forEach((rowIndex) => {
      const item = filteredData[rowIndex]
      if (!item) return

      const doc = createResponsivePDF(item)
      const fileName = `initiative_${item.ws || "no_ws"}_${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)
    })
  }

  const handleRowSelection = (index: number) => {
    setSelectedRows((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(filteredData.map((_, index) => index))
    }
  }

  const exportIndividualToPDF = () => {
    if (!filteredData[currentIndividualIndex]) return

    const item = filteredData[currentIndividualIndex]
    const doc = createResponsivePDF(item)
    const fileName = `initiative_${item.ws || "no_ws"}_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
  }

  const getFeasibilityColor = (feasibility?: string) => {
    if (!feasibility) return "secondary"
    const value = feasibility.toLowerCase()
    if (value.includes("high") || value.includes("alto")) return "default"
    if (value.includes("medium") || value.includes("médio")) return "secondary"
    if (value.includes("low") || value.includes("baixo")) return "destructive"
    return "secondary"
  }

  const getImpactColor = (impact?: string) => {
    if (!impact) return "secondary"
    const value = impact.toLowerCase()
    if (value.includes("high") || value.includes("alto")) return "default"
    if (value.includes("medium") || value.includes("médio")) return "secondary"
    if (value.includes("low") || value.includes("baixo")) return "outline"
    return "secondary"
  }

  const getUniqueValues = (key: keyof InitiativeData) => {
    const values = data.map((item) => item[key]).filter(Boolean) as string[]
    return [...new Set(values)].sort()
  }

  const openDetailModal = (index: number) => {
    setSelectedIndex(index)
    setIsDetailModalOpen(true)
  }

  const navigateRecord = (direction: "prev" | "next") => {
    if (selectedIndex === null) return
    const currentFilteredIndex = filteredData.findIndex((_, idx) => idx === selectedIndex)
    let newIndex = currentFilteredIndex

    if (direction === "prev" && currentFilteredIndex > 0) {
      newIndex = currentFilteredIndex - 1
    } else if (direction === "next" && currentFilteredIndex < filteredData.length - 1) {
      newIndex = currentFilteredIndex + 1
    }

    setSelectedIndex(newIndex)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Excel Reader - AI Initiatives</h1>
        <p className="text-muted-foreground">Upload an Excel file (.xlsx) with initiative data</p>
      </div>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              File Upload
            </CardTitle>
            <CardDescription>
              Select an Excel file with columns: WS, Aligned, Initiative Name, Initiative Description, etc.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-lg p-8 cursor-pointer transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[160px] text-center"
                onClick={() => dropRef.current?.querySelector("input")?.click()}
                tabIndex={0}
                role="button"
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={isLoading}
                  tabIndex={-1}
                />
                <Upload className="w-10 h-10 text-primary mb-2" />
                <span className="font-semibold">Arraste e solte o arquivo aqui ou clique para selecionar</span>
                <span className="text-xs text-muted-foreground block mt-1">Apenas arquivos .xlsx ou .xls</span>
              </div>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {fileName}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Processing file...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Initiative Data</CardTitle>
                <CardDescription>
                  {filteredData.length} of {data.length} initiative{filteredData.length !== 1 ? "s" : ""}{" "}
                  {filteredData.length !== data.length ? "filtered" : "found"}
                  {viewMode === "table" && selectedRows.length > 0 && (
                    <span className="text-primary"> • {selectedRows.length} selected</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  New Upload
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="view-mode" className="text-sm font-medium">
                    Table
                  </Label>
                  <Switch
                    id="view-mode"
                    checked={viewMode === "individual"}
                    onCheckedChange={(checked) => {
                      setViewMode(checked ? "individual" : "table")
                      if (checked) {
                        setCurrentIndividualIndex(0)
                      }
                    }}
                  />
                  <Label htmlFor="view-mode" className="text-sm font-medium">
                    Individual
                  </Label>
                </div>
                {viewMode === "table" && (
                  <Button
                    onClick={exportSelectedToPDF}
                    variant="outline"
                    size="sm"
                    disabled={selectedRows.length === 0}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF Selected ({selectedRows.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Filters</h3>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">WS</Label>
                  <Select
                    value={filters.ws}
                    onValueChange={(value) => handleFilterChange("ws", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {getUniqueValues("ws").map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Aligned</Label>
                  <Select
                    value={filters.aligned}
                    onValueChange={(value) => handleFilterChange("aligned", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {getUniqueValues("aligned").map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Feasibility</Label>
                  <Select
                    value={filters.feasibility}
                    onValueChange={(value) => handleFilterChange("feasibility", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {getUniqueValues("feasibility").map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Estimated Impact</Label>
                  <Select
                    value={filters.estimatedImpact}
                    onValueChange={(value) => handleFilterChange("estimatedImpact", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {getUniqueValues("estimatedImpact").map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Initiative Owner</Label>
                  <Select
                    value={filters.initiativeOwner}
                    onValueChange={(value) => handleFilterChange("initiativeOwner", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {getUniqueValues("initiativeOwner").map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Main Area</Label>
                  <Select
                    value={filters.mainArea}
                    onValueChange={(value) => handleFilterChange("mainArea", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {getUniqueValues("mainArea").map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {viewMode === "table" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>WS</TableHead>
                      <TableHead>Aligned</TableHead>
                      <TableHead>Initiative Name</TableHead>
                      <TableHead>Initiative Description</TableHead>
                      <TableHead>Feasibility</TableHead>
                      <TableHead>Risks</TableHead>
                      <TableHead>Estimated Impact</TableHead>
                      <TableHead>Initiative Owner</TableHead>
                      <TableHead>Main Area</TableHead>
                      <TableHead>Archetypes</TableHead>
                      <TableHead>Initiative Name Ideation Session</TableHead>
                      <TableHead>Initiative Description Ideation Session</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetailModal(index)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(index)}
                            onChange={() => handleRowSelection(index)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.ws || "-"}</TableCell>
                        <TableCell>
                          {item.aligned ? (
                            <Badge variant={item.aligned.toLowerCase() === "yes" ? "default" : "secondary"}>
                              {item.aligned}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.initiativeName}>
                          {item.initiativeName || "-"}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={item.initiativeDescription}>
                          {item.initiativeDescription || "-"}
                        </TableCell>
                        <TableCell>
                          {item.feasibility ? (
                            <Badge variant={getFeasibilityColor(item.feasibility)}>{item.feasibility}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.risks}>
                          {item.risks || "-"}
                        </TableCell>
                        <TableCell>
                          {item.estimatedImpact ? (
                            <Badge variant={getImpactColor(item.estimatedImpact)}>{item.estimatedImpact}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{item.initiativeOwner || "-"}</TableCell>
                        <TableCell>{item.mainArea || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={item.archetypes}>
                          {item.archetypes || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.initiativeNameIdeationSession}>
                          {item.initiativeNameIdeationSession || "-"}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={item.initiativeDescriptionIdeationSession}>
                          {item.initiativeDescriptionIdeationSession || "-"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => openDetailModal(index)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentIndividualIndex(Math.max(0, currentIndividualIndex - 1))}
                      disabled={currentIndividualIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      {currentIndividualIndex + 1} of {filteredData.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentIndividualIndex(Math.min(filteredData.length - 1, currentIndividualIndex + 1))
                      }
                      disabled={currentIndividualIndex === filteredData.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <Button onClick={exportIndividualToPDF} variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>

                {filteredData[currentIndividualIndex] && (
                  <Card className="p-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">WS</Label>
                            <p className="text-xl font-medium">{filteredData[currentIndividualIndex].ws || "N/A"}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Aligned</Label>
                            <div className="mt-2">
                              {filteredData[currentIndividualIndex].aligned ? (
                                <Badge
                                  variant={
                                    filteredData[currentIndividualIndex].aligned?.toLowerCase() === "yes"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-sm px-3 py-1"
                                >
                                  {filteredData[currentIndividualIndex].aligned}
                                </Badge>
                              ) : (
                                "N/A"
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Feasibility</Label>
                            <div className="mt-2">
                              {filteredData[currentIndividualIndex].feasibility ? (
                                <Badge
                                  variant={getFeasibilityColor(filteredData[currentIndividualIndex].feasibility)}
                                  className="text-sm px-3 py-1"
                                >
                                  {filteredData[currentIndividualIndex].feasibility}
                                </Badge>
                              ) : (
                                "N/A"
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Estimated Impact</Label>
                            <div className="mt-2">
                              {filteredData[currentIndividualIndex].estimatedImpact ? (
                                <Badge
                                  variant={getImpactColor(filteredData[currentIndividualIndex].estimatedImpact)}
                                  className="text-sm px-3 py-1"
                                >
                                  {filteredData[currentIndividualIndex].estimatedImpact}
                                </Badge>
                              ) : (
                                "N/A"
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Initiative Owner</Label>
                            <p className="text-lg">{filteredData[currentIndividualIndex].initiativeOwner || "N/A"}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Main Area</Label>
                            <p className="text-lg">{filteredData[currentIndividualIndex].mainArea || "N/A"}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Archetypes</Label>
                            <p className="text-sm leading-relaxed">
                              {filteredData[currentIndividualIndex].archetypes || "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Initiative Name</Label>
                            <p className="text-xl font-semibold text-primary">
                              {filteredData[currentIndividualIndex].initiativeName || "N/A"}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">
                              Initiative Description
                            </Label>
                            <p className="text-base leading-relaxed">
                              {filteredData[currentIndividualIndex].initiativeDescription || "N/A"}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Risks</Label>
                            <p className="text-base leading-relaxed">
                              {filteredData[currentIndividualIndex].risks || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 space-y-4">
                        <h3 className="text-xl font-semibold">AI Ideation Session</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">
                              Initiative Name Ideation Session
                            </Label>
                            <p className="text-base font-medium">
                              {filteredData[currentIndividualIndex].initiativeNameIdeationSession || "N/A"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-muted-foreground">
                              Initiative Description Ideation Session
                            </Label>
                            <p className="text-base leading-relaxed">
                              {filteredData[currentIndividualIndex].initiativeDescriptionIdeationSession || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}


      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Initiative Details</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateRecord("prev")}
                  disabled={selectedIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedIndex !== null ? selectedIndex + 1 : 0} of {filteredData.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateRecord("next")}
                  disabled={selectedIndex === filteredData.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedIndex !== null && filteredData[selectedIndex] && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">WS</Label>
                    <p className="text-lg">{filteredData[selectedIndex].ws || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Aligned</Label>
                    <div className="mt-1">
                      {filteredData[selectedIndex].aligned ? (
                        <Badge
                          variant={
                            filteredData[selectedIndex].aligned?.toLowerCase() === "yes" ? "default" : "secondary"
                          }
                        >
                          {filteredData[selectedIndex].aligned}
                        </Badge>
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Feasibility</Label>
                    <div className="mt-1">
                      {filteredData[selectedIndex].feasibility ? (
                        <Badge variant={getFeasibilityColor(filteredData[selectedIndex].feasibility)}>
                          {filteredData[selectedIndex].feasibility}
                        </Badge>
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Estimated Impact</Label>
                    <div className="mt-1">
                      {filteredData[selectedIndex].estimatedImpact ? (
                        <Badge variant={getImpactColor(filteredData[selectedIndex].estimatedImpact)}>
                          {filteredData[selectedIndex].estimatedImpact}
                        </Badge>
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Initiative Owner</Label>
                    <p className="text-lg">{filteredData[selectedIndex].initiativeOwner || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Main Area</Label>
                    <p className="text-lg">{filteredData[selectedIndex].mainArea || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Initiative Name</Label>
                    <p className="text-lg font-medium">{filteredData[selectedIndex].initiativeName || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Initiative Description</Label>
                    <p className="text-sm leading-relaxed">
                      {filteredData[selectedIndex].initiativeDescription || "N/A"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Risks</Label>
                    <p className="text-sm leading-relaxed">{filteredData[selectedIndex].risks || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Archetypes</Label>
                    <p className="text-sm">{filteredData[selectedIndex].archetypes || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="text-lg font-semibold">AI Ideation Session</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Initiative Name Ideation Session
                    </Label>
                    <p className="text-sm">{filteredData[selectedIndex].initiativeNameIdeationSession || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Initiative Description Ideation Session
                    </Label>
                    <p className="text-sm leading-relaxed">
                      {filteredData[selectedIndex].initiativeDescriptionIdeationSession || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
