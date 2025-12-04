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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Copy,
  Trash2,
  Lock,
  Mail,
  Pencil
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

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
  email?: string;
  password?: string;
};

const PAGE_SIZE = 50;

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
    email: e.email,
    password: e.password
  };
};

const formatDate = (date: Date) => 
    date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// --- INTERNAL COMPONENT: Employee Detail Modal ---

interface EmployeeDetailModalProps {
    employee: Employee;
    isOpen: boolean;
    onClose: () => void;
    onUpdateEmployee: (id: number, data: Partial<Employee>) => Promise<void>;
    translate: (key: string, options?: any) => string;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, isOpen, onClose, onUpdateEmployee, translate }) => {
    // Editing States
    const [isEditingPass, setIsEditingPass] = useState(false);
    const [newPass, setNewPass] = useState(employee.password || "");
    
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState(employee.title || "Cashier");

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(employee.fullName);

    const [isEditingRate, setIsEditingRate] = useState(false);
    const [newRate, setNewRate] = useState(employee.hourlyRate || "0");

    const [loading, setLoading] = useState(false);

    const handleSavePass = async () => {
        setLoading(true);
        await onUpdateEmployee(employee.id, { password: newPass });
        setLoading(false);
        setIsEditingPass(false);
    };

    const handleSaveTitle = async () => {
        setLoading(true);
        await onUpdateEmployee(employee.id, { title: newTitle });
        setLoading(false);
        setIsEditingTitle(false);
    };

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        await onUpdateEmployee(employee.id, { fullName: newName });
        setLoading(false);
        setIsEditingName(false);
    };

    const handleSaveRate = async () => {
        if (!newRate || isNaN(parseFloat(newRate))) return;
        setLoading(true);
        await onUpdateEmployee(employee.id, { hourlyRate: newRate });
        setLoading(false);
        setIsEditingRate(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-black-100 rounded-full flex items-center justify-center text-black-600 font-bold text-xl flex-none mt-1">
                            {employee.fullName.charAt(0)}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                            
                            {/* Editable Name */}
                            <div className="min-h-[28px] flex items-center">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <Input 
                                            value={newName} 
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="h-8 text-lg font-semibold px-2"
                                            autoFocus
                                        />
                                        <Button 
                                            size="sm" 
                                            className="h-8 w-8 p-0 bg-black-600 hover:bg-black-700 text-white" 
                                            onClick={handleSaveName} 
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 text-muted-foreground" 
                                            onClick={() => { setIsEditingName(false); setNewName(employee.fullName); }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <DialogTitle 
                                        className="text-xl hover:bg-slate-100 hover:text-black-700 cursor-pointer rounded px-1 -ml-1 transition-colors decoration-slate-300 hover:underline decoration-dashed underline-offset-4"
                                        onClick={() => setIsEditingName(true)}
                                        title="Click to edit name"
                                    >
                                        {employee.fullName}
                                    </DialogTitle>
                                )}
                            </div>
                            
                            {/* Editable Title */}
                            <div className="flex items-center h-7">
                                {isEditingTitle ? (
                                    <div className="flex items-center gap-2">
                                        <Select value={newTitle} onValueChange={setNewTitle}>
                                            <SelectTrigger className="h-7 w-[140px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cashier">{translate("employees.roleCashier", "Cashier")}</SelectItem>
                                                <SelectItem value="Manager">{translate("employees.roleManager", "Manager")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button 
                                            size="sm" 
                                            className="h-7 w-7 p-0 bg-black-600 hover:bg-black-700 text-white" 
                                            onClick={handleSaveTitle} 
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-7 w-7 p-0 text-muted-foreground" 
                                            onClick={() => { setIsEditingTitle(false); setNewTitle(employee.title); }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <DialogDescription 
                                        className="text-sm cursor-pointer hover:bg-slate-100 hover:text-black-600 rounded px-1 -ml-1 transition-colors inline-flex items-center gap-2"
                                        onClick={() => setIsEditingTitle(true)}
                                        title="Click to change role"
                                    >
                                        {employee.title}
                                        <Pencil className="h-3 w-3 opacity-30" />
                                    </DialogDescription>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="pt-4 space-y-4">
                    {/* Public Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                                <Tag className="h-3 w-3" /> {translate("employees.employeeId")}
                            </span>
                            <div className="font-mono">#{employee.id}</div>
                        </div>

                        {/* Editable Hourly Rate */}
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> {translate("employees.hourlyRate")}
                            </span>
                            <div className="h-8 flex items-center">
                                {isEditingRate ? (
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number"
                                            step="0.01"
                                            value={newRate} 
                                            onChange={(e) => setNewRate(e.target.value)}
                                            className="h-7 w-24 px-2 text-sm"
                                            autoFocus
                                        />
                                        <Button 
                                            size="sm" 
                                            className="h-7 w-7 p-0 bg-black-600 hover:bg-black-700 text-white" 
                                            onClick={handleSaveRate} 
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-7 w-7 p-0 text-muted-foreground" 
                                            onClick={() => { setIsEditingRate(false); setNewRate(employee.hourlyRate); }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div 
                                        className="font-semibold text-black-600 cursor-pointer hover:bg-slate-100 rounded px-1 -ml-1 transition-colors flex items-center gap-2"
                                        onClick={() => setIsEditingRate(true)}
                                        title="Click to edit rate"
                                    >
                                        {formatCurrency(employee.hourlyRate)}
                                        <Pencil className="h-3 w-3 opacity-30 text-black" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1 col-span-2">
                             <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {translate("employees.dateHired")}
                            </span>
                            <div>{formatDate(employee.hireDate)}</div>
                        </div>
                    </div>

                    <div className="border-t my-2"></div>

                    {/* Credentials Section */}
                    <div className="space-y-3 bg-slate-50 p-3 rounded-md border">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">{translate("employees.credentialsTitle")}</h4>
                        
                        {/* Email Field */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {translate("employees.emailLoginLabel")}
                            </Label>
                            <Input 
                                readOnly 
                                value={employee.email || "No email generated"} 
                                className="bg-muted border-transparent shadow-none focus-visible:ring-0 pointer-events-none text-muted-foreground" 
                                tabIndex={-1}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="h-3 w-3" /> {translate("employees.passwordLabel")}
                            </Label>
                            <div className="flex gap-2">
                                <Input 
                                    readOnly={!isEditingPass} 
                                    value={isEditingPass ? newPass : (employee.password || "********")} 
                                    onChange={(e) => setNewPass(e.target.value)}
                                    type={isEditingPass ? "text" : "password"}
                                    tabIndex={isEditingPass ? 0 : -1}
                                    className={
                                        isEditingPass 
                                        ? "bg-white border-black-400" 
                                        : "bg-muted border-transparent shadow-none focus-visible:ring-0 text-muted-foreground pointer-events-none select-none"
                                    }
                                />
                                {isEditingPass ? (
                                    <Button size="sm" onClick={handleSavePass} disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => setIsEditingPass(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {translate("employees.close")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page Component ---

export default function EmployeesPage() {
  const { t: translate } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal States
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Credentials State
  const [newCredentials, setNewCredentials] = useState<{email: string, password: string} | null>(null);

  // Delete State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Search States
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form State
  const [formData, setFormData] = useState({
    employee_name: "",
    job_title: "Cashier", 
    hourly_rate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = `/api/employees?limit=${PAGE_SIZE}`;
        const data = await fetchApi<NewApiEmployee[]>(endpoint);
        const normalized = (data ?? []).map(normalizeEmployee);
        setEmployees(normalized);
      } catch (e: any) {
        console.error("Load error:", e);
        setError(e?.message ?? "Unable to load data");
        toast.error(translate("employees.failedToLoad"));
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter Logic
  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearSearch = () => {
    setSearchTerm("");
  };
  
  // --- Handlers ---

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.employee_name || !formData.job_title || !formData.hourly_rate) {
        toast.error("Please fill in all fields");
        setIsSubmitting(false);
        return;
    }

    try {
        const result = await fetchApi<NewApiEmployee>('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_name: formData.employee_name,
                job_title: formData.job_title,
                hourly_rate: parseFloat(formData.hourly_rate)
            })
        });

        setIsAddModalOpen(false);
        
        const email = result.email || "generated@boba.com"; 
        const password = result.password || "password123";

        setNewCredentials({ email, password });
        setFormData({ employee_name: "", job_title: "Cashier", hourly_rate: "" });
        loadEmployees();
        toast.success(translate("employees.createSuccess"));

    } catch (err: any) {
        console.error(err);
        toast.error(err.message || translate("employees.createError"));
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (id: number, data: Partial<Employee>) => {
      const payload: any = {};
      
      if (data.password) payload.password = data.password;
      if (data.title) payload.job_title = data.title; 
      if (data.fullName) payload.employee_name = data.fullName;
      if (data.hourlyRate) payload.hourly_rate = parseFloat(data.hourlyRate);

      try {
          await fetchApi(`/api/employees/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          toast.success(translate("employees.updateSuccess", "Info updated"));
          
          setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
          
          if(selectedEmployee && selectedEmployee.id === id) {
              setSelectedEmployee(prev => prev ? { ...prev, ...data } : null);
          }
      } catch (e: any) {
          console.error(e);
          toast.error(translate("employees.updateError"));
      }
  };

  const confirmDelete = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
        await fetchApi<null>(`/api/employees/${employeeToDelete.id}`, { method: 'DELETE' });
        toast.success(translate("employees.deleteSuccess", { name: employeeToDelete.fullName }));
        
        loadEmployees();
        setDeleteOpen(false);
        setEmployeeToDelete(null);
    } catch (e: any) {
        console.error("Delete error:", e);
        toast.error(e?.message ?? translate("employees.deleteError"));
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
      
      {/* Header Section */}
      <div className="border-b bg-white flex-none">
        <div className="flex h-16 items-center px-6 justify-between gap-4">
          <div className="flex items-center gap-2 min-w-fit">
            <Users className="h-5 w-5" />
            <h1 className="text-2xl font-bold hidden md:block">{translate("employees.title")}</h1>
            <h1 className="text-xl font-bold md:hidden">{translate("employees.titleShort")}</h1>
          </div>

          <div className="flex-1 max-w-lg flex items-center gap-2 ml-auto">
            <div className="relative flex-1">
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
            </div>

            <Button 
                onClick={() => setIsAddModalOpen(true)} 
                className="bg-black text-white ml-2 whitespace-nowrap"
            >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{translate("employees.addEmployee")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - LIST VIEW */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        {loading && employees.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {translate("employees.loading")}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => loadEmployees()}>
              {translate("employees.retry")}
            </Button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Users className="h-10 w-10 opacity-20" />
            <p>
              {searchTerm
                ? translate("employees.noResults", { term: searchTerm })
                : translate("employees.noData")}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto pb-6">
            {filteredEmployees.map((e) => (
              <Card key={e.id} className="overflow-hidden flex-none hover:shadow-md transition-shadow">
                <CardHeader className="p-4 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setSelectedEmployee(e)}>
                      <div className="w-12 h-12 bg-black-100 rounded-full flex items-center justify-center text-black-600 font-bold text-lg flex-none">
                        {e.fullName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold hover:text-black-600 transition-colors">
                            {e.fullName}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          {e.title}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <Badge className="bg-black-100 text-black-700 hover:bg-black-200 mr-2 border-black-200 text-sm py-1 px-3">
                        ID: {e.id}
                      </Badge>
                      
                      <Button
                          variant="default"
                          size="sm"
                          onClick={() => setSelectedEmployee(e)}
                          className="bg-black transition-colors gap-2"
                      >
                          <Eye className="h-4 w-4" />
                          {translate("employees.viewDetails")}
                      </Button>

                      <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(e)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                          title="Delete"
                      >
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onUpdateEmployee={handleUpdateEmployee}
          translate={translate}
        />
      )}

      {/* --- ADD EMPLOYEE MODAL --- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{translate("employees.addDialogTitle")}</DialogTitle>
                <DialogDescription>
                    {translate("employees.addDialogDesc")}
                </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateEmployee} className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">{translate("employees.nameLabel")}</Label>
                    <Input
                        id="name"
                        value={formData.employee_name}
                        onChange={(e: any) => setFormData({...formData, employee_name: e.target.value})}
                        className="col-span-3"
                        placeholder={translate("employees.namePlaceholder")}
                        required
                    />
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="job">{translate("employees.jobTitleLabel")}</Label>
                    <Select 
                        value={formData.job_title} 
                        onValueChange={(val) => setFormData({...formData, job_title: val})}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={translate("employees.jobTitlePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Cashier">
                                {translate("employees.roleCashier", "Cashier")}
                            </SelectItem>
                            <SelectItem value="Manager">
                                {translate("employees.roleManager", "Manager")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="rate">{translate("employees.rateLabel")}</Label>
                    <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e: any) => setFormData({...formData, hourly_rate: e.target.value})}
                        className="col-span-3"
                        placeholder={translate("employees.ratePlaceholder")}
                        required
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                        {translate("employees.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {translate("employees.createButton")}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* --- CREDENTIALS SUCCESS MODAL --- */}
      <Dialog open={!!newCredentials} onOpenChange={() => setNewCredentials(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-2 text-black-600 mb-2">
                    <Check className="h-6 w-6" />
                    <DialogTitle>{translate("employees.successDialogTitle")}</DialogTitle>
                </div>
                <DialogDescription>
                    {translate("employees.successDialogDescUpdated")}
                </DialogDescription>
            </DialogHeader>
            
            {newCredentials && (
                <div className="bg-slate-100 p-4 rounded-md space-y-3 border">
                    <div>
                        <span className="text-xs uppercase text-slate-500 font-bold">
                            {translate("employees.emailLoginLabel")}
                        </span>
                        <div className="font-mono text-lg font-semibold select-all text-slate-800">
                            {newCredentials.email}
                        </div>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                        <span className="text-xs uppercase text-slate-500 font-bold">
                            {translate("employees.tempPasswordLabel")}
                        </span>
                        <div className="font-mono text-lg font-semibold select-all text-slate-800">
                            {newCredentials.password}
                        </div>
                    </div>
                </div>
            )}

            <DialogFooter className="sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => setNewCredentials(null)}>
                    {translate("employees.close")}
                </Button>
                <Button type="button" onClick={copyToClipboard} className="gap-2">
                    <Copy className="h-4 w-4" />
                    {translate("employees.copyCredentials")}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
                {translate("employees.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
                {translate("employees.deleteConfirmDescWithArg", { 
                    name: employeeToDelete?.fullName 
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
                {translate("employees.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                {translate("employees.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}