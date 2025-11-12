"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header"; // Zaimportuj swój uniwersalny nagłówek

// --- Typy Danych (muszą pasować do API) ---
type DeckId = "A" | "B" | "C" | "D";

type LastMove = {
  deck: DeckId;
  gain: number;
  loss: number;
  net: number;
};

// Typ odpowiedzi, której spodziewamy się od API
type GameStateResponse = {
  session_id: string;
  score: number;
  turn: number;
  last_move: LastMove | null;
  is_game_ended: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Komponent Główny ---
export default function GamePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState(2000);
  const [turn, setTurn] = useState(0);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChoosing, setIsChoosing] = useState(false);

  const startNewGame = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/game/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Nie można uruchomić gry");
      const data: GameStateResponse = await response.json();

      setSessionId(data.session_id);
      setScore(data.score);
      setTurn(data.turn);
      setLastMove(data.last_move);
      setIsGameEnded(data.is_game_ended);
    } catch (error) {
      console.error("Błąd podczas startu gry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handleDeckClick = async (deckId: DeckId) => {
    if (isGameEnded || !sessionId || isChoosing) return;

    setIsChoosing(true);
    try {
      const response = await fetch(`${API_URL}/game/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, deck_id: deckId }),
      });
      if (!response.ok) throw new Error("Błąd podczas wyboru talii");
      const data: GameStateResponse = await response.json();

      setScore(data.score);
      setTurn(data.turn);
      setLastMove(data.last_move);
      setIsGameEnded(data.is_game_ended);
    } catch (error) {
      console.error("Błąd wyboru talii:", error);
    } finally {
      setIsChoosing(false);
    }
  };

  const handleReset = () => {
    startNewGame();
  };

  const progressPercent = (turn / 100) * 100;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-muted/40">
        <SiteHeader variant="game" onReset={handleReset} />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Ładowanie gry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen bg-muted/40`}>
      <SiteHeader variant="game" onReset={handleReset} />

      <main className="flex-grow container mx-auto max-w-screen-xl p-4 md:p-6">
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle>Postęp Badania (Tura {turn} z 100)</CardTitle>
            <CardDescription>
              Twoim celem jest maksymalizacja wyniku poprzez serię 100 wyborów.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="w-full" />
            {isGameEnded && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-md text-center">
                <h3 className="font-bold text-lg text-primary">
                  Badanie Zakończone!
                </h3>
                <p className="text-muted-foreground">
                  Twój końcowy wynik to ${score.toLocaleString()}. Kliknij
                  "Zresetuj Badanie", aby spróbować ponownie.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle
                  className={`[font-family:var(--font-heading)] text-3xl tracking-wide`}
                >
                  Strefa Decyzji
                </CardTitle>
                <CardDescription>Wybierz jedną z talii.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DeckButton
                  deckId="A"
                  onClick={handleDeckClick}
                  disabled={isGameEnded || isChoosing}
                />
                <DeckButton
                  deckId="B"
                  onClick={handleDeckClick}
                  disabled={isGameEnded || isChoosing}
                />
                <DeckButton
                  deckId="C"
                  onClick={handleDeckClick}
                  disabled={isGameEnded || isChoosing}
                />
                <DeckButton
                  deckId="D"
                  onClick={handleDeckClick}
                  disabled={isGameEnded || isChoosing}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Całkowity Wynik
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${score.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Kapitał początkowy: $2,000
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ostatni Ruch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!lastMove ? (
                  <p className="text-sm text-muted-foreground italic">
                    Oczekiwanie na pierwszą decyzję...
                  </p>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Wybrano Talię
                      </span>
                      <p
                        className={`text-2xl font-bold [font-family:var(--font-heading)]`}
                      >
                        Talia {lastMove.deck}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">Zysk:</span>
                      <span className="text-sm font-bold text-green-600">
                        +${lastMove.gain}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">Kara:</span>
                      <span
                        className={`text-sm font-bold ${
                          lastMove.loss < 0
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        ${lastMove.loss}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 border-t">
                      <span className="text-sm font-medium">Wynik Netto:</span>
                      <span
                        className={`text-lg font-bold ${
                          lastMove.net >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {lastMove.net >= 0 ? "+" : ""}${lastMove.net}
                        {lastMove.net >= 0 ? (
                          <TrendingUp className="inline-block h-4 w-4 ml-1" />
                        ) : (
                          <TrendingDown className="inline-block h-4 w-4 ml-1" />
                        )}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function DeckButton({
  deckId,
  onClick,
  disabled,
}: {
  deckId: DeckId;
  onClick: (deckId: DeckId) => void;
  disabled: boolean;
}) {
  return (
    <Button
      variant="outline"
      className="h-48 md:h-64 w-full flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-shadow focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => onClick(deckId)}
      disabled={disabled}
    >
      <span className="text-sm text-muted-foreground">Talia</span>
      <span
        className={`text-6xl md:text-8xl [font-family:var(--font-heading)] text-primary`}
      >
        {deckId}
      </span>
    </Button>
  );
}
