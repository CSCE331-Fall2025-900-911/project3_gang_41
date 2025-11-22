import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, ReceiptText } from "lucide-react";

export default function EmployeesPage() {
    return (
        <h1 className="text-3xl font-bold">employees page here</h1>
    );
}