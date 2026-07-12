import { prisma } from "@/config/database";
import { LeadStatus } from "@prisma/client";

const FOLLOW_UP_DAYS = 7;
const CLOSED_STATUSES: LeadStatus[] = ["FECHADO", "PERDIDO"];

export interface ListLeadsFilters {
  status?: LeadStatus;
  temperature?: string;
}

const leadInclude = {
  company: { include: { analysis: true } },
  notes: { orderBy: { createdAt: "desc" as const } },
} as const;

// Última interação com o lead: a nota mais recente, ou a última atualização do próprio lead
// (ex: mudança de status) se ainda não houver notas. Usado para "dias desde o último contacto".
export function getLastActivityDate(lead: { updatedAt: Date; notes?: Array<{ createdAt: Date }> }): Date {
  const latestNote = lead.notes?.[0]?.createdAt;
  if (!latestNote) return lead.updatedAt;
  return latestNote > lead.updatedAt ? latestNote : lead.updatedAt;
}

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export const leadsService = {
  // Guarda uma empresa como lead do utilizador (idempotente: repetir não duplica).
  async create(userId: string, companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw Object.assign(new Error("Empresa não encontrada."), { statusCode: 404 });
    }

    return prisma.lead.upsert({
      where: { userId_companyId: { userId, companyId } },
      update: {},
      create: { userId, companyId },
      include: leadInclude,
    });
  },

  // Lista os leads do utilizador, com filtros opcionais por status e por temperatura
  // (a temperatura vive em CompanyAnalysis, não no Lead — filtra pela relação aninhada).
  async list(userId: string, filters: ListLeadsFilters = {}) {
    return prisma.lead.findMany({
      where: {
        userId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.temperature ? { company: { analysis: { leadTemperature: filters.temperature } } } : {}),
      },
      include: leadInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getOwnedLead(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId }, include: leadInclude });
    if (!lead) {
      throw Object.assign(new Error("Lead não encontrado."), { statusCode: 404 });
    }
    return lead;
  },

  // PATCH /leads/:id — muda o status. Ao fechar (Fechado/Perdido) regista `closedAt`;
  // ao reabrir um lead previamente fechado, limpa `closedAt`.
  async updateStatus(userId: string, leadId: string, status: LeadStatus) {
    await leadsService.getOwnedLead(userId, leadId); // garante isolamento por utilizador (404 se não for dono)

    return prisma.lead.update({
      where: { id: leadId },
      data: {
        status,
        closedAt: CLOSED_STATUSES.includes(status) ? new Date() : null,
      },
      include: leadInclude,
    });
  },

  // POST /leads/:id/notes — adiciona uma nota ao histórico do lead.
  async addNote(userId: string, leadId: string, content: string) {
    await leadsService.getOwnedLead(userId, leadId);

    await prisma.leadNote.create({ data: { leadId, content } });
    // updatedAt do lead também reflete a interação, mesmo sem mudança de status.
    return prisma.lead.update({
      where: { id: leadId },
      data: { updatedAt: new Date() },
      include: leadInclude,
    });
  },

  // GET /leads/follow-ups — leads ativos sem contacto há mais de FOLLOW_UP_DAYS dias.
  async getFollowUps(userId: string) {
    const activeLeads = await prisma.lead.findMany({
      where: { userId, status: { notIn: CLOSED_STATUSES } },
      include: leadInclude,
    });

    return activeLeads
      .filter((lead) => daysSince(getLastActivityDate(lead)) >= FOLLOW_UP_DAYS)
      .sort((a, b) => daysSince(getLastActivityDate(b)) - daysSince(getLastActivityDate(a)));
  },
};
