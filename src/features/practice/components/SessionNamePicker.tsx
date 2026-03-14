"use client";

import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Rose-gold pill style: border and subtle fill matching boutique palette. */
const pillClass =
  "rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-colors " +
  "border-[hsl(346,77%,50%)]/50 bg-[hsl(346,77%,50%)]/8 hover:bg-[hsl(346,77%,50%)]/18 " +
  "text-foreground hover:border-[hsl(346,77%,50%)]/70";

export interface SessionNamePickerProps {
  names: string[];
  onSelect: (name: string) => void;
  onRoll: () => void;
  rolling?: boolean;
  className?: string;
}

export function SessionNamePicker({
  names,
  onSelect,
  onRoll,
  rolling = false,
  className,
}: SessionNamePickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("space-y-4", className)}
    >
      <p className="text-sm text-muted-foreground">
        Name this session — pick one or roll for new suggestions.
      </p>
      <div className="flex flex-wrap gap-3">
        {names.map((name, i) => (
          <motion.button
            key={`${name}-${i}`}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(pillClass, "cursor-pointer")}
            onClick={() => onSelect(name)}
            disabled={rolling}
          >
            {name}
          </motion.button>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: names.length * 0.05 }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[hsl(346,77%,50%)]/40 bg-[hsl(346,77%,50%)]/5 hover:bg-[hsl(346,77%,50%)]/15 text-foreground"
            onClick={onRoll}
            disabled={rolling}
          >
            <Dices className="mr-1.5 h-4 w-4" />
            Roll the Dice
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
