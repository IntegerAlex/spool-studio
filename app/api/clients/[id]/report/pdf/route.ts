import { NextResponse } from 'next/server';
import { generateMonthlyReport } from '@/services/reports-service';
import { MonthlyReportPDFDocument } from '@/components/reports/pdf-document';
import { renderToBuffer } from '@react-pdf/renderer';
import { logProductionRuntimeError } from '@/lib/runtime-diagnostics';
import React from 'react';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function sanitizeFilename(clientName: string, month: string, year: number): string {
  // Convert month name to 3 letter abbreviation (e.g., "June" -> "Jun")
  const shortMonth = month.substring(0, 3);
  const baseName = `Monthly-Report-${clientName}-${shortMonth}-${year}`;
  
  // Replace spaces, underscores, dots, or slashes with hyphens
  let sanitized = baseName.replace(/[\s_./\\]+/g, '-');
  // Remove any character that is not alphanumeric or hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9-]/g, '');
  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');
  // Trim hyphens from ends
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

    const now = new Date();
    const month = monthStr ? parseInt(monthStr, 10) : now.getUTCMonth() + 1;
    const year = yearStr ? parseInt(yearStr, 10) : now.getUTCFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 });
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const report = await generateMonthlyReport(clientId, month, year);
    if (!report) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Generate PDF document
    let buffer: Buffer;
    try {
      buffer = await renderToBuffer(
        React.createElement(MonthlyReportPDFDocument, { report })
      );
    } catch (pdfError) {
      logProductionRuntimeError('pdf-generation-render-error', pdfError);
      return NextResponse.json(
        { error: 'Failed to generate report PDF' },
        { status: 500 }
      );
    }

    const filename = sanitizeFilename(report.client.name, report.period.month, report.period.year);

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
