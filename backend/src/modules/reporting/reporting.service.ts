import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  private async validateProjectOwnership(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new ForbiddenException('You do not have access to this project or it does not exist');
    }
  }

  async findAll(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);
    return this.prisma.report.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!report || report.project.organizationId !== orgId) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async create(dto: CreateReportDto, orgId: string) {
    await this.validateProjectOwnership(dto.projectId, orgId);

    // 1. Fetch live metrics from database for PDF compilation
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId },
      include: {
        websites: {
          include: {
            seoAudits: {
              where: { status: 'COMPLETED' },
              orderBy: { startedAt: 'desc' },
              take: 1,
            },
            keywords: {
              include: {
                llmVisibilities: {
                  orderBy: { checkedAt: 'desc' },
                  take: 1,
                },
                geoScores: {
                  orderBy: { checkedAt: 'desc' },
                  take: 1,
                },
              },
            },
            backlinks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project metrics not found');
    }

    // Prepare PDF details
    const reportId = Math.random().toString(36).substring(7);
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const filename = `report-${reportId}.pdf`;
    const filePath = path.join(reportsDir, filename);

    // 2. Generate PDF using pdfkit
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Title / Header
    doc.fillColor('#0f172a').fontSize(26).font('Helvetica-Bold').text('SEO AI OS', { align: 'center' });
    doc.fillColor('#6366f1').fontSize(14).font('Helvetica-Bold').text('Enterprise Campaign Executive Report', { align: 'center' });
    doc.moveDown(2);

    // Metadata block
    doc.fillColor('#334155').fontSize(10).font('Helvetica');
    doc.text(`Report Name: ${dto.name}`);
    doc.text(`Project Target: ${project.name}`);
    doc.text(`Generated At: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    // Horizontal line
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    // Section 1: Campaign Overview Metrics
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('1. Campaign Highlights');
    doc.moveDown(1);

    let totalKeywords = 0;
    let totalBacklinks = 0;
    let sumSeoScore = 0;
    let seoScoreCount = 0;
    let sumLlmVisibility = 0;
    let llmVisibilityCount = 0;

    project.websites.forEach((w) => {
      totalKeywords += w.keywords.length;
      totalBacklinks += w.backlinks.length;
      if (w.seoAudits[0]?.score) {
        sumSeoScore += w.seoAudits[0].score;
        seoScoreCount++;
      }
      w.keywords.forEach((k) => {
        if (k.llmVisibilities[0]?.visibilityPercent) {
          sumLlmVisibility += Number(k.llmVisibilities[0].visibilityPercent);
          llmVisibilityCount++;
        }
      });
    });

    const avgSeoScore = seoScoreCount > 0 ? Math.round(sumSeoScore / seoScoreCount) : 0;
    const avgLlmVisibility = llmVisibilityCount > 0 ? Math.round(sumLlmVisibility / llmVisibilityCount) : 0;

    doc.fillColor('#334155').fontSize(11).font('Helvetica');
    doc.text(`Total Monitored Domains: ${project.websites.length}`);
    doc.text(`Target Keywords Evaluated: ${totalKeywords}`);
    doc.text(`Active Discovered Backlinks: ${totalBacklinks}`);
    doc.text(`Average Technical SEO Score: ${avgSeoScore > 0 ? `${avgSeoScore}/100` : 'N/A'}`);
    doc.text(`Aggregate LLM Visibility Score: ${avgLlmVisibility > 0 ? `${avgLlmVisibility}%` : 'N/A'}`);
    doc.moveDown(2);

    // Section 2: Website Audits Details
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('2. Domain Technical Status');
    doc.moveDown(1);

    if (project.websites.length === 0) {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Oblique').text('No domains registered in campaign.');
    } else {
      project.websites.forEach((w) => {
        doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(`Domain: ${w.domain}`);
        const latestAudit = w.seoAudits[0];
        doc.fillColor('#475569').fontSize(10).font('Helvetica');
        if (latestAudit) {
          doc.text(`- Last Audit Date: ${latestAudit.startedAt.toLocaleDateString()}`);
          doc.text(`- Technical SEO Score: ${latestAudit.score}/100`);
          doc.text(`- Crawled Pages Count: ${latestAudit.pagesCrawled}`);
        } else {
          doc.text('- No technical audits executed yet.');
        }
        doc.moveDown(0.5);
      });
    }
    doc.moveDown(1.5);

    // Section 3: LLM Visibility Footprint
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('3. AI Search Generative Footprint');
    doc.moveDown(1);

    let hasKeywordsWithLlm = false;
    project.websites.forEach((w) => {
      w.keywords.forEach((k) => {
        if (k.llmVisibilities.length > 0) {
          hasKeywordsWithLlm = true;
          doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`Keyword: "${k.text}"`);
          k.llmVisibilities.forEach((v) => {
            doc.fillColor('#475569').fontSize(10).font('Helvetica');
            doc.text(`  - ${v.engine}: ${v.visibilityPercent}% visibility`);
          });
          doc.moveDown(0.3);
        }
      });
    });

    if (!hasKeywordsWithLlm) {
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Oblique').text('No generative visibility indexes recorded yet.');
    }

    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(true));
      writeStream.on('error', reject);
    });

    // Save report entry in database
    return this.prisma.report.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        config: dto.config || {},
        pdfUrl: `/reports/${filename}`,
      },
    });
  }

  async remove(id: string, orgId: string) {
    const report = await this.findOne(id, orgId);
    
    // Clean up local file if exists
    if (report.pdfUrl) {
      const filePath = path.join(process.cwd(), report.pdfUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not delete report file:', e.message);
        }
      }
    }

    await this.prisma.report.delete({
      where: { id: report.id },
    });
    return { success: true };
  }

  async getReportFileStream(id: string, orgId: string) {
    const report = await this.findOne(id, orgId);
    if (!report.pdfUrl) {
      throw new NotFoundException('Report PDF file has not been compiled');
    }
    const filePath = path.join(process.cwd(), report.pdfUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Report PDF file not found on disk');
    }
    return fs.createReadStream(filePath);
  }
}
