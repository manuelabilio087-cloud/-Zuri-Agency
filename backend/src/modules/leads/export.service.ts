import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "@/config/database";

const TEMPERATURE_LABELS: Record<string, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
  muito_quente: "Muito Quente",
};

export const exportService = {
  // GET /leads/export/excel — lista de leads do utilizador, com dados da empresa e da análise.
  async generateLeadsExcel(userId: string): Promise<Buffer> {
    const leads = await prisma.lead.findMany({
      where: { userId },
      include: { company: { include: { analysis: true } } },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Zuri Agency";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Leads");
    sheet.columns = [
      { header: "Empresa", key: "name", width: 30 },
      { header: "Categoria", key: "category", width: 20 },
      { header: "Cidade", key: "city", width: 18 },
      { header: "Telefone", key: "phone", width: 18 },
      { header: "Website", key: "website", width: 30 },
      { header: "Sales Score", key: "salesScore", width: 14 },
      { header: "Temperatura", key: "temperature", width: 16 },
      { header: "Serviço Recomendado", key: "recommendedService", width: 30 },
      { header: "Status", key: "status", width: 16 },
      { header: "Guardado em", key: "createdAt", width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const lead of leads) {
      sheet.addRow({
        name: lead.company.name,
        category: lead.company.category,
        city: lead.company.city,
        phone: lead.company.phone ?? "—",
        website: lead.company.website ?? "—",
        salesScore: lead.company.analysis?.salesScore ?? "—",
        temperature: lead.company.analysis
          ? TEMPERATURE_LABELS[lead.company.analysis.leadTemperature] ?? lead.company.analysis.leadTemperature
          : "—",
        recommendedService: lead.company.analysis?.recommendedService ?? "—",
        status: lead.status,
        createdAt: lead.createdAt.toISOString().slice(0, 10),
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  },

  // GET /leads/:id/export/pdf — formata a proposta comercial (já gerada por IA) em PDF.
  async generateProposalPdf(userId: string, leadId: string): Promise<Buffer> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: { company: { include: { analysis: true } } },
    });

    if (!lead) {
      throw Object.assign(new Error("Lead não encontrado."), { statusCode: 404 });
    }

    const proposal = await prisma.generatedContent.findFirst({
      where: { leadId, type: "proposta" },
      orderBy: { createdAt: "desc" },
    });

    if (!proposal) {
      throw Object.assign(
        new Error("Ainda não existe uma proposta gerada para este lead. Gera uma primeiro em /api/ai/generate-content."),
        { statusCode: 409 }
      );
    }

    const content = proposal.content as {
      diagnostico?: string;
      oportunidade?: string;
      solucao?: string;
      proximos_passos?: string;
    };

    return renderProposalPdf(lead.company.name, lead.company.category, content);
  },
};

function renderProposalPdf(
  companyName: string,
  companyCategory: string,
  content: { diagnostico?: string; oportunidade?: string; solucao?: string; proximos_passos?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).font("Helvetica-Bold").text("Proposta Comercial", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").fillColor("#555555").text(`${companyName} — ${companyCategory}`);
    doc.moveDown(1.2);
    doc.strokeColor("#dddddd").moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(1);

    addSection(doc, "1. Diagnóstico", content.diagnostico);
    addSection(doc, "2. Oportunidade", content.oportunidade);
    addSection(doc, "3. Solução Proposta", content.solucao);
    addSection(doc, "4. Próximos Passos", content.proximos_passos);

    doc.moveDown(1.5);
    doc
      .fontSize(9)
      .fillColor("#999999")
      .text(`Gerado por Zuri Agency em ${new Date().toLocaleDateString("pt-PT")}`, { align: "left" });

    doc.end();
  });
}

function addSection(doc: PDFKit.PDFDocument, title: string, text: string | undefined) {
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#111111").text(title);
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#333333")
    .text(text ?? "(sem conteúdo)", { align: "justify" });
  doc.moveDown(1);
}
