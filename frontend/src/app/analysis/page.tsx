"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Scatter,
  ScatterChart,
} from "recharts";
import {
  Loader2,
  UserSearch,
  Bot,
  Filter,
  Activity,
  User,
  Cpu,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";

// --- Typy Danych ---
type TrialData = {
  trial: number;
  deck: "A" | "B" | "C" | "D";
  win: number;
  loss: number;
  net: number;
  total_score: number;
  deck_numeric?: number;
  source?: "human" | "ai" | "match";
  // Pola dodawane przy mapowaniu
  x?: number;
  y?: number;
  deck_label?: string;
};

type SimilarityMetrics = {
  exact_match_ratio: number;
  good_bad_match_ratio: number;
  capital_rmse: number;
  human_entropy: number;
  ai_entropy: number;
  cumulative_regret: number;
  wsls_ratio: number;
};

type ComparisonResponse = {
  subject_data: {
    subject_index: number;
    source_study: string;
    history: TrialData[];
  };
  mpc_data: TrialData[];
  metrics: SimilarityMetrics;
};

type SubjectListElement = {
  index: number;
  source_study: string;
  total_trials: number;
};

type AnalysisResponse = {
  total_subjects: number;
  subjects_list: SubjectListElement[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getGroupName = (source: string) => {
  if (source.startsWith("Study")) return `Standard IGT (${source})`;
  if (source.includes("Cannabis")) return "Cannabis Users (Marihuana)";
  if (source === "csv_import") return "Import CSV";
  return "Inne";
};

export default function AnalysisPage() {
  const [subjectsList, setSubjectsList] = useState<SubjectListElement[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const [comparisonData, setComparisonData] =
    useState<ComparisonResponse | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch(`${API_URL}/analysis/subjects`);
        if (res.ok) {
          const data: AnalysisResponse = await res.json();
          setSubjectsList(data.subjects_list);
          if (data.subjects_list.length > 0) {
            const firstGroup = getGroupName(data.subjects_list[0].source_study);
            setSelectedGroup(firstGroup);
            setSelectedSubjectId(data.subjects_list[0].index.toString());
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) return;
    const fetchData = async () => {
      setIsLoadingDetails(true);
      try {
        const res = await fetch(
          `${API_URL}/analysis/compare/${selectedSubjectId}`
        );
        if (res.ok) {
          const data: ComparisonResponse = await res.json();

          // Mapowanie danych z dodaniem x i y dla wygody Recharts
          const mapTrial = (t: TrialData, src: "human" | "ai") => ({
            ...t,
            x: t.trial,
            y: t.deck === "A" ? 4 : t.deck === "B" ? 3 : t.deck === "C" ? 2 : 1,
            deck_label: t.deck,
            source: src,
          });

          data.subject_data.history = data.subject_data.history.map((t) =>
            mapTrial(t, "human")
          );
          data.mpc_data = data.mpc_data.map((t) => mapTrial(t, "ai"));

          setComparisonData(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchData();
  }, [selectedSubjectId]);

  const availableGroups = useMemo(() => {
    const groups = new Set(
      subjectsList.map((s) => getGroupName(s.source_study))
    );
    return Array.from(groups).sort();
  }, [subjectsList]);

  const filteredSubjects = useMemo(() => {
    return subjectsList.filter(
      (s) => getGroupName(s.source_study) === selectedGroup
    );
  }, [subjectsList, selectedGroup]);

  const formatDeckAxis = (val: number) => {
    if (val === 4) return "A";
    if (val === 3) return "B";
    if (val === 2) return "C";
    if (val === 1) return "D";
    return "";
  };

  const chartData = comparisonData
    ? comparisonData.subject_data.history.map((h, i) => ({
        trial: h.trial,
        human_score: h.total_score,
        ai_score: comparisonData.mpc_data[i]?.total_score,
      }))
    : [];

  const scatterData = comparisonData
    ? [
        ...comparisonData.subject_data.history.map((h) => ({
          ...h,
          type: "Człowiek",
        })),
        ...(showAI
          ? comparisonData.mpc_data.map((h) => ({ ...h, type: "AI (MPC)" }))
          : []),
      ]
    : [];

  const matchesData =
    comparisonData && showAI
      ? comparisonData.subject_data.history
          .map((h, i) => {
            const aiMove = comparisonData.mpc_data[i];
            if (aiMove && h.deck === aiMove.deck) {
              return {
                ...h,
                x: h.trial,
                y:
                  h.deck === "A"
                    ? 4
                    : h.deck === "B"
                    ? 3
                    : h.deck === "C"
                    ? 2
                    : 1,
                deck_label: h.deck,
                source: "match",
              };
            }
            return null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];

  if (isLoadingList) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Ładowanie bazy danych...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <SiteHeader variant="analysis" />
      <main className="container mx-auto max-w-screen-xl p-4 md:p-8 space-y-6">
        {/* Panel Sterowania */}
        <div className="bg-background p-4 rounded-xl border shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <UserSearch className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-xl">Inspektor Badanych</h1>
              </div>
              <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-lg border w-fit">
                <Switch
                  id="ai-mode"
                  checked={showAI}
                  onCheckedChange={setShowAI}
                />
                <Label
                  htmlFor="ai-mode"
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Bot className="h-4 w-4 text-purple-600" />
                  Porównaj z modelem MPC
                </Label>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground ml-1">
                  Kategoria Badania
                </Label>
                <Select
                  value={selectedGroup}
                  onValueChange={(val) => {
                    setSelectedGroup(val);
                    const firstInGroup = subjectsList.find(
                      (s) => getGroupName(s.source_study) === val
                    );
                    if (firstInGroup)
                      setSelectedSubjectId(firstInGroup.index.toString());
                  }}
                >
                  <SelectTrigger className="w-full md:w-[240px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Wybierz grupę" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground ml-1">
                  Konkretny Uczestnik
                </Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                >
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Wybierz osobę..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredSubjects.map((s) => (
                      <SelectItem key={s.index} value={s.index.toString()}>
                        Badany #{s.index + 1}
                        {s.source_study.includes("Cannabis")
                          ? ` (ID: ${s.source_study.replace(
                              "Cannabis User ",
                              ""
                            )})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Zawartość główna */}
        {isLoadingDetails ? (
          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-2" />
            <p>Analizowanie trajektorii...</p>
          </div>
        ) : (
          comparisonData && (
            <div className="space-y-6">
              SEKCJA METRYK
              {showAI && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <h1>Tutaj beda metryki ....</h1>
                  {/* Kafelki metryk (bez zmian)
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Zgodność Strategii
                          <Activity className="h-4 w-4 text-blue-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {comparisonData.metrics.good_bad_match_ratio}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Decyzje tej samej kategorii (Dobra/Zła)
                        </p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`border-l-4 shadow-sm ${
                        comparisonData.metrics.cumulative_regret > 0
                          ? "border-l-red-500"
                          : "border-l-green-500"
                      }`}
                    >
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Skumulowany Żal
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={`text-2xl font-bold ${
                            comparisonData.metrics.cumulative_regret > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {comparisonData.metrics.cumulative_regret > 0
                            ? "-"
                            : "+"}
                          ${Math.abs(comparisonData.metrics.cumulative_regret)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Strata wyniku względem AI
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-purple-500 shadow-sm">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Reakcja WSLS
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {comparisonData.metrics.wsls_ratio}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Zgodność reakcji na Wynik (Win-Stay...)
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500 shadow-sm">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          Entropia (Chaos)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {comparisonData.metrics.human_entropy}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            / {comparisonData.metrics.ai_entropy} (AI)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Miara niepewności (0-2)
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-slate-500 shadow-sm md:col-span-2 lg:col-span-2">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                          RMSE (Odchylenie)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${comparisonData.metrics.capital_rmse}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Średnia różnica kapitału per tura
                        </p>
                      </CardContent>
                    </Card> */}
                </div>
              )}
              {/* WYKRESY */}
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Trajektoria Finansowa (Kapitał)</CardTitle>
                    <CardDescription>
                      Porównanie narastającego wyniku.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="trial"
                          label={{
                            value: "Tura",
                            position: "insideBottom",
                            offset: -5,
                          }}
                        />
                        <YAxis
                          label={{
                            value: "Kapitał ($)",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip contentStyle={{ borderRadius: "8px" }} />
                        <Legend verticalAlign="top" height={36} />
                        <ReferenceLine
                          y={2000}
                          stroke="#666"
                          strokeDasharray="3 3"
                        />
                        <Line
                          type="monotone"
                          dataKey="human_score"
                          name="Człowiek"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={false}
                        />
                        {showAI && (
                          <Line
                            type="monotone"
                            dataKey="ai_score"
                            name="MPC"
                            stroke="#9333ea"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mapa Wyborów (A/B vs C/D)</CardTitle>
                    {showAI && comparisonData && (
                      <span className="text-sm font-normal bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200">
                        Zgodność: {comparisonData.metrics.exact_match_ratio}%
                      </span>
                    )}
                    <CardDescription>
                      <span className="text-red-500 font-bold">
                        A/B (Góra) = Ryzykowne
                      </span>
                      ,
                      <span className="text-green-600 font-bold ml-2">
                        C/D (Dół) = Bezpieczne
                      </span>
                      .
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Tura"
                          domain={[0, "auto"]}
                          label={{
                            value: "Tura",
                            position: "insideBottom",
                            offset: -10,
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Talia"
                          domain={[0, 5]}
                          tickCount={6}
                          tickFormatter={formatDeckAxis}
                          width={40}
                        />

                        {/* NOWY, ULEPSZONY TOOLTIP */}
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          content={({ active, payload }) => {
                            if (
                              active &&
                              payload &&
                              payload.length &&
                              comparisonData
                            ) {
                              // Pobieramy dane z pierwszego punktu, żeby znać Turę (X)
                              const hoveredX = payload[0].payload.x;

                              // Szukamy danych dla tej tury w obu zbiorach
                              // Zakładamy, że tablice są posortowane po trial (lub szukamy po trial == x)
                              const humanMove =
                                comparisonData.subject_data.history.find(
                                  (h) => h.x === hoveredX
                                );
                              const aiMove = comparisonData.mpc_data.find(
                                (m) => m.x === hoveredX
                              );

                              return (
                                <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-xl text-sm min-w-[200px]">
                                  <div className="font-bold mb-2 pb-1 border-b border-slate-100 text-center text-slate-700">
                                    Tura {hoveredX}
                                  </div>

                                  {/* Wiersz Nagłówków */}
                                  <div className="grid grid-cols-3 gap-2 mb-1 text-xs font-medium text-slate-400 text-center">
                                    <div></div>
                                    <div>CZŁOWIEK</div>
                                    <div>MPC (AI)</div>
                                  </div>

                                  {/* Wiersz Talia */}
                                  <div className="grid grid-cols-3 gap-2 mb-1 items-center">
                                    <div className="text-muted-foreground text-xs font-medium">
                                      Talia
                                    </div>
                                    <div className="text-center font-bold text-blue-600 bg-blue-50 rounded py-0.5">
                                      {humanMove?.deck_label || "-"}
                                    </div>
                                    <div className="text-center font-bold text-purple-600 bg-purple-50 rounded py-0.5">
                                      {showAI ? aiMove?.deck_label || "-" : "?"}
                                    </div>
                                  </div>

                                  {/* Wiersz Zysk/Strata/Netto */}
                                  {showAI && aiMove && humanMove && (
                                    <>
                                      <div className="grid grid-cols-3 gap-2 text-xs items-center mt-2 pt-2 border-t border-dashed border-slate-100">
                                        <div className="text-muted-foreground">
                                          Zysk
                                        </div>
                                        <div className="text-right text-green-600">
                                          +{humanMove.win}
                                        </div>
                                        <div className="text-right text-green-600">
                                          +{aiMove.win}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-xs items-center">
                                        <div className="text-muted-foreground">
                                          Strata
                                        </div>
                                        <div className="text-right text-red-500">
                                          {humanMove.loss}
                                        </div>
                                        <div className="text-right text-red-500">
                                          {aiMove.loss}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-xs items-center font-bold mt-1">
                                        <div className="text-slate-700">
                                          Netto
                                        </div>
                                        <div
                                          className={`text-right ${
                                            humanMove.net >= 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {humanMove.net > 0 ? "+" : ""}
                                          {humanMove.net}
                                        </div>
                                        <div
                                          className={`text-right ${
                                            aiMove.net >= 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {aiMove.net > 0 ? "+" : ""}
                                          {aiMove.net}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        <Legend verticalAlign="top" height={36} />

                        <Scatter
                          name="Człowiek"
                          data={scatterData.filter((d) => d.source === "human")}
                          fill="#2563eb"
                          shape="circle"
                        />
                        {showAI && (
                          <Scatter
                            name="MPC"
                            data={scatterData.filter((d) => d.source === "ai")}
                            fill="#9333ea"
                            shape="triangle"
                          />
                        )}
                        {showAI && (
                          <Scatter
                            name="Zgodność"
                            data={matchesData}
                            fill="#16a34a"
                            shape="star"
                            r={150}
                          />
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
