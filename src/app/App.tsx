import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import logoImg from "@/imports/Captura_de_Tela_2026-06-18_a_s_12.40.22.png";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Star,
  Trophy,
  Settings,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Menu,
  X,
  Zap,
  Activity,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  UserPlus,
  ChevronDown,
  Check,
  ImageIcon,
  Upload,
  Shuffle,
  Crown,
  ChevronLeft,
  Swords,
  LayoutGrid,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Page = "dashboard" | "reservas" | "jogadores" | "torneios" | "ratings";

interface Reserva {
  id: number;
  nome: string;
  data: string;
  horario: string;
  status: "confirmada" | "pendente" | "cancelada";
}

interface Jogador {
  id: number;
  nome: string;
  posicao: string;
  rating: number;
  jogos: number;
  gols: number;
}

interface Time {
  id: number;
  nome: string;
  cor: string;
  logo?: string;
  jogadores: Jogador[];
}

type AtributoKey = "chute" | "passe" | "velocidade" | "drible" | "defesa" | "fisico";
type AtributosMap = Record<AtributoKey, number>;

type AtributoGKKey = "reflexo" | "manejo" | "posicionamento" | "agilidade" | "mergulho" | "distribuicao" | "chute_gk";
type AtributosGKMap = Record<AtributoGKKey, number>;

interface AvaliacaoJogador {
  id: number;
  avaliadorId: number;
  avaliadoId: number;
  timeId: number;
  atributos: AtributosMap;
  atributosGK?: AtributosGKMap;
  contexto: string;
  data: string;
}

const ATRIBUTOS: { key: AtributoKey; label: string }[] = [
  { key: "chute",      label: "Chute"      },
  { key: "passe",      label: "Passe"      },
  { key: "velocidade", label: "Velocidade" },
  { key: "drible",     label: "Drible"     },
  { key: "defesa",     label: "Defesa"     },
  { key: "fisico",     label: "Físico"     },
];

// Weights per position — attrs absent or 0 are ignored in avg
const PESOS: Record<string, Partial<AtributosMap>> = {
  "Atacante":   { chute: 5, drible: 4, velocidade: 4, passe: 2, fisico: 2 },
  "Meio-campo": { passe: 5, chute: 3, drible: 3, velocidade: 3, fisico: 2 },
  "Zagueiro":   { defesa: 5, fisico: 4, velocidade: 3, passe: 3 },
  "Lateral":    { velocidade: 4, defesa: 4, passe: 3, drible: 2, fisico: 3 },
  "Goleiro":    { fisico: 3 },   // GK rating uses PESOS_GK instead
};

function calcRatingPesado(attrs: AtributosMap, posicao: string): number {
  const pesos = PESOS[posicao] ?? PESOS["Meio-campo"];
  let somaNotas = 0, somaPesos = 0;
  for (const [k, p] of Object.entries(pesos) as [AtributoKey, number][]) {
    if (p > 0) { somaNotas += (attrs[k] ?? 0) * p; somaPesos += p; }
  }
  return somaPesos > 0 ? Math.round((somaNotas / somaPesos) * 10) / 10 : 0;
}

function getAvgAtributos(jogadorId: number, avaliacoes: AvaliacaoJogador[]): AtributosMap | null {
  const avs = avaliacoes.filter(a => a.avaliadoId === jogadorId);
  if (!avs.length) return null;
  return Object.fromEntries(
    (["chute","passe","velocidade","drible","defesa","fisico"] as AtributoKey[]).map(k => [
      k, Math.round((avs.reduce((s, a) => s + a.atributos[k], 0) / avs.length) * 10) / 10,
    ])
  ) as AtributosMap;
}

// ── Goalkeeper-specific ──────────────────────────────────────────────────

const ATRIBUTOS_GK: { key: AtributoGKKey; label: string }[] = [
  { key: "reflexo",        label: "Reflexo"       },
  { key: "manejo",         label: "Manejo"        },
  { key: "posicionamento", label: "Posicion."     },
  { key: "agilidade",      label: "Agilidade"     },
  { key: "mergulho",       label: "Mergulho"      },
  { key: "distribuicao",   label: "Distribuição"  },
  { key: "chute_gk",       label: "Chute / TK"    },
];

const ATTR_COLORS_GK: Record<AtributoGKKey, string> = {
  reflexo:        "#00B4D4",
  manejo:         "#43A832",
  posicionamento: "#ffd600",
  agilidade:      "#e040fb",
  mergulho:       "#ff6b35",
  distribuicao:   "#C41230",
  chute_gk:       "#5c6bc0",
};

const PESOS_GK: AtributosGKMap = {
  reflexo: 8, manejo: 7, posicionamento: 7,
  agilidade: 6, mergulho: 6, distribuicao: 4, chute_gk: 3,
};

const DEFAULT_GK_ATTRS: AtributosGKMap = {
  reflexo: 5, manejo: 5, posicionamento: 5,
  agilidade: 5, mergulho: 5, distribuicao: 5, chute_gk: 5,
};

function calcRatingGK(gk: AtributosGKMap, fisico = 5): number {
  let soma = 0, total = 0;
  for (const [k, p] of Object.entries(PESOS_GK) as [AtributoGKKey, number][]) {
    soma += gk[k] * p; total += p;
  }
  // físico contribui com peso 3 além dos GK attrs
  soma += fisico * 3; total += 3;
  return Math.round((soma / total) * 10) / 10;
}

function getAvgAtributosGK(jogadorId: number, avaliacoes: AvaliacaoJogador[]): AtributosGKMap | null {
  const avs = avaliacoes.filter(a => a.avaliadoId === jogadorId && a.atributosGK);
  if (!avs.length) return null;
  return Object.fromEntries(
    (Object.keys(PESOS_GK) as AtributoGKKey[]).map(k => [
      k, Math.round((avs.reduce((s, a) => s + (a.atributosGK![k] ?? 5), 0) / avs.length) * 10) / 10,
    ])
  ) as AtributosGKMap;
}

