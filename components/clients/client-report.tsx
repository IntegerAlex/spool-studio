'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, FileText, CheckCircle2, Video, FileImage, ArrowUpRight, FolderHeart, Info, Download, Loader2 } from 'lucide-react';
import { MonthlyReportPayload } from '@/services/reports-service';

interface ClientReportProps {
  clientId: string;
  contractStartDate?: Date | string;
  contractEndDate?: Date | string;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

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

function formatDisplayDate(dateValue: Date | string | undefined | null): string {
  if (!dateValue) return '—';
  const dateObj = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(dateObj.getTime())) return '—';
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimelineDate(isoString: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

export function ClientReport({ clientId, contractStartDate, contractEndDate }: ClientReportProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [report, setReport] = useState<MonthlyReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/clients/${clientId}/report?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load report data');
        }
        const data = await res.json();
        if (active) {
          setReport(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      active = false;
    };
  }, [clientId, selectedMonth, selectedYear]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/clients/${clientId}/report/pdf?month=${selectedMonth}&year=${selectedYear}`
      );
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate report PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const disposition = response.headers.get('content-disposition');
      let filename = `Monthly-Report-${report?.client.name || 'Client'}-${selectedMonth}-${selectedYear}.pdf`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Failed to generate report PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedMonthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  return (
    <div className="space-y-6">
      {/* Report Cover Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Monthly Delivery Report</p>
          <h2 className="text-[20px] font-bold text-white leading-tight">
            {report?.client.name || 'Client Report'}
          </h2>
          <p className="text-[13px] text-[#71717a]">
            Reporting Period: <span className="text-white font-medium">{selectedMonthLabel} {selectedYear}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Select
            value={String(selectedMonth)}
            onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[130px] h-9 rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] text-[13px] text-white">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[90px] h-9 rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] text-[13px] text-white">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading || !report}
            variant="outline"
            className="h-9 px-3 rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] text-[13px] text-white hover:bg-[#27272a] hover:text-white"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-[var(--primary)]" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-[#71717a] text-[13px]">Loading delivery report...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 rounded-[10px] border border-red-500/20 bg-red-500/5">
          <p className="text-red-400 text-[13px]">{error}</p>
        </div>
      ) : report ? (
        <>
          {/* Executive Summary Card */}
          <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-6 shadow-none">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#71717a] mb-4">Executive Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Client Name</p>
                <p className="text-[14px] font-semibold text-white">{report.client.name}</p>
                <p className="text-[12px] text-[#71717a]">{report.client.instagramHandle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Deliverables</p>
                <p className="text-[14px] font-semibold text-white">
                  Delivered: <span className="text-emerald-400">{report.summary.totalDelivered}</span> / {report.summary.monthlyTarget}
                </p>
                <p className="text-[12px] text-[#71717a]">Completion: {report.summary.completionRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Contract Period</p>
                <p className="text-[13px] font-semibold text-white">
                  {contractStartDate ? formatDisplayDate(contractStartDate) : 'Not Configured'}
                  {' → '}
                  {contractEndDate ? formatDisplayDate(contractEndDate) : 'Not Configured'}
                </p>
                <p className="text-[12px] text-[#71717a]">
                  {!contractStartDate && !contractEndDate ? 'Contract dates not configured' : 'Active Agreement'}
                </p>
              </div>
            </div>
          </Card>

          {/* Enhanced KPIs Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            {/* Completion card - Visually most important */}
            <Card className="col-span-1 sm:col-span-2 rounded-[10px] border border-emerald-500/20 bg-emerald-500/[0.03] p-5 shadow-none flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-400">Completion Rate</p>
                <p className="mt-2 text-[36px] font-bold text-white leading-none">{report.summary.completionRate}%</p>
              </div>
              <div className="mt-4 space-y-2">
                <div className="w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, report.summary.completionRate)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#a1a1aa] font-medium">
                  {report.summary.totalDelivered} of {report.summary.monthlyTarget} Delivered
                </p>
              </div>
            </Card>

            <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-4 shadow-none flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#71717a]">Posters Delivered</p>
                <p className="mt-2 text-[28px] font-semibold text-white">{report.summary.postersDelivered}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-2">
                <span className="text-[11px] text-[#71717a]">Asset type: Poster</span>
                <FileImage className="h-4 w-4 text-blue-400" />
              </div>
            </Card>

            <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-4 shadow-none flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#71717a]">Reels Delivered</p>
                <p className="mt-2 text-[28px] font-semibold text-white">{report.summary.reelsDelivered}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-2">
                <span className="text-[11px] text-[#71717a]">Asset type: Reel</span>
                <Video className="h-4 w-4 text-pink-400" />
              </div>
            </Card>

            <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-4 shadow-none flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#71717a]">Monthly Target</p>
                <p className="mt-2 text-[28px] font-semibold text-white">{report.summary.monthlyTarget}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-2">
                <span className="text-[11px] text-[#71717a]">Agreed target</span>
                <FileText className="h-4 w-4 text-purple-400" />
              </div>
            </Card>
          </div>

          {report.assets.length === 0 ? (
            <Card className="rounded-[10px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] py-16 text-center shadow-none">
              <div className="flex flex-col items-center justify-center space-y-3">
                <FolderHeart className="h-8 w-8 text-[#71717a]" />
                <h4 className="text-[14px] font-semibold text-white">No Published Content</h4>
                <p className="text-[13px] text-[#71717a] max-w-[280px]">
                  No assets were published during the selected reporting period.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Asset Table */}
              <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-5 shadow-none xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-medium text-white">Published Assets</h3>
                  <Badge variant="secondary" className="bg-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] border-0 text-[10px] font-normal font-mono">
                    {report.assets.length} Item(s)
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.05)] pb-2 text-[#71717a]">
                        <th className="pb-2 font-medium">Asset Name</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Uploaded</th>
                        <th className="pb-2 font-medium">Approved</th>
                        <th className="pb-2 font-medium">Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.assets.map((asset) => (
                        <tr
                          key={asset.id}
                          className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.01)]"
                        >
                          <td className="py-3 font-medium text-white truncate max-w-[160px]">
                            {asset.driveFileUrl ? (
                              <a
                                href={asset.driveFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 hover:text-[#818cf8] transition-colors"
                              >
                                <span>{asset.title}</span>
                                <ArrowUpRight className="h-3.5 w-3.5 text-[#71717a] shrink-0" />
                              </a>
                            ) : (
                              asset.title
                            )}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant="secondary"
                              className={
                                asset.type === 'reel'
                                  ? 'bg-pink-500/10 text-pink-400 hover:bg-pink-500/10 border-0'
                                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/10 border-0'
                              }
                            >
                              {asset.type}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-[#a1a1aa]">{formatDate(asset.uploadedAt)}</td>
                          <td className="py-3 font-mono text-[#a1a1aa]">{formatDate(asset.approvedAt)}</td>
                          <td className="py-3 font-mono text-emerald-400 font-medium">{formatDate(asset.publishedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Delivery Timeline - Optimized to 5 latest items */}
              <Card className="rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-5 shadow-none">
                <div className="flex flex-col gap-1 border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-medium text-white">Latest Deliveries</h3>
                    <Badge variant="outline" className="text-[10px] border-[rgba(255,255,255,0.08)] text-[#71717a]">
                      Recent 5
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#71717a]">Showing latest 5 deliveries</p>
                </div>
                
                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[rgba(255,255,255,0.08)]">
                  {report.assets.slice(0, 5).map((asset) => (
                    <div key={asset.id} className="relative pl-6 space-y-1.5">
                      <div className="absolute left-[5px] top-1.5 size-2.5 rounded-full border border-[var(--primary)] bg-[#161616]" />
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[12px] font-medium text-white truncate max-w-[140px]">
                          {asset.title}
                        </h4>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-[rgba(255,255,255,0.1)] capitalize text-[#71717a]">
                          {asset.type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-[#71717a]">
                        {asset.uploadedAt && (
                          <div>
                            <p className="uppercase tracking-wide font-medium">Uploaded</p>
                            <p className="mt-0.5 text-white">{formatTimelineDate(asset.uploadedAt)}</p>
                          </div>
                        )}
                        {asset.approvedAt && (
                          <div>
                            <p className="uppercase tracking-wide font-medium">Approved</p>
                            <p className="mt-0.5 text-white">{formatTimelineDate(asset.approvedAt)}</p>
                          </div>
                        )}
                        {asset.publishedAt && (
                          <div>
                            <p className="uppercase tracking-wide font-medium text-emerald-400">Published</p>
                            <p className="mt-0.5 text-emerald-400 font-semibold">{formatTimelineDate(asset.publishedAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
