import { NextResponse } from 'next/server';
import { generateReport, generateMonthlyReport } from '@/services/reports-service';
import type { MonthlyReportPayload } from '@/services/reports-service';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitizeFilename(clientName: string, report: MonthlyReportPayload): string {
  let baseName: string;

  if (report.period.mode === 'monthly' && report.period.month && report.period.year) {
    const shortMonth = report.period.month.substring(0, 3);
    baseName = `${clientName}-${shortMonth}-${report.period.year}`;
  } else {
    const start = new Date(report.period.startDate);
    const end = new Date(report.period.endDate);
    const startStr = `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, '0')}${String(start.getUTCDate()).padStart(2, '0')}`;
    const endStr = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`;
    baseName = `${clientName}-${startStr}-${endStr}`;
  }

  let sanitized = baseName.replace(/[\s_./\\]+/g, '-');
  sanitized = sanitized.replace(/[^a-zA-Z0-9-]/g, '');
  sanitized = sanitized.replace(/-+/g, '-');
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  return `${sanitized}.pdf`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const clientId = params?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const hasMonthYear = monthStr != null || yearStr != null;
    const hasDateRange = startDateStr != null || endDateStr != null;

    if (hasMonthYear && hasDateRange) {
      return NextResponse.json(
        { error: 'Cannot use both month/year and startDate/endDate parameters' },
        { status: 400 }
      );
    }

    let report: MonthlyReportPayload | null = null;

    if (hasDateRange) {
      if (!startDateStr || !endDateStr) {
        return NextResponse.json(
          { error: 'Both startDate and endDate are required' },
          { status: 400 }
        );
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate parameter' }, { status: 400 });
      }

      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate parameter' }, { status: 400 });
      }

      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'startDate must be before or equal to endDate' },
          { status: 400 }
        );
      }

      report = await generateReport({ clientId, startDate, endDate });
    } else {
      const now = new Date();
      const month = monthStr ? parseInt(monthStr, 10) : now.getUTCMonth() + 1;
      const year = yearStr ? parseInt(yearStr, 10) : now.getUTCFullYear();

      if (isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 });
      }

      if (isNaN(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
      }

      report = await generateMonthlyReport(clientId, month, year);
    }

    if (!report) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    let buffer: Buffer;
    try {
      const [{ renderToBuffer }, { MonthlyReportPDFDocument }, React] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/reports/pdf-document'),
        import('react'),
      ]);
      buffer = await renderToBuffer(
        React.createElement(MonthlyReportPDFDocument, { report }) as any
      );
    } catch (pdfError) {
      logProductionRuntimeError('pdf-generation-render-error', pdfError);
      return NextResponse.json(
        { error: 'Failed to generate report PDF' },
        { status: 500 }
      );
    }

    const filename = sanitizeFilename(report.client.name, report);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    logProductionRuntimeError('api-clients-id-report-pdf-get', error);
    return NextResponse.json(
      { error: 'Failed to generate report PDF' },
      { status: 500 }
    );
  }
}
