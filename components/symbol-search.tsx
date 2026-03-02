"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface SymbolSearchProps {
  /** Currently selected symbols (normalised, e.g. ["BTCUSDT"]) */
  selected: string[];
  /** Called when the selection changes */
  onSelectionChange: (symbols: string[]) => void;
  /** Max selectable symbols */
  maxSelections?: number;
}

export function SymbolSearch({
  selected,
  onSelectionChange,
  maxSelections = 20,
}: SymbolSearchProps) {
  const [open, setOpen] = useState(false);
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSymbols = useCallback(async () => {
    if (symbols.length > 0) return; // already loaded
    setLoading(true);
    try {
      const res = await fetch("/api/symbols");
      if (res.ok) {
        const data = await res.json();
        setSymbols(data.symbols || []);
      }
    } catch (err) {
      console.error("Failed to fetch symbols:", err);
    } finally {
      setLoading(false);
    }
  }, [symbols.length]);

  // Fetch on first open
  useEffect(() => {
    if (open) fetchSymbols();
  }, [open, fetchSymbols]);

  const toggle = (symbol: string) => {
    if (selected.includes(symbol)) {
      onSelectionChange(selected.filter((s) => s !== symbol));
    } else if (selected.length < maxSelections) {
      onSelectionChange([...selected, symbol]);
    }
  };

  const remove = (symbol: string) => {
    onSelectionChange(selected.filter((s) => s !== symbol));
  };

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((sym) => {
            const info = symbols.find((s) => s.symbol === sym);
            return (
              <span
                key={sym}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground"
              >
                {info?.baseAsset || sym.replace(/USDT$/, "")}
                <button
                  onClick={() => remove(sym)}
                  className="ml-0.5 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-sm font-normal"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="w-3.5 h-3.5" />
              Search symbols… ({selected.length} selected)
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search coin (BTC, ETH, SOL...)" />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading symbols…" : "No symbol found."}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {symbols.map((s) => {
                  const isSelected = selected.includes(s.symbol);
                  return (
                    <CommandItem
                      key={s.symbol}
                      value={`${s.baseAsset} ${s.symbol}`}
                      onSelect={() => toggle(s.symbol)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="font-medium">{s.baseAsset}</span>
                      <span className="ml-1 text-muted-foreground text-xs">
                        / {s.quoteAsset}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-muted-foreground">
        {selected.length}/{maxSelections} symbols selected. Search from{" "}
        {symbols.length > 0
          ? `${symbols.length} available pairs`
          : "Binance exchange"}
        .
      </p>
    </div>
  );
}
