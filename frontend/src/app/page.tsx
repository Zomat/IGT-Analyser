import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  Goal,
  TrendingUp,
  BrainCircuit,
  ArrowRight,
  Database,
  BarChartHorizontal,
} from "lucide-react";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

function AbstractDataVisual() {
  return (
    <div className="relative flex h-full min-h-[300px] w-full items-center justify-center">
      <div className="absolute inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px]"></div>
      <div className="relative flex items-center justify-center gap-4">
        <div className="flex flex-col gap-4">
          <Card
            className="animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
            style={{ animationDelay: "0.4s" }}
          >
            <CardContent className="flex items-center justify-center p-6 py-0">
              <Database className="h-8 w-8 text-primary animate-pulse" />
            </CardContent>
          </Card>
          <Card
            className="animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
            style={{ animationDelay: "0.6s" }}
          >
            <CardContent className="flex items-center justify-center p-6 py-0">
              <BarChartHorizontal className="h-8 w-8 text-primary/70 animate-[pulse_1.8s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            </CardContent>
          </Card>
        </div>

        <ArrowRight
          className="h-10 w-10 flex-shrink-0 animate-in fade-in-0 duration-800 ease-out fill-mode-forwards text-muted-foreground"
          style={{ animationDelay: "0.8s" }}
        />

        <Card
          className="animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
          style={{ animationDelay: "1s" }}
        >
          <CardContent className="flex items-center justify-center p-6 py-0">
            <BrainCircuit className="h-12 w-12 text-primary animate-[pulse_2.2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <div
        className={`flex flex-col min-h-screen bg-background text-foreground
                   bg-[radial-gradient(ellipse_at_top_center,_var(--muted)/0.15,_transparent_60%)]`}
      >
        <SiteHeader variant="home" />

        <main className="flex-grow">
          <section className="container mx-auto px-4 md:px-6 pt-24 pb-16 md:pt-32 md:pb-24">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className="flex flex-col items-start text-left">
                <Badge
                  variant="outline"
                  className="mb-4 border-primary/50 text-primary animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
                  style={{ animationDelay: "0.1s" }}
                >
                  PROJEKT BADAWCZY
                </Badge>

                <h1
                  className={`text-4xl md:text-6xl font-bold tracking-tighter mb-6 max-w-2xl [font-family:var(--font-heading)] animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards`}
                  style={{ animationDelay: "0.2s" }}
                >
                  Iowa Gambling Task
                  <p className="text-3xl tracking-normal mt-2">
                    Zrozumienie Decyzji w Warunkach Niepewności
                  </p>
                </h1>

                <p
                  className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
                  style={{ animationDelay: "0.3s" }}
                >
                  Ta symulacja bada, jak balansujesz między natychmiastową
                  gratyfikacją a długoterminowym zyskiem. Analizuje Twoją
                  zdolność do adaptacji strategii w oparciu o niejednoznaczną
                  informację zwrotną i rozwój intuicyjnego rozumienia.
                </p>

                <div
                  className="flex flex-wrap gap-4 animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
                  style={{ animationDelay: "0.4s" }}
                >
                  <Button
                    size="lg"
                    className="text-lg px-10 py-7 shadow-lg hover:shadow-primary/30 transition-shadow duration-300"
                    asChild
                  >
                    <Link href="/game">
                      Rozpocznij Badanie
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-lg px-10 py-7"
                    asChild
                  >
                    <Link href="/about">Dowiedz się więcej</Link>
                  </Button>
                </div>
              </div>

              <div className="hidden lg:flex">
                <AbstractDataVisual />
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 md:px-6 py-16 border-t">
            <h1
              className={`text-3xl md:text-4xl font-bold text-center mb-12 [font-family:var(--font-heading)] animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards`}
            >
              Struktura Badania
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="border-border/60 hover:shadow-lg transition-shadow duration-300 animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
                style={{ animationDelay: "0.2s" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cel Główny
                  </CardTitle>
                  <Goal className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold mb-2 [font-family:var(--font-heading)]`}
                  >
                    Maksymalizuj Zysk
                  </div>
                  <CardDescription>
                    Twoim celem jest zarobienie jak najwięcej wirtualnych
                    pieniędzy poprzez dokonywanie serii wyborów.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className="border-border/60 hover:shadow-lg transition-shadow duration-300 animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
                style={{ animationDelay: "0.3s" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Mechanika
                  </CardTitle>
                  <Brain className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold mb-2 [font-family:var(--font-heading)]`}
                  >
                    Ufaj Intuicji
                  </div>
                  <CardDescription>
                    Wybieraj karty z czterech dostępnych talii. Każdy wybór
                    wpłynie na Twój końcowy wynik.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className="border-border/60 hover:shadow-lg transition-shadow duration-300 md:col-span-2 lg:col-span-1 animate-in fade-in-0 slide-in-from-bottom-5 duration-600 ease-out fill-mode-forwards"
                style={{ animationDelay: "0.4s" }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Klucz do Sukcesu
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold mb-2 [font-family:var(--font-heading)]`}
                  >
                    Adaptuj Strategię
                  </div>
                  <CardDescription>
                    Obserwuj rezultaty swoich decyzji i dostosowuj strategię w
                    trakcie gry. Skup się na długoterminowym trendzie.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        <footer className="container mx-auto px-4 md:px-6 py-8 mt-16 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} IGT Analyser.
            </p>
            <p className="text-sm text-muted-foreground">
              Projekt i realizacja: Mateusz Zolisz
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
