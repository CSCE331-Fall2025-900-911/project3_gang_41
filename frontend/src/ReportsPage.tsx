import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Printer,
  Calendar,
  Eye,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Lock,
  History,
  TrendingUp,
  CreditCard,
  Coins,
  Receipt,
  Loader2,
  Clock
} from "lucide-react";

// --- TYPES ---

type HourlyTotal = {
    hour_label: string;
    count: number;
    sales: number;
};

type XReportData = {
  transactions: number;
  grossSales: number;
  netSales: number;
  cashSales: number;
  cardSales: number;
  tax: number;
  discounts: number;
  hourlyTotals: HourlyTotal[];
};

type ZReportHistoryItem = {
  report_id: number;
  date_created: string;
  start_time: string;
  end_time: string;
  total_sales: string | number;
  cash_sales: string | number;
  card_sales: string | number;
  tax_total: string | number;
  variance: string | number;
  opening_float: string | number;
  transaction_count: number;
  counted_cash: string | number;
};

const OPENING_FLOAT = 150.00;

export default function ReportsPage() {
  const { t: translate } = useTranslation();
  
  const [activeTab, setActiveTab] = useState("x-report");
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [xReport, setXReport] = useState<XReportData | null>(null);
  const [reportLocked, setReportLocked] = useState(false); // New locked state
  const [history, setHistory] = useState<ZReportHistoryItem[]>([]);

  // Z-Report Form State
  const [countedCash, setCountedCash] = useState<string>("");
  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details State
  const [selectedReport, setSelectedReport] = useState<ZReportHistoryItem | null>(null);

  // --- CALCULATIONS ---
  const expectedCash = (xReport?.cashSales || 0) + OPENING_FLOAT;
  const variance = countedCash ? parseFloat(countedCash) - expectedCash : 0;

  // --- API HANDLERS ---

  const loadXReport = useCallback(async () => {
    setLoading(true);
    setReportLocked(false);
    try {
        const data = await fetchApi<XReportData>('/api/reports/x-report');
        setXReport(data);
    } catch (error: any) {
        if (error.message && error.message.includes("Shift Closed")) {
            setReportLocked(true);
            setXReport(null);
        } else {
            console.error(error);
            toast.error(translate("reports.failedToLoad") || "Failed to load X-Report data");
        }
    } finally {
        setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<ZReportHistoryItem[]>('/api/reports/history');
      setHistory(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load report history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'x-report' || activeTab === 'z-report') {
      loadXReport();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadXReport, loadHistory]);

  const handleRefresh = () => {
    if (activeTab === 'history') loadHistory();
    else loadXReport();
  };

  const handleCloseDay = async () => {
    if (!countedCash) return;
    setIsSubmitting(true);
    try {
      await fetchApi('/api/reports/z-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            countedCash: parseFloat(countedCash),
            openingFloat: OPENING_FLOAT
        })
      });

    toast.success(translate("toasts.shiftClosed"));
      setCloseDayOpen(false);
      setCountedCash("");
      setXReport(null);
      setActiveTab("history");
    } catch (error: any) {
      console.error(error);
    toast.error(error.message || translate("toasts.failedClose"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-full bg-background flex-col overflow-hidden">
      
      {/* --- PRINT STYLES --- */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            border: none;
          }
          .print-hide {
            display: none !important;
          }
          /* Ensure modal doesn't block print if open */
          .fixed {
            position: absolute;
          }
        }
      `}</style>

      {/* --- HEADER --- */}
      <div className="border-b bg-white flex-none">
        <div className="flex h-16 items-center px-6 justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-2xl font-bold">{translate("reports.title")}</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-slate-100 px-3 py-1.5 rounded-md">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
             </div>
             <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {translate("reports.refreshData")}
             </Button>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        <div className="max-w-6xl mx-auto space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-6">
                    <TabsTrigger value="x-report">{translate("reports.xReport")}</TabsTrigger>
                    <TabsTrigger value="z-report">{translate("reports.zReport")}</TabsTrigger>
                    <TabsTrigger value="history">{translate("reports.archives")}</TabsTrigger>
                </TabsList>

                {/* --- X-REPORT TAB --- */}
                <TabsContent value="x-report" className="space-y-4">
                    {loading && !xReport ? (
                         <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                         </div>
                    ) : reportLocked ? (
                         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                            <Lock className="h-12 w-12 text-slate-400 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700">Daily Report Locked</h3>
                            <p className="text-slate-500 max-w-sm text-center mt-2">
                                A Z-Report has already been generated for today. The current shift is closed.
                            </p>
                            <Button className="mt-6" variant="outline" onClick={() => setActiveTab("history")}>
                                View Past Reports
                            </Button>
                         </div>
                    ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{translate("reports.grossSales")}</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(xReport?.grossSales || 0)}</div>
                                    <p className="text-xs text-muted-foreground">{xReport?.transactions || 0} {translate("reports.transactions")}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{translate("reports.netSales")}</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(xReport?.netSales || 0)}</div>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(xReport?.tax || 0)} {translate("reports.tax")}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{translate("reports.cardSales")}</CardTitle>
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(xReport?.cardSales || 0)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {xReport?.grossSales 
                                            ? Math.round(((xReport.cardSales || 0) / xReport.grossSales) * 100) 
                                            : 0}% {translate("reports.ofTotal")}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{translate("reports.cashSales")}</CardTitle>
                                    <Coins className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(xReport?.cashSales || 0)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {xReport?.grossSales 
                                            ? Math.round(((xReport.cashSales || 0) / xReport.grossSales) * 100) 
                                            : 0}% {translate("reports.ofTotal")}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* --- HOURLY BREAKDOWN --- */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5" />
                                        Hourly Breakdown
                                    </CardTitle>
                                    <CardDescription>Sales activity by hour for current shift</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="h-[300px] overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Orders</TableHead>
                                                    <TableHead className="text-right">Sales</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {xReport?.hourlyTotals?.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{row.hour_label}</TableCell>
                                                        <TableCell>{row.count}</TableCell>
                                                        <TableCell className="text-right font-bold">{formatCurrency(row.sales)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {(!xReport?.hourlyTotals || xReport.hourlyTotals.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                                            No hourly data available
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* --- PRINTABLE SECTION --- */}
                            <Card className="border-dashed border-2 print-section h-full flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Receipt className="h-5 w-5" />
                                        {translate("reports.currentShiftSnapshot")}
                                    </CardTitle>
                                    <CardDescription>{translate("reports.xReportDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 flex-1">
                                    <div className="bg-white border rounded-md p-6 max-w-md mx-auto shadow-sm font-mono text-sm">
                                        <div className="text-center font-bold text-lg mb-4">{translate("print.xReport")}</div>
                                        <div className="flex justify-between py-1 border-b"><span>{translate("print.date")}</span><span>{new Date().toLocaleDateString()}</span></div>
                                        <div className="flex justify-between py-1 border-b"><span>{translate("print.time")}</span><span>{new Date().toLocaleTimeString()}</span></div>
                                        
                                        <div className="py-4 space-y-1">
                                            <div className="flex justify-between"><span>{translate("print.salesGross")}</span><span>{formatCurrency(xReport?.grossSales || 0)}</span></div>
                                            <div className="flex justify-between text-muted-foreground"><span>- {translate("print.discounts")}</span><span>{formatCurrency(xReport?.discounts || 0)}</span></div>
                                            <div className="flex justify-between font-bold pt-2"><span>{translate("print.netSales")}</span><span>{formatCurrency(xReport?.netSales || 0)}</span></div>
                                            <div className="flex justify-between"><span>{translate("print.plusTax")}</span><span>{formatCurrency(xReport?.tax || 0)}</span></div>
                                            <div className="flex justify-between font-bold border-t border-black pt-2 mt-2"><span>{translate("print.totalCap")}</span><span>{formatCurrency(xReport?.grossSales || 0)}</span></div>
                                        </div>
                                        <div className="py-2 border-t border-dashed">
                                            <div className="flex justify-between"><span>{translate("print.cashCalc")}</span><span>{formatCurrency(expectedCash)}</span></div>
                                        </div>
                                    </div>
                                </CardContent>
                                
                                {/* Hidden during print */}
                                <CardFooter className="justify-end gap-2 bg-slate-50/50 print-hide flex-none">
                                    <Button variant="outline" onClick={handlePrint}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        {translate("reports.print")}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </>
                    )}
                </TabsContent>

                {/* --- Z-REPORT TAB --- */}
                <TabsContent value="z-report" className="space-y-4">
                    {reportLocked ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                            <Lock className="h-12 w-12 text-emerald-600 mb-4" />
                            <h3 className="text-lg font-semibold text-emerald-700">Day Already Closed</h3>
                            <p className="text-slate-500 max-w-sm text-center mt-2">
                                The Z-Report for today has already been finalized.
                            </p>
                            <Button className="mt-6" variant="outline" onClick={() => setActiveTab("history")}>
                                View Archives
                            </Button>
                        </div>
                    ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-4">
                            <Card className="bg-slate-900 text-white border-none">
                                <CardHeader>
                                    <CardTitle>{translate("reports.closingSummary")}</CardTitle>
                                    <CardDescription className="text-slate-400">{translate("reports.systemCalculations")}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div className="text-sm text-slate-400">{translate("reports.openingFloat")}</div>
                                        <div className="text-xl font-bold">{formatCurrency(OPENING_FLOAT)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400">{translate("reports.cashSales")}</div>
                                        <div className="text-xl font-bold">{formatCurrency(xReport?.cashSales || 0)}</div>
                                    </div>
                                    <Separator className="bg-slate-700" />
                                    <div>
                                        <div className="text-sm text-slate-400 uppercase tracking-wider font-bold">{translate("reports.expectedInDrawer")}</div>
                                        <div className="text-3xl font-bold text-emerald-400">{formatCurrency(expectedCash)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-amber-500" />
                                    {translate("reports.reconciliationTitle")}
                                </CardTitle>
                                <CardDescription>{translate("reports.reconciliationDesc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="countedCash">{translate("reports.totalCashCounted")}</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                id="countedCash" 
                                                placeholder="0.00" 
                                                className="pl-9 text-lg" 
                                                value={countedCash}
                                                onChange={(e) => setCountedCash(e.target.value)}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    {countedCash && (
                                        <div className={`p-4 rounded-md flex items-center gap-3 border ${Math.abs(variance) < 0.01 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                            {Math.abs(variance) < 0.01 ? (
                                                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-muted-foreground">{translate("reports.variance")}</div>
                                                <div className={`text-xl font-bold ${Math.abs(variance) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {formatCurrency(variance)}
                                                </div>
                                            </div>
                                            {Math.abs(variance) >= 0.01 && (
                                                <div className="text-xs text-red-600 font-medium px-2 py-1 bg-white/50 rounded">
                                                    {translate("reports.actionRequired")}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between bg-slate-50/50 border-t">
                                <div className="text-xs text-muted-foreground">{translate("reports.actionCannotBeUndone")}</div>
                                <Button variant="destructive" onClick={() => setCloseDayOpen(true)} disabled={!countedCash || loading}>
                                    {translate("reports.closeDayButton")}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                    )}
                </TabsContent>

                {/* --- HISTORY TAB (Archives) --- */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                {translate("reports.pastReports")}
                            </CardTitle>
                            <CardDescription>{translate("reports.pastReportsDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{translate("reports.reportDate")}</TableHead>
                                        <TableHead>{translate("reports.type")}</TableHead>
                                        <TableHead>{translate("reports.totalSales")}</TableHead>
                                        <TableHead>{translate("reports.variance")}</TableHead>
                                        <TableHead className="text-right">{translate("reports.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((row) => (
                                        <TableRow key={row.report_id}>
                                            <TableCell className="font-medium">
                                                {new Date(row.date_created).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">Z-Report</Badge>
                                            </TableCell>
                                            <TableCell>{formatCurrency(Number(row.total_sales))}</TableCell>
                                            <TableCell>
                                                {Number(row.variance) !== 0 ? (
                                                    <span className="text-red-500 font-bold">{formatCurrency(Number(row.variance))}</span>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold">$0.00</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(row)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No history found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* --- CLOSE DAY CONFIRMATION DIALOG --- */}
      <Dialog open={closeDayOpen} onOpenChange={setCloseDayOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{translate("reports.confirmCloseTitle")}</DialogTitle>
                <DialogDescription>{translate("reports.confirmCloseDesc")}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span>{translate("reports.expected")}:</span>
                    <span className="font-bold">{formatCurrency(expectedCash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>{translate("reports.counted")}:</span>
                    <span className="font-bold">{formatCurrency(parseFloat(countedCash || "0"))}</span>
                </div>
                <Separator />
                <div className={`flex justify-between font-bold text-lg ${Math.abs(variance) >= 0.01 ? 'text-red-500' : 'text-emerald-600'}`}>
                    <span>{translate("reports.variance")}:</span>
                    <span>{formatCurrency(variance)}</span>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCloseDayOpen(false)}>{translate("reports.cancel")}</Button>
                <Button variant="destructive" onClick={handleCloseDay} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    {translate("reports.finalizeReport")}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- HISTORY DETAILS DIALOG --- */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Z-Report #{selectedReport?.report_id}</DialogTitle>
                <DialogDescription>
                    {new Date(selectedReport?.date_created || "").toLocaleString()}
                </DialogDescription>
            </DialogHeader>
            
            {selectedReport && (
                <div className="bg-slate-50 border rounded-md p-4 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 pb-3 border-b">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Transactions</span>
                            <div className="font-bold">{selectedReport.transaction_count}</div>
                        </div>
                        <div className="space-y-1 text-right">
                             <span className="text-xs text-muted-foreground">Total Sales</span>
                             <div className="font-bold">{formatCurrency(Number(selectedReport.total_sales))}</div>
                        </div>
                    </div>

                    <div className="space-y-1 pt-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Cash Sales</span>
                            <span>{formatCurrency(Number(selectedReport.cash_sales))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Card Sales</span>
                            <span>{formatCurrency(Number(selectedReport.card_sales))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax</span>
                            <span>{formatCurrency(Number(selectedReport.tax_total))}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Opening Float</span>
                            <span>{formatCurrency(Number(selectedReport.opening_float))}</span>
                        </div>
                         <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Counted Cash</span>
                            <span>{formatCurrency(Number(selectedReport.counted_cash))}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1">
                            <span>Variance</span>
                            <span className={Number(selectedReport.variance) !== 0 ? "text-red-500" : "text-emerald-600"}>
                                {formatCurrency(Number(selectedReport.variance))}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}