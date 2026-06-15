import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { MonthlyReportPayload } from '@/services/reports-service';

// Define styles using @react-pdf/renderer's StyleSheet
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#6366f1',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 4,
  },
  periodText: {
    fontSize: 11,
    color: '#71717a',
  },
  contractText: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#18181b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderStyle: 'solid',
    backgroundColor: '#fafafa',
  },
  summaryCardHighlight: {
    flex: 2,
    minWidth: '40%',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderStyle: 'solid',
    backgroundColor: '#f0fdf4',
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#71717a',
    marginBottom: 4,
  },
  cardTitleHighlight: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#16a34a',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181b',
  },
  cardSubtext: {
    fontSize: 8,
    color: '#71717a',
    marginTop: 4,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    marginTop: 10,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    minHeight: 28,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    borderBottomStyle: 'solid',
    backgroundColor: '#fafafa',
    alignItems: 'center',
    minHeight: 28,
  },
  thName: {
    width: '40%',
    paddingLeft: 6,
    fontWeight: 'bold',
    color: '#71717a',
  },
  thType: {
    width: '15%',
    paddingLeft: 6,
    fontWeight: 'bold',
    color: '#71717a',
  },
  thUploaded: {
    width: '15%',
    paddingLeft: 6,
    fontWeight: 'bold',
    color: '#71717a',
  },
  thApproved: {
    width: '15%',
    paddingLeft: 6,
    fontWeight: 'bold',
    color: '#71717a',
  },
  thPublished: {
    width: '15%',
    paddingLeft: 6,
    fontWeight: 'bold',
    color: '#71717a',
  },
  tdName: {
    width: '40%',
    paddingLeft: 6,
    color: '#18181b',
  },
  tdType: {
    width: '15%',
    paddingLeft: 6,
    textTransform: 'capitalize',
    color: '#18181b',
  },
  tdUploaded: {
    width: '15%',
    paddingLeft: 6,
    color: '#71717a',
  },
  tdApproved: {
    width: '15%',
    paddingLeft: 6,
    color: '#71717a',
  },
  tdPublished: {
    width: '15%',
    paddingLeft: 6,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  emptyMessage: {
    padding: 30,
    textAlign: 'center',
    fontSize: 11,
    color: '#71717a',
    backgroundColor: '#fafafa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderStyle: 'dashed',
    marginTop: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    borderTopStyle: 'solid',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'between',
    fontSize: 8,
    color: '#a1a1aa',
  },
  pageNumber: {
    color: '#a1a1aa',
  },
});

function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDisplayDate(dateValue: string | undefined | null): string {
  if (!dateValue) return 'Not Configured';
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj.getTime())) return 'Not Configured';
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface PDFDocumentProps {
  report: MonthlyReportPayload;
}

export function MonthlyReportPDFDocument({ report }: PDFDocumentProps) {
  const generatedOn = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const contractStartStr = formatDisplayDate(report.client.contractStartDate);
  const contractEndStr = formatDisplayDate(report.client.contractEndDate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.reportTitle}>
            {report.period.mode === 'custom' ? 'Custom Delivery Report' : 'Monthly Delivery Report'}
          </Text>
          <Text style={styles.clientName}>{report.client.name}</Text>
          <Text style={styles.periodText}>
            Reporting Period: {report.period.displayLabel}
          </Text>
          <Text style={styles.contractText}>
            Contract Period: {contractStartStr} to {contractEndStr}
          </Text>
        </View>

        {/* Executive Summary */}
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.summaryGrid}>
          {/* Completion Rate */}
          <View style={styles.summaryCardHighlight}>
            <Text style={styles.cardTitleHighlight}>Completion Rate</Text>
            <Text style={styles.cardValue}>{report.summary.completionRate}%</Text>
            <Text style={styles.cardSubtext}>
              {report.summary.totalDelivered} of {report.summary.monthlyTarget} Delivered
            </Text>
          </View>

          {/* Posters */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Posters</Text>
            <Text style={styles.cardValue}>{report.summary.postersDelivered}</Text>
            <Text style={styles.cardSubtext}>Type: Poster</Text>
          </View>

          {/* Reels */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Reels</Text>
            <Text style={styles.cardValue}>{report.summary.reelsDelivered}</Text>
            <Text style={styles.cardSubtext}>Type: Reel</Text>
          </View>
        </View>

        {/* Assets Table */}
        <Text style={styles.sectionTitle}>Published Assets</Text>
        {report.assets.length === 0 ? (
          <Text style={styles.emptyMessage}>
            No published content found for this reporting period.
          </Text>
        ) : (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow} fixed>
              <Text style={styles.thName}>Asset Name</Text>
              <Text style={styles.thType}>Type</Text>
              <Text style={styles.thUploaded}>Uploaded</Text>
              <Text style={styles.thApproved}>Approved</Text>
              <Text style={styles.thPublished}>Published</Text>
            </View>

            {/* Table Rows */}
            {report.assets.map((asset) => (
              <View style={styles.tableRow} key={asset.id} wrap={false}>
                <Text style={styles.tdName}>{asset.title}</Text>
                <Text style={styles.tdType}>{asset.type}</Text>
                <Text style={styles.tdUploaded}>{formatDate(asset.uploadedAt)}</Text>
                <Text style={styles.tdApproved}>{formatDate(asset.approvedAt)}</Text>
                <Text style={styles.tdPublished}>{formatDate(asset.publishedAt)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by Digiscale Content Ops Platform</Text>
          <Text>Generated On: {generatedOn}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
