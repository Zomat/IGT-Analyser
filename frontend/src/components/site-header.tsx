"use client";

import { Button } from "@/components/ui/button";
import { BrainCircuit, Repeat } from "lucide-react";
import Link from "next/link";

interface SiteHeaderProps {
  variant: "home" | "game";
  onReset?: () => void;
}

export function SiteHeader({ variant, onReset }: SiteHeaderProps) {
  if (variant === "game" && !onReset) {
    console.warn(
      "SiteHeader: Wariant 'game' został użyty bez przekazania funkcji 'onReset'."
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg [font-family:var(--font-heading)]">
            IGT Analyser
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/about">O Projekcie</Link>
          </Button>

          {variant === "home" && (
            <Button asChild>
              <Link href="/game">Rozpocznij Badanie</Link>
            </Button>
          )}

          {variant === "game" && (
            <Button variant="ghost" onClick={onReset}>
              <Repeat className="mr-2 h-4 w-4" />
              Zresetuj Badanie
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
