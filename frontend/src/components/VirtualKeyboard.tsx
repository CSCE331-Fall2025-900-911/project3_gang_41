import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
}

export function VirtualKeyboard({ onKeyPress, onDelete }: VirtualKeyboardProps) {
  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ['@', '.', '-', '_', '.com']
  ];

  const commonDomains = ['@gmail.com', '@yahoo.com'];

  const keyBaseClass = `
    transition-all duration-150 ease-out 
    shadow-sm border border-slate-300 dark:border-slate-600
    hover:-translate-y-1 hover:shadow-md hover:border-primary hover:bg-accent
    active:translate-y-0 active:shadow-none active:scale-95 active:bg-primary/10
  `;

  return (
    <div className="w-full flex flex-col gap-1.5 select-none animate-in fade-in slide-in-from-bottom-4 duration-300 p-1">
      {/* Number Row */}
      <div className="flex justify-center gap-1.5">
        {rows[0].map((key) => (
          <Button 
            key={key} 
            variant="secondary" 
            className={cn("h-10 w-8 p-0 sm:w-10 text-lg font-medium", keyBaseClass)} 
            onClick={() => onKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </Button>
        ))}
      </div>
      
      {/* QWERTY Row */}
      <div className="flex justify-center gap-1.5">
        {rows[1].map((key) => (
          <Button 
            key={key} 
            variant="secondary" 
            className={cn("h-12 w-8 p-0 sm:w-10 text-xl font-bold uppercase", keyBaseClass)} 
            onClick={() => onKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* ASDF Row */}
      <div className="flex justify-center gap-1.5">
        {rows[2].map((key) => (
          <Button 
            key={key} 
            variant="secondary" 
            className={cn("h-12 w-8 p-0 sm:w-10 text-xl font-bold uppercase", keyBaseClass)} 
            onClick={() => onKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* ZXCV Row */}
      <div className="flex justify-center gap-1.5">
        {rows[3].map((key) => (
          <Button 
            key={key} 
            variant="secondary" 
            className={cn("h-12 w-8 p-0 sm:w-10 text-xl font-bold uppercase", keyBaseClass)} 
            onClick={() => onKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </Button>
        ))}
         <Button 
            variant="destructive" 
            className={cn(
                "h-12 w-12 p-0 sm:w-14", 
                keyBaseClass,
                "text-red-600 hover:bg-red-50 hover:border-red-300 bg-background"
            )} 
            onClick={onDelete}
            onMouseDown={(e) => e.preventDefault()}
         >
            <Delete className="h-6 w-6" />
        </Button>
      </div>

      {/* Symbols Row */}
      <div className="flex justify-center gap-1.5 mt-1">
         {rows[4].map((key) => (
          <Button 
            key={key} 
            variant="outline" 
            className={cn("h-10 px-2 sm:px-4 text-sm font-bold bg-muted/30", keyBaseClass)} 
            onClick={() => onKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </Button>
        ))}
        {/* Shortcuts */}
        {commonDomains.map(domain => (
            <Button 
                key={domain} 
                variant="outline" 
                className={cn("h-10 px-3 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-400", keyBaseClass)} 
                onClick={() => onKeyPress(domain)}
                onMouseDown={(e) => e.preventDefault()}
            >
                {domain}
            </Button>
        ))}
      </div>
    </div>
  );
}