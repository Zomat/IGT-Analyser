import random
import uuid
from typing import Dict, List, Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(
    title="IGT Analyser Backend",
    description="API do zarządzania sesjami gry Iowa Gambling Task.",
    version="1.0.0",
)

origins = [
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DeckId = Literal["A", "B", "C", "D"]

class LastMove(BaseModel):
    deck: DeckId
    gain: int
    loss: int
    net: int

class ChoiceRequest(BaseModel):
    session_id: str
    deck_id: DeckId

class GameStateResponse(BaseModel):
    session_id: str
    score: int
    turn: int
    last_move: Optional[LastMove] = None
    is_game_ended: bool

class GameSession(BaseModel):
    session_id: str
    score: int = 2000
    turn: int = 0
    decks: Dict[DeckId, List[Tuple[int, int]]]
    deck_counters: Dict[DeckId, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
    last_move: Optional[LastMove] = None
    is_game_ended: bool = False

game_sessions: Dict[str, GameSession] = {}

def _create_shuffled_decks() -> Dict[DeckId, List[Tuple[int, int]]]:
    deck_A_punishments = [-150] * 2 + [-200] * 1 + [-300] * 1 + [-350] * 1
    deck_A_cards = [(100, 0)] * 35 + [(100, p) for p in deck_A_punishments]
    random.shuffle(deck_A_cards)

    deck_B_punishments = [-2250] * 5
    deck_B_cards = [(100, 0)] * 39 + [(100, p) for p in deck_B_punishments]
    random.shuffle(deck_B_cards)

    deck_C_punishments = [-25] * 2 + [-50] * 1 + [-75] * 2
    deck_C_cards = [(50, 0)] * 35 + [(50, p) for p in deck_C_punishments]
    random.shuffle(deck_C_cards)

    deck_D_punishments = [-250] * 1
    deck_D_cards = [(50, 0)] * 39 + [(50, p) for p in deck_D_punishments]
    random.shuffle(deck_D_cards)

    return {"A": deck_A_cards, "B": deck_B_cards, "C": deck_C_cards, "D": deck_D_cards}


def _get_game_state_response(session: GameSession) -> GameStateResponse:
    """Konwertuje pełny obiekt sesji na obiekt wysyłany do klienta."""
    return GameStateResponse(
        session_id=session.session_id,
        score=session.score,
        turn=session.turn,
        last_move=session.last_move,
        is_game_ended=session.is_game_ended,
    )


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "IGT Analyser Backend jest aktywny."}


@app.post("/game/start", response_model=GameStateResponse)
async def start_new_game():
    """
    Rozpoczyna nową sesję gry.
    Tworzy unikalne ID sesji, generuje potasowane talie i zwraca stan początkowy.
    """
    session_id = str(uuid.uuid4())
    shuffled_decks = _create_shuffled_decks()

    new_session = GameSession(session_id=session_id, decks=shuffled_decks)
    game_sessions[session_id] = new_session

    print(f"Rozpoczęto nową sesję gry: {session_id}")
    return _get_game_state_response(new_session)


@app.post("/game/choose", response_model=GameStateResponse)
async def choose_deck(choice: ChoiceRequest):
    """
    Przetwarza wybór talii przez gracza.
    Pobiera sesję, wyciąga kartę, aktualizuje stan gry i zwraca nowy stan.
    """
    session = game_sessions.get(choice.session_id)

    if not session:
        raise HTTPException(
            status_code=404, detail=f"Sesja o ID {choice.session_id} nie znaleziona."
        )

    if session.is_game_ended:
        raise HTTPException(
            status_code=400, detail="Gra w tej sesji została już zakończona."
        )

    deck_id = choice.deck_id
    
    card_index = session.deck_counters[deck_id]
    
    gain, loss = session.decks[deck_id][card_index]
    net = gain + loss

    session.score += net
    session.turn += 1
    session.last_move = LastMove(deck=deck_id, gain=gain, loss=loss, net=net)
    
    session.deck_counters[deck_id] = (card_index + 1) % 40

    if session.turn >= 100:
        session.is_game_ended = True
        print(f"Zakończono sesję gry: {session.session_id}. Wynik: {session.score}")

    return _get_game_state_response(session)


if __name__ == "__main__":
    import uvicorn
    print("Uruchamianie serwera FastAPI na http://localhost:8000")
    
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)