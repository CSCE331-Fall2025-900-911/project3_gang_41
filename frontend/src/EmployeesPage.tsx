import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from '@/lib/api';
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  X,
  Users,
  Calendar,
  DollarSign,
  Tag,
  Eye,
  Plus,
  Check,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

// --- TYPES ---

type NewApiEmployee = {
  employee_id: number;
  employee_name: string;
  job_title: string;
  hourly_rate: string;
  date_hired: string;
  email?: string;
  password?: string;
};

type Employee = {
  id: number;
  fullName: string;
  hireDate: Date;
  title: string;
  hourlyRate: string;
};

type EmployeeApiResponse = NewApiEmployee[];

const PAGE_SIZE = 20;

const parsePgTimestamp = (ts: string): Date => {
  const date = new Date(ts);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
};

const normalizeEmployee = (e: NewApiEmployee): Employee => {
  return {
    id: e.employee_id,
    fullName: e.employee_name,
    hireDate: parsePgTimestamp(e.date_hired),
    title: e.job_title,
    hourlyRate: e.hourly_rate,
  };
};

const formatDate = (date: Date) => 
    date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// --- Modals ---

interface EmployeeDetailModalProps {
    employee: Employee;
    isOpen: boolean;
    onClose: () => void;
    translate: (key: string, options?: Record<string, string | number>) => string;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, isOpen, onClose, translate }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg flex-none">
                            {employee.fullName.charAt(0)}
                        </div>
                        <DialogTitle className="text-2xl">{employee.fullName}</DialogTitle>
                    </div>
                    <DialogDescription className="flex items-center gap-1 mt-1">
                        {employee.title}
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Tag className="h-4 w-4" /> {translate("employees.employeeId")}
                        </span>
                        <Badge className="text-lg bg-indigo-500 hover:bg-indigo-600">
                            {employee.id}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> {translate("employees.hourlyRate")}
                        </span>
                        <span className="text-xl font-semibold text-green-600">
                            {formatCurrency(employee.hourlyRate)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> {translate("employees.dateHired")}
                        </span>
                        <span className="text-base font-medium">
                            {formatDate(employee.hireDate)}
                        </span>
                    </div>
                </div>
                {/* Note: Original code didn't have DialogFooter or Close button in the detail modal, 
                    but I kept the Close button here for consistency with the new design */}
                <div className="flex justify-end pt-4">
                     <Button type="button" variant="outline" onClick={onClose}>{translate("employees.close")}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page Component ---

export default function EmployeesPage() {
  const { t: translate } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  
  // Modal States
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{email: string, password: string} | null>(null);

  // Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employee_name: "",
    job_title: "",
    hourly_rate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEmployees = async (targetPage = 1, search = "") => {
    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      try {
        if (targetPage === 1 && currentRetry === 0) {
          setLoading(true);
          setError(null);
        }

        let endpoint = `/api/employees?page=${targetPage}&limit=${PAGE_SIZE}`;
        if (search.trim()) {
          endpoint += `&search=${encodeURIComponent(search.trim())}`;
        }

        const data = await fetchApi<EmployeeApiResponse>(endpoint);
        const normalized = (data ?? []).map(normalizeEmployee);

        setEmployees((prev) => 
          targetPage === 1 ? normalized : [...prev, ...normalized]
        );
        
        setHasMoreData((data ?? []).length === PAGE_SIZE);
        setIsSearching(!!search.trim());
        setLoading(false);
        return;
        
      } catch (e: any) {
        currentRetry++;
        if (currentRetry >= maxRetries) {
          console.error("Load error after retries:", e);
          setError(e?.message ?? translate("employees.unableToLoad"));
          toast.error(translate("employees.failedToLoad"));
          setLoading(false);
          return;
        }
        const delay = Math.pow(2, currentRetry) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  useEffect(() => {
    loadEmployees(1, "");
  }, []);

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    await loadEmployees(next, searchTerm);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setEmployees([]);
    loadEmployees(1, searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setPage(1);
    setEmployees([]);
    loadEmployees(1, "");
  };
  
  // --- Handlers for Add Employee ---

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.employee_name || !formData.job_title || !formData.hourly_rate) {
        toast.error("Please fill in all fields");
        setIsSubmitting(false);
        return;
    }

    try {
        // Adjust this fetch call if you need to use your 'fetchApi' wrapper
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_name: formData.employee_name,
                job_title: formData.job_title,
                hourly_rate: parseFloat(formData.hourly_rate)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create employee');
        }

        // Success logic
        setIsAddModalOpen(false);
        setNewCredentials({
            email: result.data.email, 
            password: result.data.password
        });
        
        // Reset form
        setFormData({ employee_name: "", job_title: "", hourly_rate: "" });
        
        // Refresh list
        loadEmployees(1, searchTerm);
        toast.success("Employee created successfully");

    } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to create employee");
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!newCredentials) return;
    const text = `Email: ${newCredentials.email}\nPassword: ${newCredentials.password}`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied to clipboard");
  };

  return (
    <div className="flex h-full bg-background flex-col overflow-hidden">
      
      <div className="border-b bg-white flex-none">
        <div className="flex h-16 items-center px-6 justify-between gap-4">
          <div className="flex items-center gap-2 min-w-fit">
            <Users className="h-5 w-5" />
            <h1 className="text-2xl font-bold hidden md:block">{translate("employees.title")}</h1>
            <h1 className="text-xl font-bold md:hidden">{translate("employees.titleShort")}</h1>
          </div>

          <div className="flex-1 max-w-lg flex items-center gap-2 ml-auto">
             {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={translate("employees.searchPlaceholder")}
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
            
            <Button type="submit" disabled={loading} onClick={handleSearch} className="hidden sm:flex">
              {translate("employees.search")}
            </Button>

            {/* NEW ADD BUTTON */}
            <Button 
                onClick={() => setIsAddModalOpen(true)} 
                className="bg-green-600 hover:bg-green-700 text-white ml-2"
            >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Employee</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        {loading && page === 1 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {translate("employees.loading")}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => loadEmployees(1, searchTerm)}>
              {translate("employees.retry")}
            </Button>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Users className="h-10 w-10 opacity-20" />
            <p>
              {isSearching
                ? translate("employees.noResults", { term: searchTerm })
                : translate("employees.noData")}
            </p>
            {isSearching && (
              <Button variant="link" onClick={clearSearch}>
                {translate("employees.clearSearch")}
              </Button>
            )}
            {/* Call to action for empty state */}
            {!isSearching && (
                 <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="mt-4">
                    <Plus className="mr-2 h-4 w-4"/> Add your first employee
                 </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto pb-6">
            {employees.map((e) => {
              return (
                <Card key={e.id} className="overflow-hidden flex-none">
                  <CardHeader className="p-4 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg flex-none">
                          {e.fullName.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-xl font-semibold">{e.fullName}</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            {e.title}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 mr-2">
                          ID: {e.id}
                        </Badge>
                        
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setSelectedEmployee(e)}
                            className="bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            {translate("employees.viewDetails")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}

            {hasMoreData && (
              <div className="flex justify-center pt-4 pb-8">
                <Button variant="secondary" onClick={loadMore} disabled={loading} className="min-w-[150px]">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {translate("employees.loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          translate={translate}
        />
      )}

      {/* --- ADD EMPLOYEE MODAL --- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                    Enter the details below. Login credentials will be generated automatically.
                </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateEmployee} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right text-sm font-medium">Name</span>
                    <Input
                        id="name"
                        value={formData.employee_name}
                        onChange={(e) => setFormData({...formData, employee_name: e.target.value})}
                        className="col-span-3"
                        placeholder="e.g. John Doe"
                        required
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right text-sm font-medium">Job Title</span>
                    <Input
                        id="job"
                        value={formData.job_title}
                        onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                        className="col-span-3"
                        placeholder="e.g. Manager"
                        required
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right text-sm font-medium">Rate ($)</span>
                    <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                        className="col-span-3"
                        placeholder="0.00"
                        required
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Employee
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* --- CREDENTIALS SUCCESS MODAL --- */}
      <Dialog open={!!newCredentials} onOpenChange={() => setNewCredentials(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Check className="h-6 w-6" />
                    <DialogTitle>Employee Created Successfully</DialogTitle>
                </div>
                <DialogDescription>
                    The system has generated the following credentials. Please copy them now as they cannot be retrieved later.
                </DialogDescription>
            </DialogHeader>
            
            {newCredentials && (
                <div className="bg-slate-100 p-4 rounded-md space-y-3 border">
                    <div>
                        <span className="text-xs uppercase text-slate-500 font-bold">Email (Login)</span>
                        <div className="font-mono text-lg font-semibold select-all">{newCredentials.email}</div>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                        <span className="text-xs uppercase text-slate-500 font-bold">Temporary Password</span>
                        <div className="font-mono text-lg font-semibold select-all">{newCredentials.password}</div>
                    </div>
                </div>
            )}

            <DialogFooter className="sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => setNewCredentials(null)}>
                    Close
                </Button>
                <Button type="button" onClick={copyToClipboard} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Credentials
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}