interface PartidaT {
  id: number;
  timeA: string;
  timeB: string;
  golsA: number | null;
  golsB: number | null;
}
interface GrupoT { nome: string; times: string[]; partidas: PartidaT[]; }
interface FaseT  { nome: string; partidas: PartidaT[]; }
interface Torneio {
  id: number;
  nome: string;
  formato: "grupos" | "mata-mata";
  status: "aguardando" | "em-andamento" | "encerrado";
  times: string[];
  cores: Record<string, string>;
  numGrupos?: number;
  grupos?: GrupoT[];
  fases?: FaseT[];
  artilheiros: { nome: string; time: string; gols: number }[];
  campeao?: string;
  data: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────

const revenueData = [
  { mes: "Jan", receita: 8400, reservas: 42 },
  { mes: "Fev", receita: 9200, reservas: 48 },
  { mes: "Mar", receita: 11800, reservas: 61 },
  { mes: "Abr", receita: 10500, reservas: 55 },
  { mes: "Mai", receita: 13200, reservas: 68 },
  { mes: "Jun", receita: 14800, reservas: 74 },
  { mes: "Jul", receita: 12900, reservas: 66 },
  { mes: "Ago", receita: 15600, reservas: 80 },
  { mes: "Set", receita: 17200, reservas: 89 },
  { mes: "Out", receita: 16400, reservas: 84 },
  { mes: "Nov", receita: 18900, reservas: 97 },
  { mes: "Dez", receita: 21300, reservas: 109 },
];

const jogadores = [
  { nome: "Rafael Moura", posicao: "Atacante", rating: 9.2, jogos: 38, gols: 24, time: "Raça FC" },
  { nome: "Bruno Dias", posicao: "Meio-campo", rating: 8.8, jogos: 41, gols: 11, time: "Arena Warriors" },
  { nome: "Carlos Lima", posicao: "Goleiro", rating: 8.6, jogos: 35, gols: 0, time: "Planeta Stars" },
  { nome: "Diego Santos", posicao: "Zagueiro", rating: 8.4, jogos: 36, gols: 3, time: "Raça FC" },
  { nome: "Felipe Costa", posicao: "Atacante", rating: 8.1, jogos: 32, gols: 18, time: "Speed United" },
  { nome: "Gustavo Neto", posicao: "Lateral", rating: 7.9, jogos: 39, gols: 5, time: "Arena Warriors" },
];

const partidas = [
  { casa: "Raça FC", fora: "Arena Warriors", placar: "4 × 2", data: "Hoje, 20h", status: "ao vivo" },
  { casa: "Planeta Stars", fora: "Speed United", placar: "2 × 2", data: "Hoje, 22h", status: "agendado" },
  { casa: "Cobra FC", fora: "Thunder Boys", placar: "3 × 1", data: "Ontem", status: "encerrado" },
  { casa: "Raça FC", fora: "Cobra FC", placar: "1 × 0", data: "15 Jun", status: "encerrado" },
];

const statsCards = [
  { label: "Receita Mensal", value: 21300, prefix: "R$", suffix: "", trend: +12.4, icon: TrendingUp, color: "text-primary" },
  { label: "Reservas Ativas", value: 109, prefix: "", suffix: "", trend: +8.7, icon: Calendar, color: "text-[#00B4D4]" },
  { label: "Jogadores Ativos", value: 348, prefix: "", suffix: "", trend: +5.2, icon: Users, color: "text-[#00B4D4]" },
  { label: "Avaliação Média", value: 8.6, prefix: "", suffix: "/10", trend: +0.3, icon: Star, color: "text-accent" },
];

const CORES_TIME = [
  "#43A832", "#C41230", "#00B4D4", "#ffd600",
  "#e040fb", "#ff6b35", "#00bfa5", "#5c6bc0",
];

const timesIniciais: Time[] = [
  {
    id: 1, nome: "Raça FC", cor: "#C41230",
    jogadores: [
      { id: 101, nome: "Rafael Moura", posicao: "Atacante", rating: 9.2, jogos: 38, gols: 24 },
      { id: 102, nome: "Diego Santos", posicao: "Zagueiro", rating: 8.4, jogos: 36, gols: 3 },
      { id: 103, nome: "Marcos Vidal", posicao: "Goleiro", rating: 7.8, jogos: 33, gols: 0 },
      { id: 104, nome: "André Pinto", posicao: "Lateral", rating: 7.5, jogos: 30, gols: 2 },
    ],
  },
  {
    id: 2, nome: "Arena Warriors", cor: "#00B4D4",
    jogadores: [
      { id: 201, nome: "Bruno Dias", posicao: "Meio-campo", rating: 8.8, jogos: 41, gols: 11 },
      { id: 202, nome: "Gustavo Neto", posicao: "Lateral", rating: 7.9, jogos: 39, gols: 5 },
      { id: 203, nome: "Leonardo Cruz", posicao: "Atacante", rating: 7.6, jogos: 28, gols: 9 },
    ],
  },
  {
    id: 3, nome: "Planeta Stars", cor: "#43A832",
    jogadores: [
      { id: 301, nome: "Carlos Lima", posicao: "Goleiro", rating: 8.6, jogos: 35, gols: 0 },
      { id: 302, nome: "Pedro Rocha", posicao: "Meio-campo", rating: 8.0, jogos: 37, gols: 7 },
      { id: 303, nome: "Thiago Melo", posicao: "Zagueiro", rating: 7.7, jogos: 34, gols: 1 },
    ],
  },
  {
    id: 4, nome: "Speed United", cor: "#ffd600",
    jogadores: [
      { id: 401, nome: "Felipe Costa", posicao: "Atacante", rating: 8.1, jogos: 32, gols: 18 },
      { id: 402, nome: "Ricardo Sousa", posicao: "Meio-campo", rating: 7.4, jogos: 29, gols: 6 },
    ],
  },
];

// IDs: Raça FC 101-104 | Arena Warriors 201-203 | Planeta Stars 301-303 | Speed United 401-402
const avaliacoesIniciais: AvaliacaoJogador[] = [
  // Rafael Moura – Atacante (101)
  { id: 1,  avaliadorId: 102, avaliadoId: 101, timeId: 1, atributos: { chute: 9,  passe: 8, velocidade: 9,  drible: 9,  defesa: 3, fisico: 8 }, contexto: "Copa Arena 2024 – Semifinal", data: "2024-11-15" },
  { id: 2,  avaliadorId: 103, avaliadoId: 101, timeId: 1, atributos: { chute: 10, passe: 7, velocidade: 9,  drible: 10, defesa: 2, fisico: 8 }, contexto: "Copa Arena 2024 – Semifinal", data: "2024-11-15" },
  { id: 3,  avaliadorId: 104, avaliadoId: 101, timeId: 1, atributos: { chute: 9,  passe: 8, velocidade: 8,  drible: 9,  defesa: 3, fisico: 9 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  // Diego Santos – Zagueiro (102)
  { id: 4,  avaliadorId: 101, avaliadoId: 102, timeId: 1, atributos: { chute: 4,  passe: 7, velocidade: 7,  drible: 4,  defesa: 9, fisico: 9 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  { id: 5,  avaliadorId: 103, avaliadoId: 102, timeId: 1, atributos: { chute: 3,  passe: 8, velocidade: 7,  drible: 3,  defesa: 9, fisico: 8 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  // Marcos Vidal – Goleiro (103)
  { id: 6,  avaliadorId: 101, avaliadoId: 103, timeId: 1, atributos: { chute: 3, passe: 5, velocidade: 6, drible: 3, defesa: 8, fisico: 8 }, atributosGK: { reflexo: 7, manejo: 8, posicionamento: 8, agilidade: 6, mergulho: 7, distribuicao: 6, chute_gk: 6 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  { id: 7,  avaliadorId: 104, avaliadoId: 103, timeId: 1, atributos: { chute: 2, passe: 5, velocidade: 5, drible: 2, defesa: 9, fisico: 7 }, atributosGK: { reflexo: 8, manejo: 7, posicionamento: 8, agilidade: 7, mergulho: 8, distribuicao: 5, chute_gk: 5 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  // Bruno Dias – Meio-campo (201)
  { id: 8,  avaliadorId: 202, avaliadoId: 201, timeId: 2, atributos: { chute: 8,  passe: 9, velocidade: 8,  drible: 7,  defesa: 5, fisico: 8 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  { id: 9,  avaliadorId: 203, avaliadoId: 201, timeId: 2, atributos: { chute: 8,  passe: 9, velocidade: 7,  drible: 8,  defesa: 5, fisico: 9 }, contexto: "Copa Arena 2024 – Final",     data: "2024-11-15" },
  // Gustavo Neto – Lateral (202)
  { id: 10, avaliadorId: 201, avaliadoId: 202, timeId: 2, atributos: { chute: 5,  passe: 7, velocidade: 8,  drible: 7,  defesa: 7, fisico: 8 }, contexto: "Torneio Verão – Grupo A",     data: "2024-08-10" },
  { id: 11, avaliadorId: 203, avaliadoId: 202, timeId: 2, atributos: { chute: 4,  passe: 7, velocidade: 8,  drible: 6,  defesa: 8, fisico: 7 }, contexto: "Torneio Verão – Grupo A",     data: "2024-08-10" },
  // Carlos Lima – Goleiro (301)
  { id: 12, avaliadorId: 302, avaliadoId: 301, timeId: 3, atributos: { chute: 2, passe: 6, velocidade: 5, drible: 2, defesa: 9, fisico: 8 }, atributosGK: { reflexo: 9, manejo: 9, posicionamento: 9, agilidade: 8, mergulho: 8, distribuicao: 7, chute_gk: 7 }, contexto: "Torneio Verão – Final",       data: "2024-08-10" },
  { id: 13, avaliadorId: 303, avaliadoId: 301, timeId: 3, atributos: { chute: 3, passe: 5, velocidade: 6, drible: 3, defesa: 8, fisico: 8 }, atributosGK: { reflexo: 8, manejo: 8, posicionamento: 8, agilidade: 7, mergulho: 7, distribuicao: 6, chute_gk: 6 }, contexto: "Torneio Verão – Final",       data: "2024-08-10" },
  // Pedro Rocha – Meio-campo (302)
  { id: 14, avaliadorId: 301, avaliadoId: 302, timeId: 3, atributos: { chute: 7,  passe: 8, velocidade: 8,  drible: 7,  defesa: 6, fisico: 8 }, contexto: "Torneio Verão – Final",       data: "2024-08-10" },
  // Felipe Costa – Atacante (401)
  { id: 15, avaliadorId: 402, avaliadoId: 401, timeId: 4, atributos: { chute: 8,  passe: 7, velocidade: 9,  drible: 8,  defesa: 3, fisico: 8 }, contexto: "Copa Arena 2024 – Semifinal", data: "2024-11-15" },
];

const T_CORES: Record<string, string> = {
  "Raça FC": "#C41230", "Arena Warriors": "#00B4D4",
  "Planeta Stars": "#43A832", "Speed United": "#ffd600",
};

const torneiosIniciais: Torneio[] = [
  {
    id: 1, nome: "Copa Arena 2024", formato: "mata-mata",
    status: "encerrado", times: ["Raça FC", "Speed United", "Arena Warriors", "Planeta Stars"],
    cores: T_CORES,
    fases: [
      { nome: "Semifinais", partidas: [
        { id: 1, timeA: "Raça FC",      timeB: "Speed United",  golsA: 3, golsB: 1 },
        { id: 2, timeA: "Arena Warriors", timeB: "Planeta Stars", golsA: 2, golsB: 0 },
      ]},
      { nome: "Final", partidas: [
        { id: 3, timeA: "Raça FC", timeB: "Arena Warriors", golsA: 2, golsB: 1 },
      ]},
    ],
    artilheiros: [
      { nome: "Rafael Moura", time: "Raça FC", gols: 4 },
      { nome: "Bruno Dias",   time: "Arena Warriors", gols: 2 },
      { nome: "Felipe Costa", time: "Speed United", gols: 1 },
      { nome: "Diego Santos", time: "Raça FC", gols: 1 },
    ],
    campeao: "Raça FC", data: "2024-11-15",
  },
  {
    id: 2, nome: "Torneio Verão Society", formato: "grupos",
    status: "encerrado", times: ["Raça FC", "Arena Warriors", "Planeta Stars", "Speed United"],
    cores: T_CORES, numGrupos: 2,
    grupos: [
      { nome: "A", times: ["Raça FC", "Arena Warriors"],
        partidas: [{ id: 4, timeA: "Raça FC", timeB: "Arena Warriors", golsA: 3, golsB: 1 }] },
      { nome: "B", times: ["Planeta Stars", "Speed United"],
        partidas: [{ id: 5, timeA: "Planeta Stars", timeB: "Speed United", golsA: 2, golsB: 0 }] },
    ],
    fases: [
      { nome: "Final", partidas: [
        { id: 6, timeA: "Raça FC", timeB: "Planeta Stars", golsA: 1, golsB: 2 },
      ]},
    ],
    artilheiros: [
      { nome: "Carlos Lima",   time: "Planeta Stars", gols: 2 },
      { nome: "Rafael Moura",  time: "Raça FC",        gols: 1 },
      { nome: "Gustavo Neto",  time: "Arena Warriors", gols: 1 },
    ],
    campeao: "Planeta Stars", data: "2024-08-10",
  },
  {
    id: 3, nome: "Copa Início 2025", formato: "mata-mata",
    status: "aguardando", times: ["Raça FC", "Arena Warriors", "Planeta Stars", "Speed United"],
    cores: T_CORES, artilheiros: [], data: "2025-01-20",
  },
];

const reservasIniciais: Reserva[] = [
  { id: 1, nome: "Lucas Ferreira", data: "2024-12-20", horario: "08:00", status: "confirmada" },
  { id: 2, nome: "Mariana Costa", data: "2024-12-20", horario: "10:00", status: "confirmada" },
  { id: 3, nome: "Time Raça FC", data: "2024-12-21", horario: "14:00", status: "pendente" },
  { id: 4, nome: "Pedro Almeida", data: "2024-12-21", horario: "16:00", status: "confirmada" },
  { id: 5, nome: "Arena Warriors", data: "2024-12-22", horario: "09:00", status: "cancelada" },
  { id: 6, nome: "João Mendes", data: "2024-12-23", horario: "19:00", status: "pendente" },
];

// ─── Animated Counter ──────────────────────────────────────────────────────

function AnimatedCounter({ target, prefix = "", suffix = "", decimals = 0 }: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const duration = 1400;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : Math.floor(count).toLocaleString("pt-BR");

  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-2xl">
      <p className="text-muted-foreground text-xs font-mono mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name === "receita"
            ? `R$ ${p.value.toLocaleString("pt-BR")}`
            : `${p.value} reservas`}
        </p>
      ))}
    </div>
  );
}

// ─── Status Badges ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "ao vivo": "bg-primary/20 text-primary border-primary/30",
    "agendado": "bg-[#00B4D4]/10 text-[#00B4D4] border-[#00B4D4]/20",
    "encerrado": "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${map[status]}`}>
      {status === "ao vivo" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1 animate-pulse" />}
      {status}
    </span>
  );
}

function ReservaStatusBadge({ status }: { status: Reserva["status"] }) {
  const config = {
    confirmada: { cls: "bg-primary/15 text-primary border-primary/25", icon: CheckCircle2, label: "Confirmada" },
    pendente: { cls: "bg-[#ffd600]/10 text-[#00B4D4] border-[#ffd600]/20", icon: AlertCircle, label: "Pendente" },
    cancelada: { cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle, label: "Cancelada" },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",           page: "dashboard" as Page },
  { icon: Calendar,        label: "Reservas",            page: "reservas"  as Page },
  { icon: Users,           label: "Jogadores e Equipes", page: "jogadores" as Page },
  { icon: Trophy,          label: "Torneios",            page: "torneios"  as Page },
  { icon: Star,            label: "Ratings",             page: "ratings"   as Page },
  { icon: Activity,        label: "Relatórios",          page: null },
  { icon: Settings,        label: "Configurações",       page: null },
];

function Sidebar({ open, onClose, currentPage, onNavigate }: {
  open: boolean;
  onClose: () => void;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-sidebar border-r border-sidebar-border z-30
          flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
          <ImageWithFallback
            src={logoImg}
            alt="Planeta Bola Arena Soccer"
            className="h-14 w-auto object-contain"
          />
          <button className="lg:hidden text-muted-foreground hover:text-foreground ml-2" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-mono tracking-widest text-muted-foreground px-2 mb-3 uppercase">Menu</p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active = item.page === currentPage;
              return (
                <motion.li key={item.label} whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                  <button
                    onClick={() => {
                      if (item.page) { onNavigate(item.page); onClose(); }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                      ${active
                        ? "bg-primary/15 text-primary font-medium"
                        : item.page
                          ? "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
                          : "text-sidebar-foreground/40 cursor-not-allowed"
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent">
            <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              AM
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Admin Manager</p>
              <p className="text-[10px] text-muted-foreground truncate">admin@planetabola.com</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────────────

function DashboardPage() {
  const [activeChart, setActiveChart] = useState<"receita" | "reservas">("receita");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Visão Geral</p>
        </div>
        <h1 className="text-2xl font-display font-semibold text-foreground mt-1 tracking-tight">Dashboard</h1>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            whileHover={{ y: -2, transition: { type: "spring", stiffness: 400 } }}
            className="bg-card border border-border rounded-xl p-4 cursor-default"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-2xl font-display font-semibold ${card.color}`}>
              <AnimatedCounter target={card.value} prefix={card.prefix} suffix={card.suffix} decimals={card.value % 1 !== 0 ? 1 : 0} />
            </p>
            <div className="flex items-center gap-1 mt-2">
              {card.trend > 0
                ? <TrendingUp className="w-3 h-3 text-primary" />
                : <TrendingDown className="w-3 h-3 text-destructive" />
              }
              <span className={`text-xs font-mono ${card.trend > 0 ? "text-primary" : "text-destructive"}`}>
                {card.trend > 0 ? "+" : ""}{card.trend}%
              </span>
              <span className="text-xs text-muted-foreground">vs. mês ant.</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + Matches */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Desempenho Anual</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Jan – Dez 2024</p>
            </div>
            <div className="flex gap-1">
              {(["receita", "reservas"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveChart(tab)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-all ${
                    activeChart === tab ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "receita" ? "Receita" : "Reservas"}
                </button>
              ))}
            </div>
          </div>
          {(() => {
            const isReceita = activeChart === "receita";
            const color = isReceita ? "#43A832" : "#00B4D4";
            const gradId = isReceita ? "grad-receita" : "grad-reservas";
            return (
              <div className="w-full h-52">
                <ResponsiveContainer key={activeChart} width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="mes" tick={{ fill: "#6b6b6b", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b6b6b", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={activeChart} stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Partidas Recentes</h2>
          <ul className="space-y-3">
            {partidas.map((p, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <StatusBadge status={p.status} />
                  <p className="text-[10px] font-mono text-muted-foreground">{p.data}</p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate max-w-[70px]">{p.casa}</span>
                  <span className="font-display font-semibold text-sm text-primary mx-2 tabular-nums">{p.placar}</span>
                  <span className="text-foreground font-medium truncate max-w-[70px] text-right">{p.fora}</span>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Players Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.48 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Ranking de Jogadores</h2>
          <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["#", "Jogador", "Posição", "Time", "Jogos", "Gols", "Rating"].map((h) => (
                  <th key={h} className="text-left text-xs font-mono text-muted-foreground px-5 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jogadores.map((j, i) => (
                <motion.tr
                  key={j.nome}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <span className={`font-mono text-xs font-semibold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {j.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">{j.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono">{j.posicao}</td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">{j.time}</td>
                  <td className="px-5 py-3.5 font-mono text-foreground">{j.jogos}</td>
                  <td className="px-5 py-3.5 font-mono text-foreground">{j.gols}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted max-w-[60px]">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${(j.rating / 10) * 100}%` }}
                          transition={{ delay: 0.6 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-primary text-xs">{j.rating}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Reservas Page ─────────────────────────────────────────────────────────

const EMPTY_FORM = { nome: "", data: "", horario: "" };

function ReservasPage() {
  const [tab, setTab] = useState<"lista" | "nova">("lista");
  const [reservas, setReservas] = useState<Reserva[]>(reservasIniciais);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [success, setSuccess] = useState(false);
  const [filtro, setFiltro] = useState<"todas" | "confirmada" | "pendente" | "cancelada">("todas");

  const today = new Date().toISOString().split("T")[0];

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.nome.trim()) e.nome = "Informe o nome";
    if (!form.data) e.data = "Informe a data";
    if (!form.horario) e.horario = "Informe o horário";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const nova: Reserva = {
      id: Date.now(),
      nome: form.nome.trim(),
      data: form.data,
      horario: form.horario,
      status: "pendente",
    };
    setReservas((prev) => [nova, ...prev]);
    setForm(EMPTY_FORM);
    setErrors({});
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setTab("lista");
    }, 1800);
  }

  function handleDelete(id: number) {
    setReservas((prev) => prev.filter((r) => r.id !== id));
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  const filtered = filtro === "todas" ? reservas : reservas.filter((r) => r.status === filtro);

  const counts = {
    todas: reservas.length,
    confirmada: reservas.filter((r) => r.status === "confirmada").length,
    pendente: reservas.filter((r) => r.status === "pendente").length,
    cancelada: reservas.filter((r) => r.status === "cancelada").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Gestão</p>
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground mt-1 tracking-tight">Reservas</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab("nova")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Nova Reserva
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["lista", "nova"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSuccess(false); }}
            className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === t && (
              <motion.span
                layoutId="reservas-tab-indicator"
                className="absolute inset-0 bg-card border border-border rounded-lg shadow-sm"
                style={{ zIndex: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {t === "lista" ? <><Calendar className="w-3.5 h-3.5" /> Reservas Feitas</> : <><Plus className="w-3.5 h-3.5" /> Nova Reserva</>}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "nova" ? (
          <motion.div
            key="nova"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="max-w-lg">
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-1">Criar Nova Reserva</h2>
                <p className="text-xs text-muted-foreground mb-6">Preencha os dados para agendar uma nova reserva de quadra.</p>

                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-primary/10 border border-primary/25 text-primary rounded-lg px-4 py-3 mb-5 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Reserva criada com sucesso! Redirecionando...
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                      Nome do Responsável
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => { setForm((f) => ({ ...f, nome: e.target.value })); setErrors((er) => ({ ...er, nome: "" })); }}
                      placeholder="Ex: Rafael Moura / Raça FC"
                      className={`w-full bg-input-background border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary ${
                        errors.nome ? "border-destructive" : "border-border"
                      }`}
                    />
                    {errors.nome && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nome}</p>}
                  </div>

                  {/* Data + Horário */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={form.data}
                        min={today}
                        onChange={(e) => { setForm((f) => ({ ...f, data: e.target.value })); setErrors((er) => ({ ...er, data: "" })); }}
                        className={`w-full bg-input-background border rounded-lg px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary [color-scheme:dark] ${
                          errors.data ? "border-destructive" : "border-border"
                        }`}
                      />
                      {errors.data && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.data}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                        Horário
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <select
                          value={form.horario}
                          onChange={(e) => { setForm((f) => ({ ...f, horario: e.target.value })); setErrors((er) => ({ ...er, horario: "" })); }}
                          className={`w-full bg-input-background border rounded-lg pl-9 pr-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary appearance-none cursor-pointer ${
                            errors.horario ? "border-destructive" : "border-border"
                          }`}
                        >
                          <option value="">Selecione</option>
                          {["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"].map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      {errors.horario && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.horario}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setForm(EMPTY_FORM); setErrors({}); setTab("lista"); }}
                      className="flex-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 rounded-lg py-2.5 text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Confirmar Reserva
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="lista"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2">
              {(["todas", "confirmada", "pendente", "cancelada"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    filtro === f
                      ? f === "todas" ? "bg-foreground/10 text-foreground border-foreground/20"
                        : f === "confirmada" ? "bg-primary/20 text-primary border-primary/30"
                        : f === "pendente" ? "bg-[#ffd600]/10 text-[#00B4D4] border-[#ffd600]/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground"
                  }`}
                >
                  {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="opacity-70">({counts[f]})</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Calendar className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-sm">Nenhuma reserva encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["#", "Nome", "Data", "Horário", "Status", ""].map((h, i) => (
                          <th key={i} className="text-left text-xs font-mono text-muted-foreground px-5 py-3 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {filtered.map((r, i) => (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                                  {r.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium text-foreground">{r.nome}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-foreground text-xs">{formatDate(r.data)}</td>
                            <td className="px-5 py-3.5">
                              <span className="flex items-center gap-1.5 font-mono text-foreground text-xs">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {r.horario}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <ReservaStatusBadge status={r.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tactics Field ─────────────────────────────────────────────────────────

const POSICAO_ZONA: Record<string, { x: number; y: number }> = {
  "Goleiro":    { x: 0.5,  y: 0.88 },
  "Zagueiro":   { x: 0.5,  y: 0.68 },
  "Lateral":    { x: 0.5,  y: 0.52 },
  "Meio-campo": { x: 0.5,  y: 0.38 },
  "Atacante":   { x: 0.5,  y: 0.18 },
};

function TacticsField({ jogadores, cor }: { jogadores: { nome: string; posicao: string }[]; cor: string }) {
  const W = 220;
  const H = 320;
  const PAD = 12;

  // Group by position and spread horizontally
  const groups: Record<string, { nome: string; posicao: string }[]> = {};
  for (const j of jogadores.filter(j => j.nome.trim())) {
    const pos = j.posicao in POSICAO_ZONA ? j.posicao : "Meio-campo";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(j);
  }

  const dots: { cx: number; cy: number; label: string; posicao: string }[] = [];
  for (const [posicao, group] of Object.entries(groups)) {
    const base = POSICAO_ZONA[posicao];
    const n = group.length;
    const spread = Math.min(0.55, (n - 1) * 0.22);
    group.forEach((j, i) => {
      const offsetX = n === 1 ? 0 : -spread / 2 + (spread / (n - 1)) * i;
      dots.push({
        cx: (base.x + offsetX) * (W - PAD * 2) + PAD,
        cy: base.y * (H - PAD * 2) + PAD,
        label: j.nome.split(" ")[0],
        posicao,
      });
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Field background */}
      <rect x="0" y="0" width={W} height={H} rx="10" fill="#1a2e1a" />

      {/* Grass stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={PAD} y={PAD + i * ((H - PAD * 2) / 8)} width={W - PAD * 2} height={(H - PAD * 2) / 8}
          fill={i % 2 === 0 ? "rgba(255,255,255,0.025)" : "transparent"} />
      ))}

      {/* Outer boundary */}
      <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} rx="4"
        fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

      {/* Halfway line */}
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* Center circle */}
      <circle cx={W / 2} cy={H / 2} r={28} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx={W / 2} cy={H / 2} r={2} fill="rgba(255,255,255,0.4)" />

      {/* Penalty areas */}
      <rect x={W / 2 - 38} y={PAD} width={76} height={36}
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <rect x={W / 2 - 38} y={H - PAD - 36} width={76} height={36}
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {/* Goal areas */}
      <rect x={W / 2 - 20} y={PAD} width={40} height={14}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      <rect x={W / 2 - 20} y={H - PAD - 14} width={40} height={14}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />

      {/* Penalty spots */}
      <circle cx={W / 2} cy={PAD + 52} r={2} fill="rgba(255,255,255,0.35)" />
      <circle cx={W / 2} cy={H - PAD - 52} r={2} fill="rgba(255,255,255,0.35)" />

      {/* Player dots */}
      {dots.map((d, i) => (
        <g key={i}>
          <circle cx={d.cx} cy={d.cy} r={13} fill={cor} fillOpacity={0.9} />
          <circle cx={d.cx} cy={d.cy} r={13} fill="none" stroke="white" strokeWidth="1.5" strokeOpacity={0.6} />
          <text x={d.cx} y={d.cy + 4} textAnchor="middle" fontSize="8"
            fill="white" fontWeight="700" fontFamily="DM Mono, monospace"
            style={{ pointerEvents: "none" }}>
            {d.label.slice(0, 5)}
          </text>
        </g>
      ))}

      {/* Empty state */}
      {dots.length === 0 && (
        <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize="11"
          fill="rgba(255,255,255,0.2)" fontFamily="DM Mono, monospace">
          Adicione jogadores
        </text>
      )}
    </svg>
  );
}

// ─── Jogadores Page ────────────────────────────────────────────────────────

const POSICOES = ["Goleiro", "Zagueiro", "Lateral", "Meio-campo", "Atacante"];

const EMPTY_JOGADOR = { nome: "", posicao: "Atacante" };
const EMPTY_TIME = { nome: "", cor: CORES_TIME[0] };

function JogadoresPage({ times, setTimes }: { times: Time[]; setTimes: React.Dispatch<React.SetStateAction<Time[]>> }) {
  const [tab, setTab] = useState<"times" | "novo">("times");
  const [expandido, setExpandido] = useState<number | null>(timesIniciais[0].id);

  // Novo time form
  const [formTime, setFormTime] = useState(EMPTY_TIME);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [jogadoresNovoTime, setJogadoresNovoTime] = useState<{ nome: string; posicao: string }[]>([{ ...EMPTY_JOGADOR }]);
  const [errosTime, setErrosTime] = useState<{ nome?: string; jogadores?: string }>({});
  const [sucesso, setSucesso] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Todos os jogadores (lista plana)
  const todosJogadores = times.flatMap((t) =>
    t.jogadores.map((j) => ({ ...j, time: t.nome, corTime: t.cor }))
  );

  function addJogadorForm() {
    setJogadoresNovoTime((prev) => [...prev, { ...EMPTY_JOGADOR }]);
  }

  function removeJogadorForm(i: number) {
    setJogadoresNovoTime((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateJogadorForm(i: number, field: "nome" | "posicao", val: string) {
    setJogadoresNovoTime((prev) => prev.map((j, idx) => idx === i ? { ...j, [field]: val } : j));
  }

  function validateTime() {
    const e: typeof errosTime = {};
    if (!formTime.nome.trim()) e.nome = "Informe o nome do time";
    const validos = jogadoresNovoTime.filter((j) => j.nome.trim());
    if (validos.length === 0) e.jogadores = "Adicione ao menos um jogador";
    setErrosTime(e);
    return Object.keys(e).length === 0;
  }

  function handleCriarTime(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateTime()) return;
    const novo: Time = {
      id: Date.now(),
      nome: formTime.nome.trim(),
      cor: formTime.cor,
      logo: logoPreview ?? undefined,
      jogadores: jogadoresNovoTime
        .filter((j) => j.nome.trim())
        .map((j, i) => ({ id: Date.now() + i, nome: j.nome.trim(), posicao: j.posicao, rating: 7.0, jogos: 0, gols: 0 })),
    };
    setTimes((prev) => [...prev, novo]);
    setFormTime(EMPTY_TIME);
    setLogoPreview(null);
    setJogadoresNovoTime([{ ...EMPTY_JOGADOR }]);
    setErrosTime({});
    setSucesso(true);
    setTimeout(() => { setSucesso(false); setTab("times"); setExpandido(novo.id); }, 1800);
  }

  function deleteTime(id: number) {
    setTimes((prev) => prev.filter((t) => t.id !== id));
    if (expandido === id) setExpandido(null);
  }

  function deleteJogador(timeId: number, jogadorId: number) {
    setTimes((prev) => prev.map((t) =>
      t.id === timeId ? { ...t, jogadores: t.jogadores.filter((j) => j.id !== jogadorId) } : t
    ));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Gestão</p>
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground mt-1 tracking-tight">Jogadores</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setTab("novo")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Time
          </motion.button>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Times cadastrados", value: times.length, color: "text-primary" },
          { label: "Total de jogadores", value: todosJogadores.length, color: "text-[#00B4D4]" },
          { label: "Média de rating", value: todosJogadores.length ? (todosJogadores.reduce((s, j) => s + j.rating, 0) / todosJogadores.length).toFixed(1) : "—", color: "text-[#ffd600]" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-card border border-border rounded-xl px-5 py-4"
          >
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-display font-semibold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["times", "novo"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSucesso(false); }}
            className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === t && (
              <motion.span
                layoutId="jogadores-tab"
                className="absolute inset-0 bg-card border border-border rounded-lg shadow-sm"
                style={{ zIndex: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {t === "times"
                ? <><Shield className="w-3.5 h-3.5" /> Times &amp; Jogadores</>
                : <><Plus className="w-3.5 h-3.5" /> Novo Time</>
              }
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "times" ? (
          <motion.div key="times" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
            {times.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
                <Shield className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum time cadastrado</p>
                <button onClick={() => setTab("novo")} className="mt-3 text-xs text-primary hover:underline">Criar primeiro time</button>
              </div>
            ) : times.map((time, ti) => (
              <motion.div
                key={time.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ti * 0.05 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Time header */}
                <button
                  onClick={() => setExpandido(expandido === time.id ? null : time.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  {time.logo ? (
                    <img src={time.logo} alt={time.nome} className="w-8 h-8 object-contain rounded-md bg-black/30 p-0.5 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: `${time.cor}25`, color: time.cor }}>
                      {time.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-foreground tracking-wide">{time.nome}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {time.jogadores.length} jogador{time.jogadores.length !== 1 ? "es" : ""}
                      {time.jogadores.length > 0 && (
                        <> · média {(time.jogadores.reduce((s, j) => s + j.rating, 0) / time.jogadores.length).toFixed(1)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTime(time.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <motion.div animate={{ rotate: expandido === time.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                {/* Players list */}
                <AnimatePresence initial={false}>
                  {expandido === time.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="border-t border-border">
                        {time.jogadores.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-5 py-4">Nenhum jogador neste time.</p>
                        ) : (
                          <div className="grid lg:grid-cols-4">
                            {/* Table col-span-3 */}
                            <div className="lg:col-span-3 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border/50">
                                    {["Jogador", "Posição", "Jogos", "Gols", "Rating", ""].map((h, i) => (
                                      <th key={i} className="text-left text-[10px] font-mono text-muted-foreground px-5 py-2.5 uppercase tracking-wider">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {time.jogadores.map((j, ji) => (
                                    <motion.tr
                                      key={j.id}
                                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ji * 0.04 }}
                                      className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors group"
                                    >
                                      <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                            style={{ backgroundColor: `${time.cor}25`, color: time.cor }}>
                                            {j.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                          </div>
                                          <span className="font-medium text-foreground">{j.nome}</span>
                                        </div>
                                      </td>
                                      <td className="px-5 py-3 text-xs font-mono text-muted-foreground">{j.posicao}</td>
                                      <td className="px-5 py-3 font-mono text-foreground text-xs">{j.jogos}</td>
                                      <td className="px-5 py-3 font-mono text-foreground text-xs">{j.gols}</td>
                                      <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-1 rounded-full w-12 bg-muted">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${(j.rating / 10) * 100}%`, backgroundColor: time.cor }} />
                                          </div>
                                          <span className="font-mono text-xs font-semibold" style={{ color: time.cor }}>{j.rating.toFixed(1)}</span>
                                        </div>
                                      </td>
                                      <td className="px-5 py-3">
                                        <button
                                          onClick={() => deleteJogador(time.id, j.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </motion.tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Tactics mini field */}
                            <div className="hidden lg:flex border-l border-border/50 p-4 items-center justify-center bg-[#111]/40">
                              <TacticsField jogadores={time.jogadores} cor={time.cor} />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="novo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AnimatePresence>
              {sucesso && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-primary/10 border border-primary/25 text-primary rounded-lg px-4 py-3 mb-4 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Time criado com sucesso! Redirecionando...
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid lg:grid-cols-5 gap-5 items-start">
              {/* Form */}
              <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-1">Criar Novo Time</h2>
                <p className="text-xs text-muted-foreground mb-6">Defina o nome, cor, logo e adicione os jogadores.</p>

                <form onSubmit={handleCriarTime} className="space-y-5">
                  {/* Logo upload */}
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Logo do Time</label>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full border border-dashed border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      {logoPreview ? (
                        <>
                          <img src={logoPreview} alt="Logo" className="w-14 h-14 object-contain rounded-lg bg-black/30 p-1 flex-shrink-0" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">Logo carregada</p>
                            <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Clique para trocar</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Subir logo</p>
                            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG ou SVG · opcional</p>
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Nome + Cor */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Nome do Time</label>
                      <input
                        type="text"
                        value={formTime.nome}
                        onChange={(e) => { setFormTime((f) => ({ ...f, nome: e.target.value })); setErrosTime((er) => ({ ...er, nome: "" })); }}
                        placeholder="Ex: Cobra FC"
                        className={`w-full bg-input-background border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary ${errosTime.nome ? "border-destructive" : "border-border"}`}
                      />
                      {errosTime.nome && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errosTime.nome}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Cor do Time</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {CORES_TIME.map((cor) => (
                          <button
                            key={cor} type="button"
                            onClick={() => setFormTime((f) => ({ ...f, cor }))}
                            className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
                            style={{ backgroundColor: cor, borderColor: formTime.cor === cor ? "#fff" : "transparent" }}
                          >
                            {formTime.cor === cor && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Jogadores */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                        Jogadores <span className="text-muted-foreground/50">({jogadoresNovoTime.filter(j => j.nome.trim()).length} adicionado{jogadoresNovoTime.filter(j => j.nome.trim()).length !== 1 ? "s" : ""})</span>
                      </label>
                      <button type="button" onClick={addJogadorForm} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar jogador
                      </button>
                    </div>
                    {errosTime.jogadores && <p className="text-xs text-destructive mb-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errosTime.jogadores}</p>}

                    <div className="space-y-2.5">
                      <AnimatePresence initial={false}>
                        {jogadoresNovoTime.map((j, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex gap-3 items-start"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={j.nome}
                                onChange={(e) => updateJogadorForm(i, "nome", e.target.value)}
                                placeholder={`Jogador ${i + 1}`}
                                className="bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                              />
                              <select
                                value={j.posicao}
                                onChange={(e) => updateJogadorForm(i, "posicao", e.target.value)}
                                className="bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                              >
                                {POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            {jogadoresNovoTime.length > 1 && (
                              <button type="button" onClick={() => removeJogadorForm(i)} className="mt-0.5 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Preview */}
                  {jogadoresNovoTime.some(j => j.nome.trim()) && (
                    <div className="bg-muted/40 border border-border rounded-lg p-4">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Preview do time</p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formTime.cor }} />
                        <p className="font-display font-semibold text-foreground text-sm">{formTime.nome || "Sem nome"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {jogadoresNovoTime.filter(j => j.nome.trim()).map((j, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full border font-medium"
                            style={{ borderColor: `${formTime.cor}40`, color: formTime.cor, backgroundColor: `${formTime.cor}12` }}>
                            {j.nome} · {j.posicao}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setFormTime(EMPTY_TIME); setLogoPreview(null); setJogadoresNovoTime([{ ...EMPTY_JOGADOR }]); setErrosTime({}); setTab("times"); }}
                      className="flex-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 rounded-lg py-2.5 text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <motion.button
                      type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Criar Time
                    </motion.button>
                  </div>
                </form>
              </div>

              {/* Tactics field */}
              <div className="lg:col-span-2 space-y-3 lg:sticky lg:top-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-6 h-6 object-contain rounded" />
                    ) : (
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: formTime.cor }} />
                    )}
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {formTime.nome || "Campo Tático"}
                    </p>
                  </div>
                  <TacticsField jogadores={jogadoresNovoTime} cor={formTime.cor} />
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2.5">Posições no time</p>
                  <div className="space-y-1.5">
                    {POSICOES.map((pos) => {
                      const count = jogadoresNovoTime.filter(j => j.posicao === pos && j.nome.trim()).length;
                      return (
                        <div key={pos} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: count > 0 ? formTime.cor : "#2a2a2a" }} />
                            <span className="text-xs text-muted-foreground">{pos}</span>
                          </div>
                          <span className="text-xs font-mono" style={{ color: count > 0 ? formTime.cor : "#444" }}>
                            {count > 0 ? count : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Torneios helpers ──────────────────────────────────────────────────────

function calcStandings(grupo: GrupoT) {
  const t: Record<string, { j:number; v:number; e:number; d:number; gp:number; gc:number; pts:number }> = {};
  grupo.times.forEach(n => { t[n] = { j:0, v:0, e:0, d:0, gp:0, gc:0, pts:0 }; });
  for (const p of grupo.partidas) {
    if (p.golsA === null || p.golsB === null) continue;
    const a = t[p.timeA], b = t[p.timeB];
    if (!a || !b) continue;
    a.j++; b.j++; a.gp += p.golsA; a.gc += p.golsB; b.gp += p.golsB; b.gc += p.golsA;
    if (p.golsA > p.golsB)      { a.v++; a.pts += 3; b.d++; }
    else if (p.golsA < p.golsB) { b.v++; b.pts += 3; a.d++; }
    else                        { a.e++; b.e++; a.pts++; b.pts++; }
  }
  return grupo.times.map(n => ({ nome: n, ...t[n], sg: t[n].gp - t[n].gc }))
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
}

function MatchCard({ p, cores }: { p: PartidaT; cores: Record<string, string> }) {
  const done = p.golsA !== null && p.golsB !== null;
  const winA = done && p.golsA! > p.golsB!;
  const winB = done && p.golsB! > p.golsA!;
  const cA = cores[p.timeA] ?? "#666";
  const cB = cores[p.timeB] ?? "#666";
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden w-44 flex-shrink-0">
      <div className={`flex items-center gap-2 px-3 py-2.5 ${winA ? "bg-primary/10" : ""}`}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cA }} />
        <span className={`text-xs flex-1 truncate ${winA ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{p.timeA}</span>
        {done && <span className={`text-sm font-display font-bold tabular-nums ${winA ? "text-primary" : "text-muted-foreground"}`}>{p.golsA}</span>}
      </div>
      <div className="border-t border-border/50" />
      <div className={`flex items-center gap-2 px-3 py-2.5 ${winB ? "bg-primary/10" : ""}`}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cB }} />
        <span className={`text-xs flex-1 truncate ${winB ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{p.timeB}</span>
        {done && <span className={`text-sm font-display font-bold tabular-nums ${winB ? "text-primary" : "text-muted-foreground"}`}>{p.golsB}</span>}
      </div>
      {!done && <div className="border-t border-border/50 px-3 py-1.5 text-center">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">A definir</span>
      </div>}
    </div>
  );
}

function BracketView({ fases, cores }: { fases: FaseT[]; cores: Record<string, string> }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-3">
      {fases.map((fase, fi) => (
        <div key={fi} className="flex-shrink-0">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">{fase.nome}</p>
          <div className="flex flex-col justify-around h-full gap-4">
            {fase.partidas.map((p) => <MatchCard key={p.id} p={p} cores={cores} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function GruposView({ grupos, cores }: { grupos: GrupoT[]; cores: Record<string, string> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {grupos.map((g) => {
        const rows = calcStandings(g);
        return (
          <div key={g.nome} className="bg-background border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Grupo {g.nome}</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {["Time","J","V","E","D","GP","GC","Pts"].map(h => (
                    <th key={h} className={`py-2 font-mono text-muted-foreground uppercase tracking-wider ${h === "Time" ? "px-4 text-left" : "px-2 text-center"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.nome} className={`border-b border-border/30 last:border-0 ${i === 0 ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cores[r.nome] ?? "#666" }} />
                        <span className="font-medium text-foreground truncate max-w-[90px]">{r.nome}</span>
                        {i === 0 && <span className="text-[9px] font-mono text-primary bg-primary/15 px-1 rounded">1º</span>}
                      </div>
                    </td>
                    {[r.j, r.v, r.e, r.d, r.gp, r.gc, r.pts].map((v, vi) => (
                      <td key={vi} className={`px-2 py-2.5 text-center font-mono ${vi === 6 ? "font-bold text-foreground" : "text-muted-foreground"}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── Torneios Page ─────────────────────────────────────────────────────────

function TorneiosPage() {
  const [torneios, setTorneios] = useState<Torneio[]>(torneiosIniciais);
  const [tab, setTab] = useState<"lista" | "novo">("lista");
  const [detalhe, setDetalhe] = useState<Torneio | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Novo torneio form
  const [form, setForm] = useState<{
    nome: string; formato: "grupos" | "mata-mata"; numGrupos: number; timesSel: string[];
  }>({ nome: "", formato: "mata-mata", numGrupos: 2, timesSel: [] });
  const [formErro, setFormErro] = useState("");

  // Sorteio state
  const [sorteioFase, setSorteioFase] = useState<"idle" | "rodando" | "pronto">("idle");
  const [sorteioReveal, setSorteioReveal] = useState(0);
  const [sorteioData, setSorteioData] = useState<string[][]>([]); // groups or bracket rounds

  const timesCadastrados = ["Raça FC", "Arena Warriors", "Planeta Stars", "Speed United"];

  // Torneio detalhe sincronizado com state
  const torneioAtual = detalhe ? torneios.find(t => t.id === detalhe.id) ?? detalhe : null;

  function handleCriarTorneio(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Informe o nome do torneio"); return; }
    if (form.timesSel.length < 2) { setFormErro("Selecione ao menos 2 times"); return; }
    setFormErro("");
    const novo: Torneio = {
      id: Date.now(), nome: form.nome.trim(), formato: form.formato,
      status: "aguardando", times: form.timesSel,
      cores: Object.fromEntries(form.timesSel.map(t => [t, T_CORES[t] ?? "#888"])),
      numGrupos: form.numGrupos, artilheiros: [],
      data: new Date().toISOString().split("T")[0],
    };
    setTorneios(prev => [novo, ...prev]);
    setSucesso(true);
    setTimeout(() => { setSucesso(false); setTab("lista"); setDetalhe(novo); }, 1600);
  }

  function iniciarSorteio(torneio: Torneio) {
    const shuffled = [...torneio.times].sort(() => Math.random() - 0.5);
    let layout: string[][];

    if (torneio.formato === "grupos") {
      const ng = torneio.numGrupos ?? 2;
      layout = Array.from({ length: ng }, () => [] as string[]);
      shuffled.forEach((t, i) => layout[i % ng].push(t));
    } else {
      // mata-mata: pairs for first round
      layout = [];
      for (let i = 0; i < shuffled.length; i += 2)
        layout.push([shuffled[i], shuffled[i + 1] ?? "A definir"]);
    }

    setSorteioData(layout);
    setSorteioReveal(0);
    setSorteioFase("rodando");

    let count = 0;
    const total = shuffled.length;
    const id = setInterval(() => {
      count++;
      setSorteioReveal(count);
      if (count >= total) {
        clearInterval(id);
        setTimeout(() => {
          setSorteioFase("pronto");
          // Persist the draw into tournament state
          setTorneios(prev => prev.map(t => {
            if (t.id !== torneio.id) return t;
            if (torneio.formato === "grupos") {
              const grupos: GrupoT[] = layout.map((times, i) => ({
                nome: String.fromCharCode(65 + i),
                times,
                partidas: [],
              }));
              return { ...t, status: "em-andamento", grupos };
            } else {
              const fases: FaseT[] = [{
                nome: layout.length <= 2 ? "Semifinais" : "Quartas de Final",
                partidas: layout.map((pair, i) => ({
                  id: Date.now() + i,
                  timeA: pair[0], timeB: pair[1] ?? "A definir",
                  golsA: null, golsB: null,
                })),
              }, { nome: "Final", partidas: [{ id: Date.now() + 99, timeA: "A definir", timeB: "A definir", golsA: null, golsB: null }] }];
              return { ...t, status: "em-andamento", fases };
            }
          }));
        }, 400);
      }
    }, 550);
  }

  const statusCfg = {
    "aguardando":    { cls: "bg-[#ffd600]/10 text-[#ffd600] border-[#ffd600]/25", label: "Aguardando sorteio" },
    "em-andamento":  { cls: "bg-[#00B4D4]/10 text-[#00B4D4] border-[#00B4D4]/25", label: "Em andamento" },
    "encerrado":     { cls: "bg-primary/10 text-primary border-primary/25", label: "Encerrado" },
  };

  // ── Detail view ────────────────────────────────────────────────────────
  if (torneioAtual) {
    const T = torneioAtual;
    const cfg = statusCfg[T.status];
    const aguardando = T.status === "aguardando";

    // Count how many team slots are revealed (sorteio animation)
    let revealedSlots = 0;
    if (sorteioFase !== "idle") {
      let acc = 0;
      sorteioData.forEach(g => {
        g.forEach((_, gi) => {
          if (acc < sorteioReveal) { revealedSlots++; acc++; }
        });
      });
    }

    return (
      <div className="space-y-6">
        {/* Back + header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <button onClick={() => { setDetalhe(null); setSorteioFase("idle"); setSorteioReveal(0); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Todos os torneios
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-display font-semibold text-foreground tracking-tight">{T.nome}</h1>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded border border-border">
                  {T.formato === "grupos" ? "Chave de grupos" : "Mata-mata"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{T.times.length} times · {new Date(T.data).toLocaleDateString("pt-BR")}</p>
            </div>
            {T.campeao && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-xl px-4 py-2.5">
                <Crown className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Campeão</p>
                  <p className="text-sm font-display font-semibold text-primary">{T.campeao}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sorteio section */}
        {aguardando && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shuffle className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Sorteio</h2>
            </div>

            {sorteioFase === "idle" && (
              <div className="text-center py-8">
                <div className="flex justify-center gap-2 mb-6 flex-wrap">
                  {T.times.map((t) => (
                    <div key={t} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.cores[t] ?? "#666" }} />
                      <span className="text-xs font-medium text-foreground">{t}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => iniciarSorteio(T)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Shuffle className="w-4 h-4" /> Realizar Sorteio
                </motion.button>
              </div>
            )}

            {(sorteioFase === "rodando" || sorteioFase === "pronto") && (
              <div>
                <div className={`grid gap-4 ${T.formato === "grupos" ? `sm:grid-cols-${Math.min(sorteioData.length, 4)}` : "flex flex-wrap gap-4"}`}>
                  {sorteioData.map((slot, si) => {
                    const label = T.formato === "grupos"
                      ? `Grupo ${String.fromCharCode(65 + si)}`
                      : `Confronto ${si + 1}`;
                    return (
                      <div key={si} className="bg-background border border-border rounded-xl overflow-hidden min-w-[140px]">
                        <div className="px-3 py-2 border-b border-border/50">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</p>
                        </div>
                        <div className="p-3 space-y-2">
                          {slot.map((time, ti) => {
                            const globalIdx = sorteioData.slice(0, si).reduce((acc, g) => acc + g.length, 0) + ti;
                            const revealed = globalIdx < sorteioReveal;
                            return (
                              <AnimatePresence key={ti}>
                                {revealed ? (
                                  <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="flex items-center gap-2"
                                  >
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: T.cores[time] ?? "#666" }} />
                                    <span className="text-xs font-medium text-foreground">{time}</span>
                                  </motion.div>
                                ) : (
                                  <div className="h-5 bg-muted rounded animate-pulse" />
                                )}
                              </AnimatePresence>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sorteioFase === "pronto" && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-center text-sm text-primary font-medium mt-4">
                    Sorteio concluído! O torneio está em andamento.
                  </motion.p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Groups / Bracket */}
        {!aguardando && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {T.formato === "grupos" ? "Chave de Grupos" : "Chave"}
            </h2>
            {T.formato === "grupos" && T.grupos && <GruposView grupos={T.grupos} cores={T.cores} />}
            {T.fases && T.fases.length > 0 && (
              <div className={T.formato === "grupos" ? "mt-5 pt-5 border-t border-border" : ""}>
                {T.formato === "grupos" && <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Fase final</p>}
                <BracketView fases={T.fases.filter(f => T.formato !== "grupos" || f.nome !== "Final" || T.formato === "grupos")} cores={T.cores} />
              </div>
            )}
            {T.formato === "mata-mata" && T.fases && <BracketView fases={T.fases} cores={T.cores} />}
          </motion.div>
        )}

        {/* Artilheiros */}
        {T.artilheiros.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Artilheiros</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["#", "Jogador", "Time", "Gols"].map((h, i) => (
                    <th key={i} className="text-left text-xs font-mono text-muted-foreground px-5 py-3 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {T.artilheiros.sort((a, b) => b.gols - a.gols).map((a, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`font-mono text-xs font-bold ${i === 0 ? "text-[#ffd600]" : i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ backgroundColor: `${T.cores[a.time] ?? "#666"}25`, color: T.cores[a.time] ?? "#666" }}>
                          {a.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.cores[a.time] ?? "#666" }} />
                        <span className="text-xs text-muted-foreground">{a.time}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(a.gols, 8) }).map((_, gi) => (
                          <div key={gi} className="w-2 h-2 rounded-full bg-primary" />
                        ))}
                        <span className="font-display font-bold text-primary ml-1">{a.gols}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    );
  }

  // ── Main list / novo ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Competições</p>
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground mt-1 tracking-tight">Torneios</h1>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setTab("novo")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Novo Torneio
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["lista", "novo"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSucesso(false); }}
            className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === t && <motion.span layoutId="torneios-tab" className="absolute inset-0 bg-card border border-border rounded-lg shadow-sm" style={{ zIndex: 0 }} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative z-10 flex items-center gap-2">
              {t === "lista" ? <><Trophy className="w-3.5 h-3.5" /> Torneios</> : <><Plus className="w-3.5 h-3.5" /> Novo Torneio</>}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "lista" ? (
          <motion.div key="lista" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {torneios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl text-muted-foreground">
                <Trophy className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum torneio criado</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {torneios.map((t, i) => {
                  const cfg = statusCfg[t.status];
                  const top = t.artilheiros[0];
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      whileHover={{ y: -3, transition: { type: "spring", stiffness: 400 } }}
                      onClick={() => { setDetalhe(t); setSorteioFase("idle"); setSorteioReveal(0); }}
                      className="bg-card border border-border rounded-xl p-5 text-left flex flex-col gap-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-foreground text-base leading-tight">{t.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{new Date(t.data).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded flex items-center gap-1">
                          {t.formato === "grupos" ? <LayoutGrid className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
                          {t.formato === "grupos" ? "Grupos" : "Mata-mata"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {t.times.length} times
                        </span>
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        {t.times.map(nome => (
                          <div key={nome} className="w-2 h-2 rounded-full" style={{ backgroundColor: t.cores[nome] ?? "#666" }} title={nome} />
                        ))}
                      </div>

                      {t.campeao && (
                        <div className="flex items-center gap-2 border-t border-border/50 pt-3">
                          <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium text-primary">{t.campeao}</span>
                        </div>
                      )}
                      {top && !t.campeao && (
                        <div className="flex items-center gap-2 border-t border-border/50 pt-3">
                          <Star className="w-3 h-3 text-[#ffd600] flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">{top.nome} · <span className="text-foreground font-medium">{top.gols} gols</span></span>
                        </div>
                      )}

                      <div className="flex items-center justify-end text-primary">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="novo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AnimatePresence>
              {sucesso && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-primary/10 border border-primary/25 text-primary rounded-lg px-4 py-3 mb-4 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Torneio criado! Redirecionando...
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-w-2xl bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-1">Criar Novo Torneio</h2>
              <p className="text-xs text-muted-foreground mb-6">Configure o formato, selecione os times e inicie o sorteio.</p>

              <form onSubmit={handleCriarTorneio} className="space-y-6">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Nome do Torneio</label>
                  <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Copa Inverno 2025"
                    className="w-full bg-input-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors" />
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Formato</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["mata-mata", "grupos"] as const).map(fmt => (
                      <button key={fmt} type="button" onClick={() => setForm(f => ({ ...f, formato: fmt }))}
                        className={`relative border rounded-xl p-4 text-left transition-all ${form.formato === fmt ? "border-primary bg-primary/10" : "border-border hover:border-foreground/20"}`}>
                        {form.formato === fmt && <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-primary-foreground" /></div>}
                        <div className="mb-2">
                          {fmt === "mata-mata" ? <Swords className="w-5 h-5 text-primary" /> : <LayoutGrid className="w-5 h-5 text-primary" />}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{fmt === "mata-mata" ? "Mata-mata" : "Chave de Grupos"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmt === "mata-mata" ? "Eliminação direta. Perdeu, saiu." : "Times disputam em grupos antes do mata-mata."}
                        </p>
                        {fmt === "grupos" && form.formato === "grupos" && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Nº de grupos:</span>
                            {[2, 3, 4].map(n => (
                              <button key={n} type="button" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, numGrupos: n })); }}
                                className={`w-6 h-6 rounded text-xs font-mono transition-all ${form.numGrupos === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                {n}
                              </button>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Times */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                    Times Participantes <span className="text-muted-foreground/50">({form.timesSel.length} selecionado{form.timesSel.length !== 1 ? "s" : ""})</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {timesCadastrados.map(t => {
                      const sel = form.timesSel.includes(t);
                      return (
                        <button key={t} type="button"
                          onClick={() => setForm(f => ({ ...f, timesSel: sel ? f.timesSel.filter(x => x !== t) : [...f.timesSel, t] }))}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${sel ? "border-primary/40 bg-primary/10" : "border-border hover:border-foreground/20"}`}>
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: T_CORES[t] ?? "#666" }} />
                          <span className={sel ? "text-foreground font-medium" : "text-muted-foreground"}>{t}</span>
                          {sel && <Check className="w-3 h-3 text-primary ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formErro && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErro}</p>}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setTab("lista")}
                    className="flex-1 border border-border text-muted-foreground hover:text-foreground rounded-lg py-2.5 text-sm font-medium transition-colors">
                    Cancelar
                  </button>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Criar Torneio
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Ratings helpers ───────────────────────────────────────────────────────

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const filled = Math.floor(rating / 2);
  const half   = (rating / 2) - filled >= 0.4;
  const sz = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${sz} ${i < filled ? "text-[#ffd600] fill-[#ffd600]" : i === filled && half ? "text-[#ffd600]" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// ─── Ratings Page ──────────────────────────────────────────────────────────

const ATTR_COLORS: Record<AtributoKey, string> = {
  chute: "#C41230", passe: "#00B4D4", velocidade: "#ffd600",
  drible: "#e040fb", defesa: "#43A832", fisico: "#ff6b35",
};

function AttrBar({ label, color, value, relevant }: { label: string; color: string; value: number; relevant: boolean }) {
  return (
    <div className={`flex items-center gap-2 transition-opacity ${relevant ? "opacity-100" : "opacity-30"}`}>
      <span className="text-[10px] font-mono w-20 text-right flex-shrink-0 truncate" style={{ color: relevant ? color : "#555" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }}
          animate={{ width: `${(value / 10) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ backgroundColor: relevant ? color : "#333" }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-5 tabular-nums" style={{ color: relevant ? color : "#444" }}>{value.toFixed(1)}</span>
    </div>
  );
}

function AttrSlider({ label, color, value, onChange, relevant }: {
  label: string; color: string; value: number; onChange: (n: number) => void; relevant: boolean;
}) {
  return (
    <div className={`transition-opacity ${relevant ? "opacity-100" : "opacity-40"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: relevant ? color : "#555" }}>{label}</span>
        <div className="flex items-center gap-2">
          {relevant && <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">conta</span>}
          <span className="text-sm font-display font-bold tabular-nums" style={{ color: relevant ? color : "#555" }}>{value}</span>
        </div>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }} />
    </div>
  );
}

function PlayerRatingCard({ jogador, timeCor, avaliacoes }: {
  jogador: Jogador; timeCor: string; logo?: string;
  avaliacoes: AvaliacaoJogador[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isGK = jogador.posicao === "Goleiro";

  const avgAttrs  = getAvgAtributos(jogador.id, avaliacoes);
  const avgGKAttrs = isGK ? getAvgAtributosGK(jogador.id, avaliacoes) : null;

  const fallbackAttrs: AtributosMap = { chute: 5, passe: 5, velocidade: 5, drible: 5, defesa: 5, fisico: 5 };
  const attrs = avgAttrs ?? fallbackAttrs;

  const rating = isGK
    ? calcRatingGK(avgGKAttrs ?? DEFAULT_GK_ATTRS, attrs.fisico)
    : calcRatingPesado(attrs, jogador.posicao);

  const posicaoPesos = PESOS[jogador.posicao] ?? PESOS["Meio-campo"];
  const cnt = avaliacoes.filter(a => a.avaliadoId === jogador.id).length;
  const hasData = isGK ? !!avgGKAttrs : !!avgAttrs;

  const radarData = isGK && avgGKAttrs
    ? ATRIBUTOS_GK.map(a => ({ attr: a.label.slice(0, 5), value: avgGKAttrs[a.key], fullMark: 10 }))
    : ATRIBUTOS.map(a => ({ attr: a.label.slice(0, 3), value: attrs[a.key], fullMark: 10 }));

  return (
    <motion.div layout className="bg-background border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: `${timeCor}25`, color: timeCor }}>
          {jogador.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground leading-tight">{jogador.nome}</p>
            {isGK && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border"
                style={{ borderColor: `${timeCor}40`, color: timeCor, backgroundColor: `${timeCor}12` }}>GK</span>
            )}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">{jogador.posicao} · {cnt} avaliação{cnt !== 1 ? "ões" : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 mr-2">
          <span className="font-display font-bold text-lg leading-none" style={{ color: timeCor }}>{rating.toFixed(1)}</span>
          <StarDisplay rating={rating} />
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
            <div className="border-t border-border/50 px-4 py-4">
              {isGK && (
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00B4D4]" />
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Atributos de goleiro</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center">
                  <RadarChart outerRadius={isGK ? 48 : 52} width={140} height={140} data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="attr" tick={{ fontSize: isGK ? 8 : 9, fill: "#555", fontFamily: "DM Mono" }} />
                    <Radar dataKey="value" stroke={timeCor} fill={timeCor} fillOpacity={0.2} strokeWidth={1.5}
                      dot={{ fill: timeCor, r: 2, strokeWidth: 0 }} />
                  </RadarChart>
                </div>
                <div className="space-y-1.5 justify-center flex flex-col">
                  {isGK
                    ? ATRIBUTOS_GK.map(a => (
                        <AttrBar key={a.key} label={a.label} color={ATTR_COLORS_GK[a.key]}
                          value={(avgGKAttrs ?? DEFAULT_GK_ATTRS)[a.key]} relevant={true} />
                      ))
                    : ATRIBUTOS.map(a => (
                        <AttrBar key={a.key} label={a.label} color={ATTR_COLORS[a.key]}
                          value={attrs[a.key]} relevant={!!posicaoPesos[a.key]} />
                      ))
                  }
                  {isGK && (
                    <AttrBar label="Físico" color={ATTR_COLORS.fisico} value={attrs.fisico} relevant={true} />
                  )}
                </div>
              </div>
            </div>
            {!hasData && (
              <p className="px-4 pb-3 text-[10px] text-muted-foreground/60 font-mono">* Sem avaliações — usando dados base</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const DEFAULT_ATTRS: AtributosMap = { chute: 5, passe: 5, velocidade: 5, drible: 5, defesa: 5, fisico: 5 };

function RatingsPage({ times }: { times: Time[] }) {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoJogador[]>(avaliacoesIniciais);
  const [tab, setTab] = useState<"times" | "avaliar">("times");
  const [expandido, setExpandido] = useState<number | null>(times[0]?.id ?? null);

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [avaliadorId, setAvaliadorId] = useState<number | null>(null);
  const [contexto, setContexto] = useState("");
  const [notas, setNotas] = useState<Record<number, AtributosMap>>({});
  const [notasGK, setNotasGK] = useState<Record<number, AtributosGKMap>>({});
  const [sucesso, setSucesso] = useState(false);
  const [formErro, setFormErro] = useState("");

  const todosJogadores = times.flatMap(t => t.jogadores.map(j => ({ ...j, timeId: t.id, timeNome: t.nome, timeCor: t.cor })));
  const avaliador = avaliadorId ? todosJogadores.find(j => j.id === avaliadorId) : null;
  const timeDo = avaliador ? times.find(t => t.id === avaliador.timeId) : null;
  const colegas = timeDo ? timeDo.jogadores.filter(j => j.id !== avaliadorId) : [];

  function initNotas() {
    const n: Record<number, AtributosMap> = {};
    const ngk: Record<number, AtributosGKMap> = {};
    colegas.forEach(j => {
      n[j.id] = { ...DEFAULT_ATTRS };
      if (j.posicao === "Goleiro") ngk[j.id] = { ...DEFAULT_GK_ATTRS };
    });
    setNotas(n);
    setNotasGK(ngk);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!avaliadorId) { setFormErro("Selecione quem você é"); return; }
    if (!contexto.trim()) { setFormErro("Informe o contexto da partida"); return; }
    if (colegas.length === 0) { setFormErro("Sem colegas para avaliar"); return; }
    setFormErro("");
    const novasAvaliacoes: AvaliacaoJogador[] = colegas.map((j, i) => ({
      id: Date.now() + i,
      avaliadorId: avaliadorId!,
      avaliadoId: j.id,
      timeId: timeDo!.id,
      atributos: notas[j.id] ?? { ...DEFAULT_ATTRS },
      atributosGK: j.posicao === "Goleiro" ? (notasGK[j.id] ?? { ...DEFAULT_GK_ATTRS }) : undefined,
      contexto: contexto.trim(),
      data: new Date().toISOString().split("T")[0],
    }));
    setAvaliacoes(prev => [...prev, ...novasAvaliacoes]);
    setSucesso(true);
    setTimeout(() => {
      setSucesso(false); setStep(1); setAvaliadorId(null);
      setContexto(""); setNotas({}); setNotasGK({}); setTab("times");
      setExpandido(timeDo?.id ?? null);
    }, 1800);
  }

  const recentes = [...avaliacoes].sort((a, b) => b.id - a.id).slice(0, 6);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Avaliação por pares · ponderada por posição</p>
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground mt-1 tracking-tight">Ratings</h1>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setTab("avaliar"); setStep(1); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Star className="w-4 h-4" /> Avaliar Partida
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["times", "avaliar"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSucesso(false); if (t === "avaliar") setStep(1); }}
            className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === t && <motion.span layoutId="ratings-tab" className="absolute inset-0 bg-card border border-border rounded-lg shadow-sm" style={{ zIndex: 0 }} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative z-10 flex items-center gap-2">
              {t === "times" ? <><Shield className="w-3.5 h-3.5" /> Por Time</> : <><Star className="w-3.5 h-3.5" /> Avaliar</>}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "times" ? (
          <motion.div key="times-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="grid lg:grid-cols-3 gap-5">

            {/* Teams accordion */}
            <div className="lg:col-span-2 space-y-4">
              {times.map((time, ti) => (
                <motion.div key={time.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ti * 0.06 }}
                  className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Team header */}
                  <button onClick={() => setExpandido(expandido === time.id ? null : time.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors text-left">
                    {time.logo
                      ? <img src={time.logo} alt={time.nome} className="w-8 h-8 object-contain rounded flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: `${time.cor}25`, color: time.cor }}>
                          {time.nome.slice(0, 2).toUpperCase()}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-foreground">{time.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{time.jogadores.length} jogadores</p>
                    </div>
                    {time.jogadores.length > 0 && (() => {
                      const ratings = time.jogadores.map(j => {
                        const a = getAvgAtributos(j.id, avaliacoes);
                        return a ? calcRatingPesado(a, j.posicao) : j.rating;
                      });
                      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
                      return (
                        <div className="flex items-center gap-2 mr-3">
                          <StarDisplay rating={avg} />
                          <span className="font-mono font-bold text-sm" style={{ color: time.cor }}>{avg.toFixed(1)}</span>
                        </div>
                      );
                    })()}
                    <motion.div animate={{ rotate: expandido === time.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandido === time.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
                        <div className="border-t border-border p-4 grid sm:grid-cols-2 gap-3">
                          {time.jogadores.map(j => (
                            <PlayerRatingCard key={j.id} jogador={j} timeCor={time.cor} logo={time.logo} avaliacoes={avaliacoes} />
                          ))}
                          {time.jogadores.length === 0 && (
                            <p className="text-xs text-muted-foreground col-span-2 py-4 text-center">Nenhum jogador cadastrado</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Sidebar: legend + recent */}
            <div className="space-y-4">
              {/* Position weights legend */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Peso por posição</p>
                <div className="space-y-3">
                  {Object.entries(PESOS).map(([pos, pesos]) => (
                    <div key={pos}>
                      <p className="text-xs font-medium text-foreground mb-1.5">{pos}</p>
                      <div className="flex flex-wrap gap-1">
                        {ATRIBUTOS.map(a => {
                          const p = pesos[a.key] ?? 0;
                          if (!p) return null;
                          return (
                            <span key={a.key} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${ATTR_COLORS[a.key]}20`, color: ATTR_COLORS[a.key] }}>
                              {a.label} ×{p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent evaluations */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Avaliações recentes</p>
                {recentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma avaliação ainda</p>
                ) : (
                  <ul className="space-y-2.5">
                    {recentes.map(av => {
                      const avaliado = todosJogadores.find(j => j.id === av.avaliadoId);
                      if (!avaliado) return null;
                      const rating = calcRatingPesado(av.atributos, avaliado.posicao);
                      return (
                        <li key={av.id} className="flex items-center gap-2.5 py-2 border-b border-border/40 last:border-0">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{ backgroundColor: `${avaliado.timeCor}25`, color: avaliado.timeCor }}>
                            {avaliado.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{avaliado.nome}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{av.contexto}</p>
                          </div>
                          <span className="font-mono font-bold text-sm flex-shrink-0" style={{ color: avaliado.timeCor }}>{rating.toFixed(1)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="avaliar-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AnimatePresence>
              {sucesso && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-primary/10 border border-primary/25 text-primary rounded-lg px-4 py-3 mb-4 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Avaliações enviadas! Ratings atualizados.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-w-lg bg-card border border-border rounded-xl p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      step > s ? "bg-primary text-primary-foreground" : step === s ? "bg-primary/20 text-primary border border-primary" : "bg-muted text-muted-foreground"
                    }`}>{step > s ? <Check className="w-3 h-3" /> : s}</div>
                    {s < 3 && <div className={`h-px w-8 transition-colors ${step > s ? "bg-primary" : "bg-border"}`} />}
                  </div>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {step === 1 ? "Identificação" : step === 2 ? "Partida" : "Avaliação"}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-foreground mb-1">Quem é você?</h2>
                        <p className="text-xs text-muted-foreground mb-4">Selecione seu nome para começar a avaliação.</p>
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {times.map(time => (
                            <div key={time.id}>
                              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: time.cor }} />
                                {time.nome}
                              </p>
                              <div className="space-y-1 mb-2">
                                {time.jogadores.map(j => (
                                  <button key={j.id} type="button" onClick={() => setAvaliadorId(j.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                                      avaliadorId === j.id ? "border-primary/40 bg-primary/10 text-foreground font-medium" : "border-border hover:border-foreground/20 text-muted-foreground"
                                    }`}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                      style={{ backgroundColor: `${time.cor}25`, color: time.cor }}>
                                      {j.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                    </div>
                                    {j.nome}
                                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{j.posicao}</span>
                                    {avaliadorId === j.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button type="button" disabled={!avaliadorId} onClick={() => avaliadorId && setStep(2)}
                        className="w-full bg-primary disabled:opacity-40 text-primary-foreground rounded-lg py-2.5 text-sm font-semibold transition-colors hover:bg-primary/90">
                        Continuar
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-foreground mb-1">Após qual partida?</h2>
                        <p className="text-xs text-muted-foreground mb-4">
                          Avaliando como <span className="text-foreground font-medium">{avaliador?.nome}</span> — {timeDo?.nome}
                        </p>
                        <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Descrição da partida</label>
                        <input type="text" value={contexto} onChange={e => setContexto(e.target.value)}
                          placeholder="Ex: Copa Verão 2025 – Semifinal"
                          className="w-full bg-input-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors" />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(1)}
                          className="flex-1 border border-border text-muted-foreground hover:text-foreground rounded-lg py-2.5 text-sm font-medium transition-colors">
                          Voltar
                        </button>
                        <button type="button" disabled={!contexto.trim()}
                          onClick={() => { if (contexto.trim()) { initNotas(); setStep(3); } }}
                          className="flex-1 bg-primary disabled:opacity-40 text-primary-foreground rounded-lg py-2.5 text-sm font-semibold transition-colors hover:bg-primary/90">
                          Continuar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-6">
                      <div>
                        <h2 className="text-base font-semibold text-foreground mb-1">Avalie atributo por atributo</h2>
                        <p className="text-xs text-muted-foreground mb-5">
                          Atributos marcados como <span className="text-primary font-medium">conta</span> são ponderados pela posição. Goleiros têm seção própria.
                        </p>
                        <div className="space-y-6">
                          {colegas.map((j, ji) => {
                            const isGK = j.posicao === "Goleiro";
                            const posicaoPesos = PESOS[j.posicao] ?? PESOS["Meio-campo"];
                            const jNotas   = notas[j.id]   ?? { ...DEFAULT_ATTRS };
                            const jNotasGK = notasGK[j.id] ?? { ...DEFAULT_GK_ATTRS };
                            const previewRating = isGK
                              ? calcRatingGK(jNotasGK, jNotas.fisico)
                              : calcRatingPesado(jNotas, j.posicao);
                            const cor = timeDo?.cor ?? "#43A832";
                            return (
                              <motion.div key={j.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ji * 0.06 }}
                                className="bg-background/50 border border-border rounded-xl overflow-hidden">
                                {/* Player header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                    style={{ backgroundColor: `${cor}25`, color: cor }}>
                                    {j.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-sm font-semibold text-foreground">{j.nome}</p>
                                      {isGK && (
                                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border"
                                          style={{ borderColor: `${cor}40`, color: cor, backgroundColor: `${cor}12` }}>GK</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-mono text-muted-foreground">{j.posicao}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-mono text-muted-foreground">prévia</p>
                                    <span className="font-display font-bold text-xl leading-none" style={{ color: cor }}>{previewRating.toFixed(1)}</span>
                                  </div>
                                </div>

                                {/* GK-specific attrs */}
                                {isGK && (
                                  <div className="px-4 pt-3 pb-2">
                                    <p className="text-[10px] font-mono text-[#00B4D4] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00B4D4]" />
                                      Atributos de Goleiro
                                    </p>
                                    <div className="space-y-3">
                                      {ATRIBUTOS_GK.map(a => (
                                        <AttrSlider key={a.key} label={a.label} color={ATTR_COLORS_GK[a.key]}
                                          value={jNotasGK[a.key]} relevant={true}
                                          onChange={v => setNotasGK(prev => ({ ...prev, [j.id]: { ...(prev[j.id] ?? DEFAULT_GK_ATTRS), [a.key]: v } }))} />
                                      ))}
                                    </div>
                                    <div className="border-t border-border/50 mt-3 pt-3">
                                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Físico (geral)</p>
                                      <AttrSlider label="Físico" color={ATTR_COLORS.fisico} value={jNotas.fisico} relevant={true}
                                        onChange={v => setNotas(prev => ({ ...prev, [j.id]: { ...(prev[j.id] ?? DEFAULT_ATTRS), fisico: v } }))} />
                                    </div>
                                  </div>
                                )}

                                {/* Regular attrs (non-GK) */}
                                {!isGK && (
                                  <div className="px-4 py-3 space-y-3">
                                    {ATRIBUTOS.map(a => (
                                      <AttrSlider key={a.key} label={a.label} color={ATTR_COLORS[a.key]} value={jNotas[a.key]}
                                        onChange={v => setNotas(prev => ({ ...prev, [j.id]: { ...(prev[j.id] ?? DEFAULT_ATTRS), [a.key]: v } }))}
                                        relevant={!!(posicaoPesos[a.key] ?? 0)} />
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                      {formErro && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErro}</p>}
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(2)}
                          className="flex-1 border border-border text-muted-foreground hover:text-foreground rounded-lg py-2.5 text-sm font-medium transition-colors">
                          Voltar
                        </button>
                        <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                          Enviar Avaliações
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [times, setTimes] = useState<Time[]>(timesIniciais);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-5 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3 max-w-sm">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 w-full">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar jogador, reserva..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
            </motion.button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              AM
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <AnimatePresence mode="wait">
            {currentPage === "dashboard" ? (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <DashboardPage />
              </motion.div>
            ) : currentPage === "reservas" ? (
              <motion.div key="reservas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <ReservasPage />
              </motion.div>
            ) : currentPage === "jogadores" ? (
              <motion.div key="jogadores" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <JogadoresPage times={times} setTimes={setTimes} />
              </motion.div>
            ) : currentPage === "torneios" ? (
              <motion.div key="torneios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <TorneiosPage />
              </motion.div>
            ) : (
              <motion.div key="ratings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <RatingsPage times={times} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
