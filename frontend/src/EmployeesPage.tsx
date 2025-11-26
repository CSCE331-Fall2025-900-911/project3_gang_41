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
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

type NewApiEmployee = {
  employee_id: number;
  employee_name: string;
  job_title: string;
  hourly_rate: string;
  date_hired: string;
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
                <div className="flex justify-end pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">{translate("employees.close")}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function EmployeesPage() {
  const { t: translate } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); //modal

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
          return; // Exit the loop on final failure
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
  
  // Handler to open modal
  const openDetailsModal = (employee: Employee) => {
      setSelectedEmployee(employee);
  };

  // Handler to close modal
  const closeDetailsModal = () => {
      setSelectedEmployee(null);
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

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg flex items-center gap-2 ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={translate("employees.searchPlaceholder")}
                className="pl-9"
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
            </div>
            <Button type="submit" disabled={loading}>
              {translate("employees.search")}
            </Button>
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        {loading && page === 1 ? (
          // Initial Loading State
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {translate("employees.loading")}
          </div>
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => loadEmployees(1, searchTerm)}>
              {translate("employees.retry")}
            </Button>
          </div>
        ) : employees.length === 0 ? (
          // Empty/No Results State
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
          </div>
        ) : (
          // Employee List Display
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
                            onClick={() => openDetailsModal(e)}
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

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={closeDetailsModal}
          translate={translate}
        />
      )}
    </div>
  );
}