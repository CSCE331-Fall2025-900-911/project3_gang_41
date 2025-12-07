import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
}

export function NumericKeypad({ onKeyPress, onDelete }: NumericKeypadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Structural styles
  const baseKeyClass = `
    h-16 text-3xl font-bold transition-all duration-150 ease-out 
    shadow-sm border border-slate-300 dark:border-slate-600
    hover:-translate-y-1 hover:shadow-lg hover:border-primary/50
    active:translate-y-0 active:shadow-none active:scale-95
  `;

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-[340px] mx-auto mt-2 p-2 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {keys.map((key) => (
        <Button
          key={key}
          variant="secondary" // Gray background
          className={cn(baseKeyClass)}
          onClick={() => onKeyPress(key)}
          onMouseDown={(e) => e.preventDefault()} // Keeps focus on the input field
        >
          {key}
        </Button>
      ))}
      
      {/* Spacer */}
      <div className="col-span-1"></div> 
      
      <Button
        variant="secondary" // Gray background
        className={cn(baseKeyClass)}
        onClick={() => onKeyPress('0')}
        onMouseDown={(e) => e.preventDefault()}
      >
        0
      </Button>
      
      <Button
        variant="outline" // White background
        className={cn(
            baseKeyClass, 
            "text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 bg-background"
        )}
        onClick={onDelete}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Delete className="h-8 w-8" />
      </Button>
    </div>
  );
}