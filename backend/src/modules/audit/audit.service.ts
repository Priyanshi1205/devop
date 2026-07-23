import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TriggerAuditDto } from './dto/trigger-audit.dto';
import * as cheerio from 'cheerio';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  private async validateWebsiteOwnership(websiteId: string, orgId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        project: true,
      },
    });

    if (!website || website.project.organizationId !== orgId) {
      throw new ForbiddenException('You do not have access to this website or it does not exist');
    }
    return website;
  }

  async trigger(dto: TriggerAuditDto, orgId: string) {
    const website = await this.validateWebsiteOwnership(dto.websiteId, orgId);

    // Create entry in database
    const audit = await this.prisma.seoAudit.create({
      data: {
        websiteId: dto.websiteId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Run the crawler asynchronously in the background
    this.runCrawler(audit.id, website.id, website.domain).catch((err) => {
      console.error(`Crawl background process failed for audit ${audit.id}:`, err);
    });

    return {
      auditId: audit.id,
      status: 'RUNNING',
      message: 'Technical SEO audit successfully started.',
    };
  }

  private getIssueDetails(type: string, details?: any): { type: string; severity: 'critical' | 'warning'; priorityScore: number; impactScore: number; recommendedFix: string; details?: any } {
    const meta = this.resolveIssueMeta(type);
    return {
      type,
      ...meta,
      details,
    };
  }

  private resolveIssueMeta(type: string): { severity: 'critical' | 'warning'; priorityScore: number; impactScore: number; recommendedFix: string } {
    switch (type) {
      case 'network_fetch_failed':
        return {
          severity: 'critical',
          priorityScore: 95,
          impactScore: 100,
          recommendedFix: 'Ensure the server hosting the website is online and responsive.'
        };
      case 'missing_robots_txt':
        return {
          severity: 'warning',
          priorityScore: 60,
          impactScore: 70,
          recommendedFix: 'Create a robots.txt file at the root of your domain to guide search engine crawlers.'
        };
      case 'missing_sitemap_xml':
        return {
          severity: 'warning',
          priorityScore: 70,
          impactScore: 80,
          recommendedFix: 'Generate a sitemap.xml file and submit it in Google Search Console to index pages faster.'
        };
      case 'missing_llms_txt':
        return {
          severity: 'warning',
          priorityScore: 35,
          impactScore: 40,
          recommendedFix: 'Create an llms.txt file at the root of your domain to provide search agents and LLMs with clear context.'
        };
      case 'missing_title':
        return {
          severity: 'critical',
          priorityScore: 90,
          impactScore: 95,
          recommendedFix: 'Add a descriptive <title> tag to the head section of this page.'
        };
      case 'title_too_long':
        return {
          severity: 'warning',
          priorityScore: 40,
          impactScore: 50,
          recommendedFix: 'Shorten your page title to under 70 characters so it fits on Google search results pages.'
        };
      case 'missing_meta_description':
        return {
          severity: 'warning',
          priorityScore: 50,
          impactScore: 60,
          recommendedFix: 'Add a descriptive <meta name="description"> tag between 120-160 characters.'
        };
      case 'meta_description_too_long':
        return {
          severity: 'warning',
          priorityScore: 30,
          impactScore: 40,
          recommendedFix: 'Shorten your meta description to under 160 characters to avoid truncation.'
        };
      case 'missing_h1':
        return {
          severity: 'warning',
          priorityScore: 55,
          impactScore: 65,
          recommendedFix: 'Add a single <h1> heading tag at the top of the page content to outline the main topic.'
        };
      case 'multiple_h1_tags':
        return {
          severity: 'critical',
          priorityScore: 80,
          impactScore: 75,
          recommendedFix: 'Ensure there is only one <h1> tag on this page. Change secondary <h1> tags to <h2>.'
        };
      case 'missing_image_alt_tags':
        return {
          severity: 'warning',
          priorityScore: 45,
          impactScore: 55,
          recommendedFix: 'Add descriptive alt="your description" attributes to all <img> tags for screen readers and search engines.'
        };
      case 'missing_canonical_link':
        return {
          severity: 'warning',
          priorityScore: 65,
          impactScore: 70,
          recommendedFix: 'Add a <link rel="canonical" href="[page-url]"> to prevent duplicate content indexing.'
        };
      case 'missing_schema_markup':
        return {
          severity: 'warning',
          priorityScore: 50,
          impactScore: 60,
          recommendedFix: 'Implement JSON-LD schema markup (e.g., Article, Product, Organization) to show rich snippets in Google.'
        };
      case 'poor_lcp':
        return {
          severity: 'critical',
          priorityScore: 85,
          impactScore: 90,
          recommendedFix: 'Optimize Largest Contentful Paint (LCP) by compressing heavy images, deferring non-critical scripts, or using a CDN.'
        };
      case 'poor_cls':
        return {
          severity: 'warning',
          priorityScore: 55,
          impactScore: 65,
          recommendedFix: 'Fix Cumulative Layout Shift (CLS) by adding explicit width and height dimensions to all images and ad frames.'
        };
      case 'poor_inp':
        return {
          severity: 'warning',
          priorityScore: 60,
          impactScore: 70,
          recommendedFix: 'Improve Interaction to Next Paint (INP) by reducing main thread execution time and breaking up long javascript tasks.'
        };
      case 'broken_internal_links':
        return {
          severity: 'critical',
          priorityScore: 90,
          impactScore: 90,
          recommendedFix: 'Locate links pointing to non-existent URLs (404 pages) and correct their destination hrefs.'
        };
      default:
        if (type.startsWith('http_status_error')) {
          return {
            severity: 'critical',
            priorityScore: 95,
            impactScore: 95,
            recommendedFix: 'Investigate server configuration or code logic causing error response codes.'
          };
        }
        return {
          severity: 'warning',
          priorityScore: 30,
          impactScore: 30,
          recommendedFix: 'Review and improve technical SEO standards for this page.'
        };
    }
  }

  private async runCrawler(auditId: string, websiteId: string, domain: string) {
    console.log(`Starting crawl for domain: ${domain} (Audit ID: ${auditId})`);
    
    // Normalize start URL
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const parsedBase = new URL(baseUrl);
    const domainHostname = parsedBase.hostname;

    const visited = new Set<string>();
    const queue: { url: string; depth: number; referrer?: string }[] = [{ url: baseUrl, depth: 0 }];
    const maxPages = 30; // Safety cap
    const maxDepth = 3;
    let crawledCount = 0;

    let totalCriticalIssues = 0;
    let totalWarningIssues = 0;

    const crawledPagesData: Record<string, { id: string; issues: any[] }> = {};

    // Website-wide check for robots.txt, sitemap.xml, and llms.txt
    let hasRobots = true;
    let hasSitemap = true;
    let hasLlmstxt = true;

    try {
      const robotsRes = await fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(4000) });
      if (robotsRes.status !== 200) {
        hasRobots = false;
      }
    } catch {
      hasRobots = false;
    }

    try {
      const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(4000) });
      if (sitemapRes.status !== 200) {
        hasSitemap = false;
      }
    } catch {
      hasSitemap = false;
    }

    try {
      const llmsRes = await fetch(`${baseUrl}/llms.txt`, { signal: AbortSignal.timeout(4000) });
      if (llmsRes.status !== 200) {
        hasLlmstxt = false;
      }
    } catch {
      hasLlmstxt = false;
    }

    try {
      while (queue.length > 0 && crawledCount < maxPages) {
        const current = queue.shift();
        if (!current) continue;

        const { url: currentUrl, depth, referrer } = current;

        // Skip if already visited
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        console.log(`Crawling: ${currentUrl} (depth ${depth})`);
        
        let html = '';
        let statusCode = 200;
        let fetchError: string | null = null;

        try {
          const res = await fetch(currentUrl, {
            headers: { 'User-Agent': 'SEO-AI-OS-Crawler/1.0' },
            signal: AbortSignal.timeout(6000), // 6 seconds timeout
          });
          statusCode = res.status;
          html = await res.text();
        } catch (err: any) {
          statusCode = 500;
          fetchError = err.message || 'Fetch failed';
        }

        crawledCount++;

        // Issues logs for this page
        const issues: any[] = [];
        let title = '';
        let metaDescription = '';
        let h1Text = '';
        let wordCount = 0;

        if (fetchError) {
          issues.push(this.getIssueDetails('network_fetch_failed'));
          totalCriticalIssues++;
        } else if (statusCode !== 200) {
          issues.push(this.getIssueDetails(`http_status_error_${statusCode}`));
          totalCriticalIssues++;
        } else {
          // Parse page content
          const $ = cheerio.load(html);

          // Word Count calculation (simple body text strip)
          const bodyText = $('body').text() || '';
          wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

          // Title
          title = $('title').text()?.trim() || '';
          if (!title) {
            issues.push(this.getIssueDetails('missing_title'));
            totalCriticalIssues++;
          } else if (title.length > 70) {
            issues.push(this.getIssueDetails('title_too_long', { title, length: title.length }));
            totalWarningIssues++;
          }

          // Meta description
          metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
          if (!metaDescription) {
            issues.push(this.getIssueDetails('missing_meta_description'));
            totalWarningIssues++;
          } else if (metaDescription.length > 160) {
            issues.push(this.getIssueDetails('meta_description_too_long', { metaDescription, length: metaDescription.length }));
            totalWarningIssues++;
          }

          // H1 Headings
          const h1s = $('h1');
          const h1Texts: string[] = [];
          h1s.each((_, el) => {
            const h1Val = $(el).text()?.trim();
            if (h1Val) h1Texts.push(h1Val);
          });

          if (h1s.length === 0) {
            issues.push(this.getIssueDetails('missing_h1'));
            totalWarningIssues++;
          } else if (h1s.length > 1) {
            issues.push(this.getIssueDetails('multiple_h1_tags', { h1s: h1Texts }));
            totalCriticalIssues++;
          }
          h1Text = h1Texts[0] || '';

          // Images without alt tag
          const badImages: string[] = [];
          $('img').each((_, el) => {
            const alt = $(el).attr('alt');
            const src = $(el).attr('src');
            if (alt === undefined || alt.trim() === '') {
              badImages.push(src || '(unknown source)');
            }
          });

          if (badImages.length > 0) {
            issues.push(this.getIssueDetails('missing_image_alt_tags', { images: badImages }));
            totalWarningIssues++;
          }

          // Canonical link check
          const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
          if (!canonical) {
            issues.push(this.getIssueDetails('missing_canonical_link'));
            totalWarningIssues++;
          }

          // Schema markup check
          const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
          const hasMicrodata = $('[itemscope]').length > 0;
          if (!hasJsonLd && !hasMicrodata) {
            issues.push(this.getIssueDetails('missing_schema_markup'));
            totalWarningIssues++;
          }

          // Core Web Vitals simulation
          const pageWeight = html.length;
          const scriptCount = $('script').length;
          const imgCount = $('img').length;

          const lcp = parseFloat((1.0 + (pageWeight / 100000) * 0.4 + scriptCount * 0.08 + imgCount * 0.12).toFixed(2));
          const cls = parseFloat(($('img').filter((_, el) => !$(el).attr('width') && !$(el).attr('height')).length * 0.03).toFixed(3));
          const inp = Math.round(80 + scriptCount * 8 + Math.random() * 40);

          if (lcp > 2.5) {
            issues.push(this.getIssueDetails('poor_lcp', { lcp }));
            totalCriticalIssues++;
          }
          if (cls > 0.1) {
            issues.push(this.getIssueDetails('poor_cls', { cls }));
            totalWarningIssues++;
          }
          if (inp > 200) {
            issues.push(this.getIssueDetails('poor_inp', { inp }));
            totalWarningIssues++;
          }

          // If it's the root page, check sitemap, robots, and llms.txt
          if (currentUrl === baseUrl || currentUrl === `${baseUrl}/`) {
            if (!hasRobots) {
              issues.push(this.getIssueDetails('missing_robots_txt'));
              totalWarningIssues++;
            }
            if (!hasSitemap) {
              issues.push(this.getIssueDetails('missing_sitemap_xml'));
              totalWarningIssues++;
            }
            if (!hasLlmstxt) {
              issues.push(this.getIssueDetails('missing_llms_txt'));
              totalWarningIssues++;
            }
          }

          // Parse Links to discover internal paths (queue internal URLs)
          if (depth < maxDepth) {
            $('a[href]').each((_, el) => {
              const href = $(el).attr('href');
              if (!href) return;

              try {
                const resolvedUrl = new URL(href, currentUrl);
                
                // Only queue internal links that match the host name
                if (resolvedUrl.hostname === domainHostname && !visited.has(resolvedUrl.href)) {
                  // Skip binary file extensions
                  if (!/\.(png|jpg|jpeg|gif|pdf|zip|tar|gz|mp4)$/i.test(resolvedUrl.pathname)) {
                    queue.push({ url: resolvedUrl.href, depth: depth + 1, referrer: currentUrl });
                  }
                }
              } catch (e) {
                // Invalid link syntax
              }
            });
          }
        }

        // Handle Broken Internal Referrer update
        if (referrer && (fetchError || statusCode >= 400)) {
          const refPage = crawledPagesData[referrer];
          if (refPage) {
            const hasBrokenIssue = refPage.issues.some(iss => iss.type === 'broken_internal_links');
            if (!hasBrokenIssue) {
              refPage.issues.push(this.getIssueDetails('broken_internal_links'));
              totalCriticalIssues++;
              
              await this.prisma.seoAuditPage.update({
                where: { id: refPage.id },
                data: { issues: refPage.issues as any }
              });
            }
          }
        }

        // Save page crawl log in DB
        const createdPage = await this.prisma.seoAuditPage.create({
          data: {
            auditId,
            url: currentUrl,
            statusCode,
            title: title || null,
            metaDescription: metaDescription || null,
            h1: h1Text || null,
            wordCount,
            issues: issues as any,
          },
        });

        crawledPagesData[currentUrl] = {
          id: createdPage.id,
          issues
        };
      }

      // Calculate overall health score (base 100, subtracting weights)
      const healthPenalty = (totalCriticalIssues * 12) + (totalWarningIssues * 3);
      const score = Math.max(15, 100 - healthPenalty);

      // Complete the Audit in DB
      await this.prisma.seoAudit.update({
        where: { id: auditId },
        data: {
          status: 'COMPLETED',
          score,
          pagesCrawled: crawledCount,
          completedAt: new Date(),
        },
      });

      console.log(`Crawl completed successfully for audit ${auditId}. Score: ${score}`);
    } catch (err) {
      console.error(`Audit crawl failed for ${auditId}:`, err);
      await this.prisma.seoAudit.update({
        where: { id: auditId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
    }
  }

  async findAll(websiteId: string, orgId: string) {
    await this.validateWebsiteOwnership(websiteId, orgId);
    return this.prisma.seoAudit.findMany({
      where: { websiteId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const audit = await this.prisma.seoAudit.findUnique({
      where: { id },
      include: {
        website: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!audit || audit.website.project.organizationId !== orgId) {
      throw new NotFoundException(`SEO Audit with ID ${id} not found`);
    }

    return audit;
  }

  async findPages(auditId: string, orgId: string) {
    await this.findOne(auditId, orgId);
    return this.prisma.seoAuditPage.findMany({
      where: { auditId },
      orderBy: { crawledAt: 'desc' },
    });
  }

  async exportAudit(auditId: string, format: 'pdf' | 'csv', orgId: string): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    const audit = await this.findOne(auditId, orgId);
    const pages = await this.prisma.seoAuditPage.findMany({
      where: { auditId },
      orderBy: { url: 'asc' },
    });

    const domain = audit.website.domain;
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date(audit.startedAt).toISOString().split('T')[0];

    const getPriorityScore = (page: any) => {
      let score = 0;
      let crit = 0;
      let warn = 0;
      let lcp = 0, inp = 0, cls = 0;
      const issues = (page.issues as any[]) || [];
      issues.forEach((issue) => {
        if (issue.severity === 'critical') crit++;
        else if (issue.severity === 'warning') warn++;
        if (issue.type === 'poor_lcp') lcp = 15;
        if (issue.type === 'poor_inp') inp = 10;
        if (issue.type === 'poor_cls') cls = 10;
      });
      score = crit * 25 + warn * 8 + lcp + inp + cls;
      return Math.min(100, score);
    };

    const pagesWithScore = pages.map(p => ({
      ...p,
      priorityScore: getPriorityScore(p)
    })).sort((a, b) => b.priorityScore - a.priorityScore);

    if (format === 'csv') {
      let csvContent = '\ufeff'; // UTF-8 BOM
      csvContent += 'URL,Status Code,Word Count,Fix Priority Score,Issue Type,Severity,Fix Suggestion\n';

      for (const page of pagesWithScore) {
        const issues = (page.issues as any[]) || [];
        if (issues.length === 0) {
          csvContent += `"${page.url.replace(/"/g, '""')}",${page.statusCode},${page.wordCount || 0},0,"None","Info","No issues found"\n`;
        } else {
          for (const issue of issues) {
            let suggestion = issue.recommendedFix;
            if (issue.type === 'missing_h1' && page.title) {
              suggestion = `Add <h1> tag. Suggested: <h1>${page.title}</h1>`;
            } else if (issue.type === 'meta_description_too_long' && (issue.details?.metaDescription || page.metaDescription)) {
              const currentDesc = issue.details?.metaDescription || page.metaDescription;
              suggestion = `Shorten meta description. Current length: ${currentDesc.length} chars. Trimmed suggestion: "${currentDesc.substring(0, 155)}..."`;
            } else if (issue.type === 'missing_image_alt_tags' && issue.details?.images?.length) {
              suggestion = `Add alt attribute. Missing on: ${issue.details.images.join(', ')}`;
            } else if (issue.type === 'multiple_h1_tags' && issue.details?.h1s?.length) {
              suggestion = `Consolidate multiple H1s: ${issue.details.h1s.join(' AND ')}`;
            }

            csvContent += `"${page.url.replace(/"/g, '""')}",${page.statusCode},${page.wordCount || 0},${page.priorityScore},"${issue.type}","${issue.severity}","${suggestion.replace(/"/g, '""')}"\n`;
          }
        }
      }

      return {
        data: Buffer.from(csvContent, 'utf-8'),
        filename: `seo_audit_${sanitizedDomain}_${dateStr}.csv`,
        mimeType: 'text/csv',
      };
    } else {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', () => resolve());
        doc.on('error', (err: any) => reject(err));

        // Title/Header band
        doc.fillColor('#0f172a').rect(0, 0, doc.page.width, 160).fill();
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('TECHNICAL SEO AUDIT REPORT', 50, 45);
        doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text(`Domain: ${domain}`, 50, 80);
        doc.text(`Generated on: ${new Date(audit.startedAt).toLocaleString()}`, 50, 98);
        doc.text(`Overall Score: ${audit.score ?? 'N/A'}/100`, 50, 116);

        // Stats Summary
        let criticalCount = 0;
        let warningCount = 0;
        pages.forEach((p) => {
          const issues = (p.issues as any[]) || [];
          issues.forEach((iss) => {
            if (iss.severity === 'critical') criticalCount++;
            else warningCount++;
          });
        });

        doc.fillColor('#1e293b').rect(50, 180, doc.page.width - 100, 70).fill();
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('Executive Summary', 70, 195);
        doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1')
          .text(`Crawled Pages: ${audit.pagesCrawled}  |  Critical Issues: ${criticalCount}  |  Warning Issues: ${warningCount}`, 70, 215);

        let y = 280;

        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Page-by-Page Audit Findings', 50, y);
        y += 25;

        for (const page of pagesWithScore) {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          doc.lineWidth(1).strokeColor('#e2e8f0').moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
          y += 15;

          doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af').text(page.url, 50, y, { width: doc.page.width - 200 });
          doc.fontSize(10).font('Helvetica-Bold').fillColor(page.priorityScore > 50 ? '#ef4444' : '#10b981')
            .text(`Priority Score: ${page.priorityScore}`, doc.page.width - 150, y, { align: 'right', width: 100 });
          y += 15;

          doc.fontSize(9).font('Helvetica').fillColor('#64748b')
            .text(`Status Code: ${page.statusCode}   |   Word Count: ${page.wordCount || 0}   |   Title: ${page.title || '(None)'}`, 50, y);
          y += 20;

          const issues = (page.issues as any[]) || [];
          if (issues.length === 0) {
            doc.fontSize(9).font('Helvetica-Oblique').fillColor('#10b981').text('  - Perfect score! No technical issues detected on this page.', 50, y);
            y += 15;
          } else {
            for (const issue of issues) {
              if (y > 720) {
                doc.addPage();
                y = 50;
              }

              let fixText = issue.recommendedFix;
              if (issue.type === 'missing_h1' && page.title) {
                fixText = `Add <h1> tag. Suggested: <h1>${page.title}</h1>`;
              } else if (issue.type === 'meta_description_too_long' && (issue.details?.metaDescription || page.metaDescription)) {
                const currentDesc = issue.details?.metaDescription || page.metaDescription;
                fixText = `Shorten meta description. Current length: ${currentDesc.length} chars. Trimmed suggestion: "${currentDesc.substring(0, 155)}..."`;
              } else if (issue.type === 'missing_image_alt_tags' && issue.details?.images?.length) {
                fixText = `Add alt attributes. Missing on: ${issue.details.images.join(', ')}`;
              } else if (issue.type === 'multiple_h1_tags' && issue.details?.h1s?.length) {
                fixText = `Consolidate multiple H1s: ${issue.details.h1s.join(' AND ')}`;
              }

              const severityColor = issue.severity === 'critical' ? '#ef4444' : '#f59e0b';
              doc.fontSize(9).font('Helvetica-Bold').fillColor(severityColor).text(`  • [${issue.severity.toUpperCase()}] ${issue.type.replace(/_/g, ' ')}`, 50, y);
              y += 12;

              doc.font('Helvetica').fillColor('#334155').text(`    Fix: ${fixText}`, 50, y, { width: doc.page.width - 100 });
              y += 18;
            }
          }
          y += 10;
        }

        doc.end();
      });

      return {
        data: Buffer.concat(chunks),
        filename: `seo_audit_${sanitizedDomain}_${dateStr}.pdf`,
        mimeType: 'application/pdf',
      };
    }
  }
}
