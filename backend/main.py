import random
import uuid
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Literal, Optional, Tuple, Any
import itertools
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import pyreadr
except ImportError:
    pyreadr = None

app = FastAPI(
    title="IGT Analyser Backend",
    description="API do analizy IGT (RData + Cannabis Dataset) z modułem AI (MPC).",
    version="4.0.0",
)

origins = ["http://localhost:3000", "http://localhost"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBALNY MAGAZYN DANYCH ---
DATA_STORE = {
    "choices": None, "wins": None, "losses": None, "meta": []
}

# --- MODELE DANYCH ---
DeckId = Literal["A", "B", "C", "D"]

class LastMove(BaseModel):
    deck: DeckId; gain: int; loss: int; net: int

class ChoiceRequest(BaseModel):
    session_id: str; deck_id: DeckId

class GameStateResponse(BaseModel):
    session_id: str; score: int; turn: int
    last_move: Optional[LastMove] = None; is_game_ended: bool

class GameSession(BaseModel):
    session_id: str; score: int = 2000; turn: int = 0
    decks: Dict[DeckId, List[Tuple[int, int]]]
    deck_counters: Dict[DeckId, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
    last_move: Optional[LastMove] = None; is_game_ended: bool = False

game_sessions: Dict[str, GameSession] = {}

class TrialData(BaseModel):
    trial: int; deck: str
    win: int; loss: int; net: int; total_score: int

class SubjectHistoryResponse(BaseModel):
    subject_index: int; source_study: str; history: List[TrialData]

class SimilarityMetrics(BaseModel):
    exact_match_ratio: float
    good_bad_match_ratio: float
    capital_rmse: float
    human_entropy: float      # Jak bardzo chaotyczny był człowiek (0-2)
    ai_entropy: float         # Jak bardzo chaotyczne było AI
    cumulative_regret: int    # Ile łącznie punktów człowiek stracił względem AI
    wsls_ratio: float         # % zgodności strategii Win-Stay-Lose-Shift

class ComparisonResponse(BaseModel):
    subject_data: SubjectHistoryResponse
    mpc_data: List[TrialData]
    metrics: SimilarityMetrics

class SubjectListElement(BaseModel):
    index: int; source_study: str; total_trials: int

class AnalysisResponse(BaseModel):
    total_subjects: int; subjects_list: List[SubjectListElement]

def _get_standard_scheme_cards(deck_id: str, start_index: int, count: int) -> List[Tuple[int, int]]:
    # Deck A Losses (40 trials sequence)
    # T3=-150, T5=-300, T7=-200, T9=-250, T10=-350, T12=-350, T14=-250, T15=-200
    # T17=-300, T18=-150, T22=-300, T24=-350, T26=-200, T27=-250, T28=-150
    # T31=-350, T32=-200, T33=-250, T37=-150, T38=-300
    A_losses = [0] * 40
    for idx, val in [
        (3, -150), (5, -300), (7, -200), (9, -250), (10, -350), 
        (12, -350), (14, -250), (15, -200), (17, -300), (18, -150),
        (22, -300), (24, -350), (26, -200), (27, -250), (28, -150),
        (31, -350), (32, -200), (33, -250), (37, -150), (38, -300)
    ]:
        A_losses[idx-1] = val 

    # Deck B Losses (40 trials sequence)
    # T9=-1250, T14=-1250, T21=-1250, T32=-1250
    B_losses = [0] * 40
    for idx, val in [(9, -1250), (14, -1250), (21, -1250), (32, -1250)]:
        B_losses[idx-1] = val

    # Deck C Losses (40 trials sequence)
    # T3=-50, T5=-50, T7=-50, T9=-50, T10=-50, T12=-25, T13=-75, T17=-25, T18=-75
    # T20=-50, T24=-50, T25=-25, T26=-50, T29=-75, T30=-50, T34=-25, T35=-25
    # T37=-75, T39=-50, T40=-75
    C_losses = [0] * 40
    for idx, val in [
        (3, -50), (5, -50), (7, -50), (9, -50), (10, -50), (12, -25), (13, -75),
        (17, -25), (18, -75), (20, -50), (24, -50), (25, -25), (26, -50),
        (29, -75), (30, -50), (34, -25), (35, -25), (37, -75), (39, -50), (40, -75)
    ]:
        C_losses[idx-1] = val

    # Deck D Losses (40 trials sequence)
    # T10=-250, T20=-250, T29=-250, T35=-250
    D_losses = [0] * 40
    for idx, val in [(10, -250), (20, -250), (29, -250), (35, -250)]:
        D_losses[idx-1] = val

    schemes = {
        "A": [(100, l) for l in A_losses],
        "B": [(100, l) for l in B_losses],
        "C": [(50, l) for l in C_losses],
        "D": [(50, l) for l in D_losses],
    }
    
    source_seq = schemes.get(deck_id, [(0,0)])
    seq_len = len(source_seq)
    
    result = []
    for i in range(count):
        curr_idx = (start_index + i) % seq_len
        result.append(source_seq[curr_idx])
        
    return result

def _reconstruct_environment_from_human(c_row, w_row, l_row) -> Dict[str, List[Tuple[int, int]]]:
    deck_map_inv = {1: "A", 2: "B", 3: "C", 4: "D"}
    
    human_cards = {"A": [], "B": [], "C": [], "D": []}
    
    for i in range(len(c_row)):
        c = c_row.get(i)
        if pd.isna(c): continue
        d_char = deck_map_inv.get(int(c))
        if d_char:
            w = int(w_row.get(i)) if not pd.isna(w_row.get(i)) else 0
            l = int(l_row.get(i)) if not pd.isna(l_row.get(i)) else 0
            human_cards[d_char].append((w, l))
            
    ai_decks = {}
    max_trials = 150
    
    for d_char in ["A", "B", "C", "D"]:
        real_segment = human_cards[d_char]
        already_drawn = len(real_segment)
        
        needed = max_trials - already_drawn
        if needed > 0:
            filler_segment = _get_standard_scheme_cards(d_char, already_drawn, needed)
            ai_decks[d_char] = real_segment + filler_segment
        else:
            ai_decks[d_char] = real_segment[:max_trials]
            
    return ai_decks

class ReplayedEnvironment:
    def __init__(self, reconstructed_decks):
        self.decks = reconstructed_decks
        self.counters = {"A": 0, "B": 0, "C": 0, "D": 0}
        
    def step(self, deck_id):
        idx = self.counters[deck_id]
        if idx >= len(self.decks[deck_id]):
            idx = 0
        gain, loss = self.decks[deck_id][idx]
        self.counters[deck_id] += 1
        return gain, loss, gain + loss

class StochasticMPCAgent:
    def __init__(self, strategy: str = "optimal"):
        self.deck_ids = ["A", "B", "C", "D"]
        self.strategy = strategy
        
        self.means = np.zeros(4)
        self.variances = np.ones(4) * 1000 
        self.counts = np.zeros(4) 
        self.history = {d: [] for d in self.deck_ids}
        
        self.loss_aversion = 4.9 if strategy == "human" else 1.0
        self.learning_rate = 0.3 if strategy == "human" else None
        
        self.planning_horizon = 2
        self.info_value_weight = 0.8 # ciekawosc

        # self.loss_aversion = 0.9 if strategy == "human" else 1.0
        # self.learning_rate = 0.3 if strategy == "human" else None
        
        # self.planning_horizon = 3
        # self.info_value_weight = 2 # ciekawosc

    def select_action(self):

        best_first_action = self.deck_ids[0]
        best_path_value = -float('inf')

        trajectories = itertools.product(range(4), repeat=self.planning_horizon)

        for path in trajectories:
            sim_means = self.means.copy()
            sim_vars = self.variances.copy()
            sim_counts = self.counts.copy()
            
            cumulative_utility = 0
            
            for deck_idx in path:
                expected_reward = sim_means[deck_idx]
                
                info_gain = np.sqrt(sim_vars[deck_idx])
                
                step_value = expected_reward + (self.info_value_weight * info_gain)
                cumulative_utility += step_value
                
                sim_counts[deck_idx] += 1
                n = max(1, sim_counts[deck_idx])
                
                sim_vars[deck_idx] *= (n / (n + 1)) 

            if cumulative_utility > best_path_value:
                best_path_value = cumulative_utility
                best_first_action = self.deck_ids[path[0]]

        return best_first_action

    def update_model(self, deck_id, net_result):
        idx = self.deck_ids.index(deck_id)
        self.counts[idx] += 1
        
        gain = 100 if deck_id in ["A", "B"] else 50
        real_loss = gain - net_result
        utility = gain - (real_loss * self.loss_aversion)
        
        self.history[deck_id].append(utility)
        current_data = self.history[deck_id]
        
        if self.strategy == "optimal":
            self.means[idx] = np.mean(current_data)
            if len(current_data) > 1:
                self.variances[idx] = np.var(current_data, ddof=1)
            else:
                self.variances[idx] = 1000
        else:
            old_mean = self.means[idx]
            self.means[idx] = old_mean + self.learning_rate * (utility - old_mean)
            if len(current_data) > 1:
                window = current_data[-20:]
                self.variances[idx] = np.var(window, ddof=1) if len(window) > 1 else 1000
            else:
                self.variances[idx] = 1000

# --- ŁADOWANIE DANYCH ---

def _load_cannabis_data() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, List[str]]:
    if not os.path.exists("cannabis_raw.txt"):
        return None, None, None, []
    
    print("Wykryto cannabis_raw.txt - przetwarzanie...")
    try:
        df = pd.read_csv("cannabis_raw.txt", sep=r'\s+', engine='python')
        required = ['subjID', 'trial', 'deck', 'gain', 'loss']
        if not all(col in df.columns for col in required):
            return None, None, None, []

        c_pivot = df.pivot(index='subjID', columns='trial', values='deck')
        w_pivot = df.pivot(index='subjID', columns='trial', values='gain')
        l_pivot = df.pivot(index='subjID', columns='trial', values='loss')
        
        # Konwersja strat na ujemne
        l_pivot = -l_pivot.abs()
        
        meta_list = [f"Cannabis User {sid}" for sid in c_pivot.index]
        
        # Reset indeksów
        for p in [c_pivot, w_pivot, l_pivot]:
            p.reset_index(drop=True, inplace=True)
            p.columns = range(p.shape[1])
        
        print(f" -> Załadowano {len(c_pivot)} użytkowników konopii.")
        return c_pivot, w_pivot, l_pivot, meta_list
    except Exception as e:
        print(f"Błąd cannabis_raw.txt: {e}")
        return None, None, None, []

def _ensure_data_loaded():
    if DATA_STORE["choices"] is not None: return

    list_choices, list_wins, list_losses, list_meta = [], [], [], []

    # 1. RData
    file_path = "IGTdata.rdata"
    if os.path.exists(file_path) and pyreadr:
        print(f"Ładowanie {file_path}...")
        r_objects = pyreadr.read_r(file_path)
        studies = [("95", "choice_95", "wi_95", "lo_95"), 
                   ("100", "choice_100", "wi_100", "lo_100"), 
                   ("150", "choice_150", "wi_150", "lo_150")]
        
        for nm, kc, kw, kl in studies:
            if kc in r_objects:
                c, w, l = r_objects[kc].copy(), r_objects[kw].copy(), r_objects[kl].copy()
                c.columns = range(c.shape[1]); w.columns = range(w.shape[1]); l.columns = range(l.shape[1])
                list_choices.append(c); list_wins.append(w); list_losses.append(l)
                list_meta.extend([f"Study {nm}"]*len(c))

    # 2. Cannabis
    c_can, w_can, l_can, m_can = _load_cannabis_data()
    if c_can is not None:
        list_choices.append(c_can); list_wins.append(w_can); list_losses.append(l_can); list_meta.extend(m_can)

    # 3. CSV Fallback
    if not list_choices:
        if os.path.exists("choice_95.csv"):
             df = pd.read_csv("choice_95.csv")
             numeric = [c for c in df.columns if "choice" in str(c).lower()]
             if numeric: df = df[numeric]
             df.columns = range(df.shape[1])
             DATA_STORE["choices"] = df
             DATA_STORE["wins"] = pd.DataFrame(np.zeros(df.shape), columns=df.columns)
             DATA_STORE["losses"] = pd.DataFrame(np.zeros(df.shape), columns=df.columns)
             DATA_STORE["meta"] = ["csv_import"] * len(df)
             return
        raise HTTPException(404, "Nie znaleziono danych.")

    DATA_STORE["choices"] = pd.concat(list_choices, ignore_index=True)
    DATA_STORE["wins"] = pd.concat(list_wins, ignore_index=True)
    DATA_STORE["losses"] = pd.concat(list_losses, ignore_index=True)
    DATA_STORE["meta"] = list_meta
    print(f"Baza gotowa. {len(DATA_STORE['meta'])} badanych.")

# --- ENDPOINTY ---

@app.get("/analysis/subjects", response_model=AnalysisResponse)
async def get_subjects_list():
    _ensure_data_loaded()
    limit = min(len(DATA_STORE["choices"]), 5000)
    subs = [SubjectListElement(index=i, source_study=DATA_STORE["meta"][i], total_trials=int(DATA_STORE["choices"].iloc[i].count())) for i in range(limit)]
    return AnalysisResponse(total_subjects=len(DATA_STORE["choices"]), subjects_list=subs)

@app.get("/analysis/compare/{subject_index}", response_model=ComparisonResponse)
async def compare_subject(subject_index: int):
    _ensure_data_loaded()
    c_df = DATA_STORE["choices"]
    if subject_index < 0 or subject_index >= len(c_df): raise HTTPException(404, "Zły indeks")
    
    # 1. Dane człowieka
    c_row = c_df.iloc[subject_index]
    w_row = DATA_STORE["wins"].iloc[subject_index] if DATA_STORE["wins"] is not None else pd.Series([0]*len(c_row))
    l_row = DATA_STORE["losses"].iloc[subject_index] if DATA_STORE["losses"] is not None else pd.Series([0]*len(c_row))
    
    human_history = []
    current_score = 2000
    deck_map = {1: "A", 2: "B", 3: "C", 4: "D"}
    
    valid_trials_count = 0
    for i in range(len(c_row)):
        c, w, l = c_row.get(i), w_row.get(i), l_row.get(i)
        if pd.isna(c): continue
        if pd.isna(w): w = 0
        if pd.isna(l): l = 0
        valid_trials_count += 1
        
        net = int(w) + int(l)
        current_score += net
        human_history.append(TrialData(
            trial=i+1, deck=deck_map.get(int(c), "?"), win=int(w), loss=int(l), net=net, total_score=current_score
        ))

    # 2. Rekonstrukcja środowiska (Historia + Bechara Schema)
    reconstructed_decks = _reconstruct_environment_from_human(c_row, w_row, l_row)
    env = ReplayedEnvironment(reconstructed_decks)
    
    # 3. Symulacja AI
    agent = StochasticMPCAgent(strategy="human")
    ai_history = []
    ai_score = 2000
    
    # Pierwszy ruch identyczny dla synchronizacji
    first_human_move = deck_map.get(int(c_row.get(0)), "A")
    
    for t in range(valid_trials_count):
        if t == 0:
            action = first_human_move
        else:
            action = agent.select_action()
            
        gain, loss, net_res = env.step(action)
        
        agent.update_model(action, net_res)
        ai_score += net_res
        
        ai_history.append(TrialData(
            trial=t+1, deck=action, win=gain, loss=loss, net=net_res, total_score=ai_score
        ))

    # 4. Obliczanie metryk
    matches = 0
    good_bad_matches = 0
    squared_diff_sum = 0
    total_regret = 0
    
    # Do WSLS (Win-Stay, Lose-Shift)
    wsls_matches = 0
    wsls_opportunities = 0
    
    # Do Entropii (liczniki wyborów)
    human_counts = {"A":0, "B":0, "C":0, "D":0}
    ai_counts = {"A":0, "B":0, "C":0, "D":0}
    
    bad_decks = ["A", "B"]
    
    for i in range(len(human_history)):
        h = human_history[i]
        ai = ai_history[i]
        
        # 1. Podstawowe
        if h.deck == ai.deck: matches += 1
        human_bad = h.deck in bad_decks
        ai_bad = ai.deck in bad_decks
        if human_bad == ai_bad: good_bad_matches += 1
        
        # 2. RMSE & Regret
        diff = h.total_score - ai.total_score
        squared_diff_sum += (h.total_score - ai.total_score) ** 2
        
        # Regret: O ile mniej zarobił człowiek w tej turze niż AI?
        # (Liczymy różnicę w wynikach netto w danej turze, a nie total)
        turn_regret = ai.net - h.net
        total_regret += turn_regret
        
        # 3. Zbieranie danych do entropii
        if h.deck in human_counts: human_counts[h.deck] += 1
        if ai.deck in ai_counts: ai_counts[ai.deck] += 1
        
        # 4. WSLS (Analiza poprzedniej tury)
        if i > 0:
            prev_h = human_history[i-1]
            prev_ai = ai_history[i-1]
            
            # Sprawdzamy człowieka: Czy zastosował się do zasady WSLS?
            # Win-Stay: Poprzednio zysk (>0) ORAZ teraz ta sama talia
            h_stayed = (h.deck == prev_h.deck)
            h_should_stay = (prev_h.net >= 0) # Wygrał lub 0
            
            # Lose-Shift: Poprzednio strata (<0) ORAZ teraz inna talia
            h_shifted = (h.deck != prev_h.deck)
            h_should_shift = (prev_h.net < 0) # Przegrał
            
            human_followed_wsls = (h_should_stay and h_stayed) or (h_should_shift and h_shifted)
            
            # Sprawdzamy AI:
            ai_stayed = (ai.deck == prev_ai.deck)
            ai_should_stay = (prev_ai.net >= 0)
            ai_shifted = (ai.deck != prev_ai.deck)
            ai_should_shift = (prev_ai.net < 0)
            
            ai_followed_wsls = (ai_should_stay and ai_stayed) or (ai_should_shift and ai_shifted)
            
            wsls_opportunities += 1
            if human_followed_wsls == ai_followed_wsls:
                wsls_matches += 1

    # Obliczanie Entropii Shannona: H = -sum(p * log(p))
    def calc_entropy(counts, total):
        if total == 0: return 0
        entropy = 0
        for k in counts:
            p = counts[k] / total
            if p > 0:
                entropy -= p * np.log2(p)
        return entropy

    n = len(human_history)
    
    metrics = SimilarityMetrics(
        exact_match_ratio=round((matches / n) * 100, 2) if n > 0 else 0,
        good_bad_match_ratio=round((good_bad_matches / n) * 100, 2) if n > 0 else 0,
        capital_rmse=round((squared_diff_sum / n) ** 0.5, 2) if n > 0 else 0,
        
        human_entropy=round(calc_entropy(human_counts, n), 2),
        ai_entropy=round(calc_entropy(ai_counts, n), 2),
        cumulative_regret=total_regret,
        wsls_ratio=round((wsls_matches / wsls_opportunities) * 100, 2) if wsls_opportunities > 0 else 0
    )

    return ComparisonResponse(
        subject_data=SubjectHistoryResponse(
            subject_index=subject_index, source_study=DATA_STORE["meta"][subject_index], history=human_history
        ), mpc_data=ai_history, metrics=metrics
    )

def _create_live_game_decks() -> Dict[DeckId, List[Tuple[int, int]]]:
    # Dla trybu gry na żywo używamy tego samego schematu co dla symulacji
    decks = {}
    for d in ["A", "B", "C", "D"]:
        # Generujemy 200 kart (zapas) wg schematu Bechary
        decks[d] = _get_standard_scheme_cards(d, 0, 200)
    return decks

def _get_game_state_response(session: GameSession) -> GameStateResponse:
    """Konwertuje wewnętrzny stan sesji na odpowiedź API."""
    return GameStateResponse(
        session_id=session.session_id,
        score=session.score,
        turn=session.turn,
        last_move=session.last_move,
        is_game_ended=session.is_game_ended,
    )

# --- START GRY (LIVE) ---
def _create_live_game_decks() -> Dict[DeckId, List[Tuple[int, int]]]:
    # Dla trybu gry na żywo używamy tego samego schematu co dla symulacji
    decks = {}
    for d in ["A", "B", "C", "D"]:
        # Generujemy 200 kart (zapas) wg schematu Bechary
        decks[d] = _get_standard_scheme_cards(d, 0, 200)
    return decks

@app.post("/game/start", response_model=GameStateResponse)
async def start_new_game():
    sid = str(uuid.uuid4())
    game_sessions[sid] = GameSession(session_id=sid, decks=_create_live_game_decks())
    return _get_game_state_response(game_sessions[sid])

@app.post("/game/choose", response_model=GameStateResponse)
async def choose_deck(choice: ChoiceRequest):
    s = game_sessions.get(choice.session_id)
    if not s or s.is_game_ended: raise HTTPException(400, "Err")
    d = choice.deck_id
    idx = s.deck_counters[d]
    if idx >= len(s.decks[d]): idx = 0 # loop
    
    gain, loss = s.decks[d][idx]
    s.score += (gain + loss)
    s.turn += 1
    s.deck_counters[d] += 1
    s.last_move = LastMove(deck=d, gain=gain, loss=loss, net=gain+loss)
    if s.turn >= 100: s.is_game_ended = True
    return _get_game_state_response(s)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)