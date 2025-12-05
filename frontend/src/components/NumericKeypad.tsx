import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
}

export function NumericKeypad({ onKeyPress, onDelete }: NumericKeypadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mx-auto mt-4">
      {keys.map((key) => (
        <Button
          key={key}
          variant="outline"
          className="h-14 text-2xl font-semibold"
          onClick={() => onKeyPress(key)}
        >
          {key}
        </Button>
      ))}
      <div className="col-span-1"></div> {/* Spacer */}
      <Button
        variant="outline"
        className="h-14 text-2xl font-semibold"
        onClick={() => onKeyPress('0')}
      >
        0
      </Button>
      <Button
        variant="ghost"
        className="h-14 text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={onDelete}
      >
        <Delete className="h-6 w-6" />
      </Button>
    </div>
  );
}
