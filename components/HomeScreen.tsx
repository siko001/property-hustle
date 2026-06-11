'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Home,
  Layers,
  Play,
  RotateCcw,
  Shield,
  Timer,
  Trophy,
  Volume2
} from 'lucide-react';
import { CardGuide } from '@/components/home/CardGuide';
import { ConfirmDiscardSettings, ConfirmEndTurn } from '@/components/home/dialogs';
import { FlyingCard } from '@/components/home/FlyingCard';
import { MetaPill } from '@/components/home/primitives';
import {
  DiscardPromptDialog,
  IncomingActionPromptDialog,
  PaymentPromptDialog,
  PlayerTargetPromptDialog,
  RentTargetPromptDialog,
  SetTargetPromptDialog,
  StreetSwapPromptDialog,
  UpgradePromptDialog,
  WildcardPromptDialog
} from '@/components/home/prompts';
import { RulesGuide } from '@/components/home/RulesGuide';
import { ScannerPanel } from '@/components/home/ScannerPanel';
import { TableMiniSummary } from '@/components/home/TableMiniSummary';
import { TablePlayerLayout } from '@/components/home/TablePlayers';
import { TopBar } from '@/components/home/TopBar';
import { TurnToast } from '@/components/home/TurnToast';
import { useQrCode } from '@/components/home/hooks/useQrCode';
import { useToast } from '@/components/home/hooks/useToast';
import { DashboardScreen } from '@/components/home/screens/DashboardScreen';
import { LobbyScreen } from '@/components/home/screens/LobbyScreen';
import { OfflineScreen } from '@/components/home/screens/OfflineScreen';
import { SettingsScreen } from '@/components/home/screens/SettingsScreen';
import {
  DELETED_LOCAL_ROOMS_KEY,
  HAND_PANEL_MAX_HEIGHT,
  HAND_PANEL_MIN_HEIGHT,
  INITIAL_LOCAL_KEY,
  INITIAL_ROOM_CODE
} from '@/components/home/constants';
import type {
  ActiveRoom,
  CardFlight,
  CardRect,
  DiscardPrompt,
  IncomingActionPrompt,
  PaymentPrompt,
  PersistedGameState,
  PlayerTargetPrompt,
  RentTargetPrompt,
  RoomMode,
  RoomNavigation,
  RoomRole,
  Screen,
  SetTargetPrompt,
  StreetSwapPrompt,
  TableCard,
  TableZone,
  UpgradePrompt,
  WildcardPrompt
} from '@/components/home/types';
import { chooseBotMove } from '@/lib/game/bots';
import { getCardStyle, getWildcardBand } from '@/lib/game/card-style';
import {
  EMPTY_HAND_DRAW,
  MAX_BOTS,
  MAX_HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NORMAL_TURN_DRAW,
  OPENING_HAND_SIZE
} from '@/lib/game/constants';
import { districtSets } from '@/lib/game/deck';
import {
  canChargeRent,
  chooseBotPayableTarget,
  choosePaymentCards,
  drawWithRecycledPile,
  getCompletedSetCount,
  getCompleteSetTargets,
  getEligibleUpgradeDistricts,
  getLoosePropertiesForOwner,
  getLoosePropertyTargets,
  getPaymentKey,
  getRivalOwnersWithPayableAssets,
  getTableCardKey,
  getZoneForCard,
  makeDiscardCard,
  makeDrawPile,
  normalizePlayType,
  shuffleCards,
  toCardRect
} from '@/lib/game/engine';
import { defaultRules } from '@/lib/game/rules';
import type { CardType, Difficulty, GameCard, Player, RoomRules } from '@/lib/game/types';
import type { RoomJoinResult, SharedRoom } from '@/lib/rooms/types';
import {
  buildJoinUrl,
  buildLocalJoinUrl,
  cleanRoomCode,
  getGameStateStorageKey,
  parseInvitePayload,
  roomSettingsSignature
} from '@/lib/rooms/utils';
import { getOrCreateClientId, makeCode, makeSecretKey } from '@/lib/util/id';

export default function HomeScreen({ initialScreen = 'dashboard' }: { initialScreen?: Screen }) {
  const router = useRouter();
  const openingDeck = useMemo(() => shuffleCards(makeDrawPile()), []);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [roomMode, setRoomMode] = useState<RoomMode>('online');
  const [code, setCode] = useState(INITIAL_ROOM_CODE);
  const [joinLink, setJoinLink] = useState('');
  const [localKey, setLocalKey] = useState(INITIAL_LOCAL_KEY);
  const [localPlayerName, setLocalPlayerName] = useState('');
  const [localJoinKey, setLocalJoinKey] = useState('');
  const { qr, createQr } = useQrCode();
  const [rules, setRules] = useState<RoomRules>(defaultRules);
  const [players, setPlayers] = useState(4);
  const [bots, setBots] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [activeCardId, setActiveCardId] = useState<string | null>(openingDeck[0]?.id ?? null);
  const [hand, setHand] = useState<GameCard[]>(openingDeck.slice(0, OPENING_HAND_SIZE));
  const [drawPile, setDrawPile] = useState<GameCard[]>(openingDeck.slice(OPENING_HAND_SIZE));
  const [tableCards, setTableCards] = useState<TableCard[]>([]);
  const [discardPile, setDiscardPile] = useState<TableCard[]>([]);
  const [turnPlays, setTurnPlays] = useState<CardType[]>([]);
  const [actionsPlayed, setActionsPlayed] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [turnSerial, setTurnSerial] = useState(0);
  const [turnActivitySerial, setTurnActivitySerial] = useState(0);
  const [drawnTurnSerial, setDrawnTurnSerial] = useState(-1);
  const [round, setRound] = useState(1);
  const [defendedOwners, setDefendedOwners] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [botHands, setBotHands] = useState<Record<string, GameCard[]>>({});
  const [isTurnTransitioning, setIsTurnTransitioning] = useState(false);
  const [turnLog, setTurnLog] = useState<string[]>([
    'Table is ready. Choose a card and make the first move.'
  ]);
  const { toast, showToast, dismissToast } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [confirmEndTurnOpen, setConfirmEndTurnOpen] = useState(false);
  const [cardFlights, setCardFlights] = useState<CardFlight[]>([]);
  const [movingCardIds, setMovingCardIds] = useState<string[]>([]);
  const [isCardAnimating, setIsCardAnimating] = useState(false);
  const [sharedRoom, setSharedRoom] = useState<SharedRoom | null>(null);
  const [serverRooms, setServerRooms] = useState<SharedRoom[]>([]);
  const [roomRole, setRoomRole] = useState<RoomRole>('host');
  const [roomJoinMessage, setRoomJoinMessage] = useState('');
  const [clientId, setClientId] = useState('');
  const [localMaintenance, setLocalMaintenance] = useState(false);
  const [deletedRoomCodes, setDeletedRoomCodes] = useState<string[]>([]);
  const [roomsCollapsed, setRoomsCollapsed] = useState(true);
  const [handCollapsed, setHandCollapsed] = useState(false);
  const [handSummaryCollapsed, setHandSummaryCollapsed] = useState({ board: false, bank: false });
  const [handCanScroll, setHandCanScroll] = useState(false);
  const [playerPanelWidth, setPlayerPanelWidth] = useState(380);
  const [boardHeight, setBoardHeight] = useState(530);
  const [handPanelHeight, setHandPanelHeight] = useState(360);
  const handAutoOpenedRef = useRef(false);
  const [playerTargetPrompt, setPlayerTargetPrompt] = useState<PlayerTargetPrompt | null>(null);
  const [streetSwapPrompt, setStreetSwapPrompt] = useState<StreetSwapPrompt | null>(null);
  const [rentTargetPrompt, setRentTargetPrompt] = useState<RentTargetPrompt | null>(null);
  const [setTargetPrompt, setSetTargetPrompt] = useState<SetTargetPrompt | null>(null);
  const [incomingActionPrompt, setIncomingActionPrompt] = useState<IncomingActionPrompt | null>(null);
  const [paymentBlockPrompt, setPaymentBlockPrompt] = useState<IncomingActionPrompt | null>(null);
  const [wildcardPrompt, setWildcardPrompt] = useState<WildcardPrompt | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePrompt | null>(null);
  const [paymentPrompt, setPaymentPrompt] = useState<PaymentPrompt | null>(null);
  const [discardPrompt, setDiscardPrompt] = useState<DiscardPrompt | null>(null);
  const [rulesGuideOpen, setRulesGuideOpen] = useState(false);
  const [cardGuideOpen, setCardGuideOpen] = useState(false);
  const [confirmDiscardSettingsOpen, setConfirmDiscardSettingsOpen] = useState(false);
  const incomingActionResolveRef = useRef<((blocked: boolean) => void) | null>(null);
  const paymentContinueRef = useRef<(() => void) | null>(null);
  const appliedInviteRef = useRef(false);
  const drawPileRef = useRef<HTMLDivElement | null>(null);
  const tableGridRef = useRef<HTMLDivElement | null>(null);
  const feltTableRef = useRef<HTMLDivElement | null>(null);
  const tablePlayerRefs = useRef(new Map<string, HTMLElement>());
  const handTargetRef = useRef<HTMLDivElement | null>(null);
  const boardSummaryRef = useRef<HTMLDivElement | null>(null);
  const bankSummaryRef = useRef<HTMLDivElement | null>(null);
  const handCardRefs = useRef(new Map<string, HTMLButtonElement>());
  const restoredGameKeyRef = useRef('');
  const turnTransitionRef = useRef(false);
  const executedBotTurnRef = useRef('');

  const maxBotsForPlayers = Math.min(MAX_BOTS, players - 1);
  const occupiedSeats = sharedRoom?.occupiedSeats ?? Math.min(players, bots + 1);
  const currentSettingsSignature = useMemo(
    () => roomSettingsSignature({ players, bots, difficulty, rules }),
    [bots, difficulty, players, rules]
  );
  const savedSettingsSignature = useMemo(
    () =>
      sharedRoom
        ? roomSettingsSignature({
            players: sharedRoom.maxPlayers,
            bots: sharedRoom.bots,
            difficulty: sharedRoom.difficulty,
            rules: sharedRoom.rules
          })
        : '',
    [sharedRoom]
  );
  const roomSettingsDirty =
    Boolean(sharedRoom) && screen === 'settings' && currentSettingsSignature !== savedSettingsSignature;
  const roomIsFull = sharedRoom?.full ?? occupiedSeats >= players;
  const canStartGame = roomRole === 'host';
  const hasMinimumPlayers = occupiedSeats >= 2;
  const isSpectator = roomRole === 'viewer';
  const roomHasStarted = sharedRoom?.status === 'playing';

  const resizePlayerPanel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth < 900 || !tableGridRef.current) return;
    event.preventDefault();
    const gridRect = tableGridRef.current.getBoundingClientRect();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const availableWidth = gridRect.width;
      const maxWidth = Math.max(190, Math.min(500, availableWidth - 430));
      const nextWidth = Math.min(Math.max(moveEvent.clientX - gridRect.left, 190), maxWidth);
      setPlayerPanelWidth(nextWidth);
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  }, []);

  const resizeBoardHeight = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth < 900 || !feltTableRef.current) return;
    event.preventDefault();
    const tableRect = feltTableRef.current.getBoundingClientRect();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.min(Math.max(moveEvent.clientY - tableRect.top, 340), 760);
      setBoardHeight(nextHeight);
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  }, []);

  const resizeHandPanel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth < 900) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    const startY = event.clientY;
    const startHeight = handPanelHeight;
    event.currentTarget.setPointerCapture(pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.min(
        Math.max(startHeight + startY - moveEvent.clientY, HAND_PANEL_MIN_HEIGHT),
        HAND_PANEL_MAX_HEIGHT
      );
      setHandPanelHeight(nextHeight);
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  }, [handPanelHeight]);

  const toggleHandPanelHeight = useCallback(() => {
    setHandPanelHeight((current) => {
      const midpoint = (HAND_PANEL_MIN_HEIGHT + HAND_PANEL_MAX_HEIGHT) / 2;
      return current >= midpoint ? HAND_PANEL_MIN_HEIGHT : HAND_PANEL_MAX_HEIGHT;
    });
  }, []);

  const scrollPageFromFelt = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    event.preventDefault();
    window.scrollBy({ top: event.deltaY, behavior: 'auto' });
  }, []);

  useEffect(() => {
    setClientId(getOrCreateClientId());
    const localHostnames = ['localhost', '127.0.0.1', '::1'];
    setLocalMaintenance(localHostnames.includes(window.location.hostname));
    try {
      const storedCodes = JSON.parse(
        window.localStorage.getItem(DELETED_LOCAL_ROOMS_KEY) ?? '[]'
      ) as unknown;
      if (Array.isArray(storedCodes)) {
        setDeletedRoomCodes(
          storedCodes.filter((value): value is string => typeof value === 'string')
        );
      }
    } catch {
      window.localStorage.removeItem(DELETED_LOCAL_ROOMS_KEY);
    }

    if (typeof window !== 'undefined' && parseInvitePayload(window.location.href)) return;

    setCode(makeCode());
    setLocalKey(makeSecretKey());
  }, []);

  useEffect(() => {
    setBots((current) => Math.min(current, maxBotsForPlayers));
  }, [maxBotsForPlayers]);

  useEffect(() => {
    const scrollNode = handTargetRef.current;
    if (!scrollNode || handCollapsed) {
      setHandCanScroll(false);
      return;
    }

    const updateCanScroll = () => {
      setHandCanScroll(scrollNode.scrollWidth > scrollNode.clientWidth + 4);
    };

    updateCanScroll();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateCanScroll);
      observer.observe(scrollNode);
    }

    window.addEventListener('resize', updateCanScroll);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateCanScroll);
    };
  }, [hand.length, handCollapsed, handPanelHeight]);

  useEffect(() => {
    if (!clientId || !sharedRoom || sharedRoom.status !== 'playing') return;

    const storageKey = getGameStateStorageKey(sharedRoom.code, clientId);
    if (restoredGameKeyRef.current === storageKey) return;

    try {
      const storedState = window.localStorage.getItem(storageKey);
      if (storedState) {
        const state = JSON.parse(storedState) as PersistedGameState;
        if (Array.isArray(state.hand) && Array.isArray(state.drawPile) && Array.isArray(state.tableCards)) {
          setHand(state.hand);
          setDrawPile(state.drawPile);
          setTableCards(state.tableCards);
          setDiscardPile(Array.isArray(state.discardPile) ? state.discardPile : []);
          setTurnPlays(Array.isArray(state.turnPlays) ? state.turnPlays : []);
          setActionsPlayed(state.actionsPlayed ?? 0);
          setCurrentPlayerIndex(state.currentPlayerIndex ?? 0);
          setTurnSerial(state.turnSerial ?? 0);
          setTurnActivitySerial(state.turnActivitySerial ?? 0);
          setDrawnTurnSerial(state.drawnTurnSerial ?? -1);
          setRound(state.round ?? 1);
          setTurnLog(Array.isArray(state.turnLog) ? state.turnLog : []);
          setActiveCardId(state.activeCardId ?? state.hand[0]?.id ?? null);
          setDefendedOwners(Array.isArray(state.defendedOwners) ? state.defendedOwners : []);
          setWinner(state.winner ?? null);
          setBotHands(state.botHands ?? {});
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    restoredGameKeyRef.current = storageKey;
  }, [clientId, sharedRoom]);

  useEffect(() => {
    if (!clientId || !sharedRoom || sharedRoom.status !== 'playing' || screen !== 'game') return;

    const storageKey = getGameStateStorageKey(sharedRoom.code, clientId);
    if (restoredGameKeyRef.current !== storageKey) return;

    const state: PersistedGameState = {
      hand,
      drawPile,
      tableCards,
      discardPile,
      turnPlays,
      actionsPlayed,
      currentPlayerIndex,
      turnSerial,
      turnActivitySerial,
      drawnTurnSerial,
      round,
      turnLog,
      activeCardId,
      defendedOwners,
      winner,
      botHands
    };
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    actionsPlayed,
    activeCardId,
    clientId,
    currentPlayerIndex,
    drawPile,
    discardPile,
    defendedOwners,
    drawnTurnSerial,
    hand,
    round,
    screen,
    sharedRoom,
    tableCards,
    turnActivitySerial,
    turnLog,
    turnPlays,
    turnSerial,
    winner,
    botHands
  ]);

  useEffect(() => {
    if (!clientId || screen !== 'dashboard') return;

    let cancelled = false;
    const refreshRooms = async () => {
      try {
        const response = await fetch('/api/rooms', { cache: 'no-store' });
        if (!response.ok) return;
        const result = (await response.json()) as { rooms: SharedRoom[] };
        if (!cancelled) setServerRooms(result.rooms);
      } catch {
        // Keep the last room snapshot if the local registry briefly cannot be reached.
      }
    };

    void refreshRooms();
    const interval = window.setInterval(() => void refreshRooms(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [clientId, screen]);

  const tablePlayers = useMemo<Player[]>(() => {
    if (sharedRoom) {
      const humanPlayers: Player[] = sharedRoom.members.map((member) => ({
        id: member.id === clientId ? 'host' : member.id,
        name: member.id === clientId ? 'You' : member.name,
        score: 0,
        cards: member.id === clientId ? hand.length : 5,
        ready: true
      }));
      const botPlayers: Player[] = Array.from({ length: sharedRoom.bots }, (_, index) => ({
        id: `game-bot-${index + 1}`,
        name: `${sharedRoom.difficulty[0].toUpperCase()}${sharedRoom.difficulty.slice(1)} Bot ${index + 1}`,
        isBot: true,
        difficulty: sharedRoom.difficulty,
        score: 0,
        cards: botHands[`game-bot-${index + 1}`]?.length ?? 5,
        ready: true
      }));

      return [...humanPlayers, ...botPlayers];
    }

    const botSeats = roomMode === 'bots' ? Math.max(1, bots) : bots;
    return Array.from({ length: players }, (_, index) => {
      const isHost = index === 0;
      const isBot = !isHost && index <= botSeats;
      return {
        id: isHost ? 'host' : `seat-${index}`,
        name: isHost ? 'You' : isBot ? `${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot ${index}` : `Guest ${index + 1}`,
        isBot,
        difficulty: isBot ? difficulty : undefined,
        score: 0,
        cards: isHost ? hand.length : 5 + (index % 3),
        ready: isHost || isBot || index % 2 === 0
      };
    });
  }, [botHands, bots, clientId, difficulty, hand.length, players, roomMode, sharedRoom]);

  const lobbyPlayers = useMemo<Player[]>(() => {
    if (!sharedRoom) return tablePlayers;

    const humanPlayers: Player[] = sharedRoom.members.map((member, index) => ({
      id: member.id,
      name: member.id === clientId ? 'You' : member.isHost ? 'Host' : member.name,
      score: member.isHost ? 1 : 0,
      cards: 5,
      ready: true
    }));
    const botPlayers: Player[] = Array.from({ length: sharedRoom.bots }, (_, index) => ({
      id: `shared-bot-${index + 1}`,
      name: `${sharedRoom.difficulty[0].toUpperCase()}${sharedRoom.difficulty.slice(1)} Bot ${index + 1}`,
      isBot: true,
      difficulty: sharedRoom.difficulty,
      score: index % 2,
      cards: 5,
      ready: true
    }));
    const openSeatCount = Math.max(0, sharedRoom.maxPlayers - humanPlayers.length - botPlayers.length);
    const openSeats: Player[] = Array.from({ length: openSeatCount }, (_, index) => ({
      id: `open-seat-${index + 1}`,
      name: `Open seat ${index + 1}`,
      score: 0,
      cards: 0,
      ready: false
    }));

    return [...humanPlayers, ...botPlayers, ...openSeats];
  }, [clientId, sharedRoom, tablePlayers]);

  const activePlayer = tablePlayers[currentPlayerIndex] ?? tablePlayers[0];
  const activeCard = hand.find((card) => card.id === activeCardId) ?? null;
  const propertyCards = tableCards.filter((item) => item.zone === 'property');
  const bankCards = tableCards.filter((item) => item.zone === 'bank');
  const yourPropertyCards = propertyCards.filter((item) => item.owner === 'You');
  const yourBankCards = bankCards.filter((item) => item.owner === 'You');
  const yourCompletedSetCount = getCompletedSetCount(tableCards, 'You');
  const yourBankValue = yourBankCards
    .reduce((total, item) => total + item.card.value, 0);
  const activeTurnLabel = activePlayer?.id === 'host' ? 'Your turn' : `${activePlayer?.name ?? 'Player'}'s turn`;
  const isLocalPlayerTurn = !isSpectator && activePlayer?.id === 'host';
  const turnLimit = rules.playStyle === 'rush' || rules.playStyle === 'draft' ? 2 : 3;
  const remainingPlays = Math.max(0, turnLimit - actionsPlayed);
  const handCollapseBlocked = isLocalPlayerTurn && !handCollapsed && !winner;
  const onlineReplayNeedsAccept = Boolean(sharedRoom && sharedRoom.mode === 'online' && sharedRoom.members.length > 1);
  const replayAcceptedIds = new Set(sharedRoom?.replay?.acceptedIds ?? []);
  const replayAcceptedCount = sharedRoom?.members.filter((member) => replayAcceptedIds.has(member.id)).length ?? 0;
  const replayTotalCount = sharedRoom?.members.length ?? 0;
  const currentPlayerAcceptedReplay = clientId ? replayAcceptedIds.has(clientId) : false;
  const allPlayersAcceptedReplay = onlineReplayNeedsAccept && replayTotalCount > 0 && replayAcceptedCount === replayTotalCount;

  const activeRooms = useMemo<ActiveRoom[]>(() => {
    return serverRooms
      .filter((room) => !deletedRoomCodes.includes(room.code))
      .map((room) => {
        const host = room.members.find((member) => member.isHost);
        const myRoom = host?.id === clientId;

        return {
          code: room.code,
          title: myRoom ? 'My table' : room.title,
          host: myRoom ? 'You' : host?.name ?? 'Host',
          mode: room.mode,
          playerCount: room.occupiedSeats,
          maxPlayers: room.maxPlayers,
          bots: room.bots,
          playStyle: room.rules.playStyle,
          status: room.status,
          myRoom,
          secret: room.secret,
          updated: 'now'
        };
      });
  }, [clientId, deletedRoomCodes, serverRooms]);

  const playTurnSound = useCallback(() => {
    if (typeof window === 'undefined') return;

    type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextCtor) return;

    const audio = new AudioContextCtor();
    const now = audio.currentTime;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    gain.connect(audio.destination);

    [660, 880, 1175].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.075);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.075);
      oscillator.stop(now + 0.18 + index * 0.075);
    });

    window.setTimeout(() => void audio.close(), 520);
  }, []);

  useEffect(() => {
    if (screen !== 'game' || winner) return;

    const owners = Array.from(
      new Set(
        tableCards
          .filter((item) => item.zone === 'property')
          .map((item) => item.owner)
      )
    );
    const winningOwner = owners.find(
      (owner) => getCompletedSetCount(tableCards, owner) >= 3
    );
    if (!winningOwner) return;

    setWinner(winningOwner);
    setTurnLog((entries) => [
      `${winningOwner} completed 3 districts and won the game.`,
      ...entries
    ].slice(0, 40));
    showToast(
      winningOwner === 'You' ? 'You won!' : `${winningOwner} won`,
      'Three complete property districts ends the game.'
    );
  }, [screen, showToast, tableCards, winner]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('notice') !== 'removed') return;

    showToast('Removed from room', 'You have been removed from the room by the host.');
    currentUrl.searchParams.delete('notice');
    router.replace(`${currentUrl.pathname}${currentUrl.search}`);
  }, [router, showToast]);

  const navigateToRoom = useCallback(
    (roomCode: string, navigation: RoomNavigation = 'push') => {
      if (navigation === 'none') return;

      const path = `/${cleanRoomCode(roomCode)}`;
      if (window.location.pathname === path && !window.location.search) return;
      if (navigation === 'replace') router.replace(path);
      else router.push(path);
    },
    [router]
  );

  const navigateHome = useCallback(() => {
    setScreen('dashboard');
    router.push('/');
  }, [router]);

  const navigateOffline = useCallback(() => {
    setScreen('offline');
    router.push('/offline');
  }, [router]);

  const animateCardTransfer = useCallback(
    (
      cards: GameCard[],
      sourceRects: CardRect[],
      targetRect: CardRect | null,
      faceDown: boolean,
      onComplete: () => void
    ) => {
      if (
        cards.length === 0 ||
        sourceRects.length === 0 ||
        !targetRect ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        onComplete();
        return;
      }

      const targetCenterX = targetRect.left + Math.min(targetRect.width * 0.72, 190);
      const targetCenterY = targetRect.top + Math.min(targetRect.height * 0.56, 120);
      const flights = cards.map((card, index) => {
        const from = sourceRects[Math.min(index, sourceRects.length - 1)];
        const destinationOffset = index * 18;

        return {
          id: `${card.id}-${Date.now()}-${index}`,
          card,
          faceDown,
          from,
          x: targetCenterX + destinationOffset - (from.left + from.width / 2),
          y: targetCenterY - destinationOffset * 0.3 - (from.top + from.height / 2),
          delay: index * 90
        };
      });
      const duration = 520 + (cards.length - 1) * 90;

      setIsCardAnimating(true);
      setMovingCardIds(cards.map((card) => card.id));
      setCardFlights(flights);

      window.setTimeout(() => {
        setCardFlights([]);
        setMovingCardIds([]);
        setIsCardAnimating(false);
        onComplete();
      }, duration);
    },
    []
  );

  const animateDrawCards = useCallback(
    (cards: GameCard[], onComplete: () => void) => {
      const drawRect = drawPileRef.current?.getBoundingClientRect();
      const handRect = handTargetRef.current?.getBoundingClientRect();
      const sourceRect = drawRect
        ? {
            left: drawRect.left + drawRect.width / 2 - 54,
            top: drawRect.bottom - 14,
            width: 108,
            height: 144
          }
        : null;

      animateCardTransfer(
        cards,
        sourceRect ? cards.map((_, index) => ({ ...sourceRect, left: sourceRect.left - index * 3, top: sourceRect.top + index * 2 })) : [],
        handRect ? toCardRect(handRect) : null,
        true,
        onComplete
      );
    },
    [animateCardTransfer]
  );

  const animateHandCard = useCallback(
    (card: GameCard, zone: TableZone, onComplete: () => void) => {
      const sourceRect = handCardRefs.current.get(card.id)?.getBoundingClientRect();
      const target = zone === 'property' || zone === 'bank' ? handTargetRef.current ?? feltTableRef.current : drawPileRef.current;
      const targetRect = target?.getBoundingClientRect();

      animateCardTransfer(
        [card],
        sourceRect ? [toCardRect(sourceRect)] : [],
        targetRect ? toCardRect(targetRect) : null,
        false,
        onComplete
      );
    },
    [animateCardTransfer]
  );

  const getTablePlayerElement = useCallback(
    (owner: string) => {
      const playerId = tablePlayers.find((player) => player.name === owner)?.id;
      return playerId ? tablePlayerRefs.current.get(playerId) ?? null : null;
    },
    [tablePlayers]
  );

  const animatePlayedCardsToOwner = useCallback(
    (cards: TableCard[], nextOwner: string, onComplete: () => void) => {
      const sourceRects = cards
        .map((item, index) => {
          const source =
            item.owner === 'You'
              ? item.zone === 'bank'
                ? bankSummaryRef.current
                : boardSummaryRef.current
              : getTablePlayerElement(item.owner);
          const rect = source?.getBoundingClientRect();
          if (!rect) return null;
          return {
            left: rect.left + Math.min(rect.width * 0.35, 150) + index * 4,
            top: rect.top + Math.min(rect.height * 0.48, 100) + index * 3,
            width: 86,
            height: 116
          } satisfies CardRect;
        })
        .filter((rect): rect is CardRect => Boolean(rect));
      const target =
        nextOwner === 'You'
          ? handTargetRef.current ?? boardSummaryRef.current ?? feltTableRef.current
          : getTablePlayerElement(nextOwner) ?? feltTableRef.current;
      const targetRect = target?.getBoundingClientRect();

      animateCardTransfer(
        cards.map((item) => item.card),
        sourceRects,
        targetRect ? toCardRect(targetRect) : null,
        false,
        onComplete
      );
    },
    [animateCardTransfer, getTablePlayerElement]
  );

  const adoptSharedRoom = useCallback((room: SharedRoom) => {
    setSharedRoom(room);
    setServerRooms((current) => [room, ...current.filter((item) => item.code !== room.code)]);
    setRoomMode(room.mode);
    setCode(room.code);
    setPlayers(room.maxPlayers);
    setBots(room.bots);
    setDifficulty(room.difficulty);
    setRules(room.rules);
    if (room.secret) setLocalKey(room.secret);
  }, []);

  useEffect(() => {
    if (!sharedRoom?.code || (screen !== 'lobby' && screen !== 'game')) return;

    let cancelled = false;
    const roomCode = sharedRoom.code;
    const refreshRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomCode}`, { cache: 'no-store' });
        if (!response.ok) return;
        const result = (await response.json()) as { room?: SharedRoom };
        if (!cancelled && result.room) adoptSharedRoom(result.room);
      } catch {
        // Keep the current room snapshot while the local room service is unavailable.
      }
    };

    const interval = window.setInterval(() => void refreshRoom(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [adoptSharedRoom, screen, sharedRoom?.code]);

  const applyInvite = useCallback(
    async (
      value: string,
      toastTitle = 'Room joined',
      navigation: RoomNavigation = 'push',
      playerName = 'Guest player'
    ) => {
      const invite = parseInvitePayload(value);
      if (!invite) {
        showToast('Invite not found', 'Paste a room link, room code, or LAN key.');
        return;
      }

      try {
        const response = await fetch(`/api/rooms/${invite.code}/join`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            clientId: getOrCreateClientId(),
            playerName,
            secret: invite.secret
          })
        });
        const result = (await response.json()) as RoomJoinResult | { message?: string };

        if (!('room' in result)) {
          showToast('Room not found', result.message ?? `Room ${invite.code} is no longer active.`);
          return;
        }

        const room = result.room;
        const secret = room.secret ?? invite.secret ?? localKey;
        const link =
          room.mode === 'offline' ? `PH-LAN:${room.code}:${secret}` : buildJoinUrl(room.code);

        adoptSharedRoom(room);
        setRoomRole(result.role);
        setRoomJoinMessage(result.joined ? '' : result.message ?? 'This room cannot be joined.');
        setJoinLink(link);
        await createQr(link);
        setScreen('lobby');
        navigateToRoom(room.code, navigation);
        showToast(
          result.joined ? toastTitle : room.full ? 'Room full' : 'Room unavailable',
          result.joined
            ? `Joined ${room.mode === 'offline' ? 'LAN ' : ''}room ${room.code}.`
            : result.message ?? 'You can view the lobby, but no seat was added.'
        );
      } catch {
        showToast('Join failed', 'The room service is unavailable. Try the invite again.');
      }
    },
    [adoptSharedRoom, createQr, localKey, navigateToRoom, showToast]
  );

  const joinLocalTable = useCallback(async () => {
    const name = localPlayerName.trim();
    const rawKey = localJoinKey.trim();
    const parsedInvite = parseInvitePayload(rawKey);
    const inviteCode = parsedInvite?.mode === 'offline' ? parsedInvite.code : '';
    const secret =
      parsedInvite?.mode === 'offline'
        ? parsedInvite.secret?.trim().toUpperCase() ?? ''
        : rawKey.toUpperCase();
    if (!name || !secret) {
      showToast('Details needed', 'Enter your player name and the local table secret key.');
      return;
    }

    try {
      const response = await fetch('/api/rooms', { cache: 'no-store' });
      const result = (await response.json()) as { rooms?: SharedRoom[] };
      const room = result.rooms?.find(
        (candidate) =>
          candidate.mode === 'offline' &&
          candidate.status === 'lobby' &&
          (!inviteCode || candidate.code === inviteCode) &&
          candidate.secret?.toUpperCase() === secret
      );
      if (!room) {
        showToast('Local table not found', 'Check the secret key and confirm the host table is still open.');
        return;
      }

      await applyInvite(`PH-LAN:${room.code}:${secret}`, 'Local table joined', 'push', name);
    } catch {
      showToast('Join failed', 'The local table service is unavailable.');
    }
  }, [applyInvite, localJoinKey, localPlayerName, showToast]);

  useEffect(() => {
    if (appliedInviteRef.current || typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    if (currentUrl.pathname === '/offline') {
      const inviteSecret = currentUrl.searchParams.get('secret')?.trim().toUpperCase();
      if (inviteSecret) setLocalJoinKey(inviteSecret);
      appliedInviteRef.current = true;
      return;
    }
    if (!parseInvitePayload(window.location.href)) return;

    appliedInviteRef.current = true;
    const currentInvite = parseInvitePayload(currentUrl.href);
    const canonicalPath = currentInvite ? `/${currentInvite.code}` : currentUrl.pathname;
    void applyInvite(
      currentUrl.href,
      'Room joined',
      currentUrl.searchParams.has('room') || currentUrl.pathname !== canonicalPath
        ? 'replace'
        : 'none'
    );
  }, [applyInvite]);

  useEffect(() => {
    if (screen !== 'lobby' || !sharedRoom) return;

    const refreshRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${sharedRoom.code}`, { cache: 'no-store' });
        if (!response.ok) return;
        const result = (await response.json()) as { room: SharedRoom };
        const currentClientId = getOrCreateClientId();
        const stillInRoom = result.room.members.some((member) => member.id === currentClientId);

        if (roomRole === 'member' && !stillInRoom) {
          setSharedRoom(null);
          setRoomJoinMessage('');
          setRoomRole('host');
          setScreen('dashboard');
          router.replace('/?notice=removed');
          return;
        }

        adoptSharedRoom(result.room);
      } catch {
        // Keep the last known lobby snapshot if a poll briefly fails.
      }
    };

    const interval = window.setInterval(() => void refreshRoom(), 1500);
    return () => window.clearInterval(interval);
  }, [adoptSharedRoom, roomRole, router, screen, sharedRoom, showToast]);

  const openRoom = useCallback(
    async (mode: RoomMode, nextPlayers = players, nextBots = bots) => {
      const roomCode = makeCode();
      const secret = mode === 'offline' ? makeSecretKey() : localKey;
      const legalBotCount =
        mode === 'bots'
          ? Math.max(1, Math.min(nextPlayers - 1, MAX_BOTS, nextBots || 3))
          : Math.min(nextPlayers - 1, MAX_BOTS, nextBots);
      const link =
        mode === 'offline' ? buildLocalJoinUrl(roomCode, secret) : buildJoinUrl(roomCode);

      try {
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            title: 'My table',
            mode,
            maxPlayers: nextPlayers,
            bots: legalBotCount,
            difficulty,
            rules,
            clientId: getOrCreateClientId(),
            playerName: 'Host',
            secret: mode === 'offline' ? secret : undefined
          })
        });
        const result = (await response.json()) as RoomJoinResult | { message?: string };
        if (!response.ok || !('room' in result)) {
          showToast('Room creation failed', result.message ?? 'Could not create this room.');
          return;
        }

        adoptSharedRoom(result.room);
        setRoomRole('host');
        setRoomJoinMessage('');
        setLocalKey(secret);
        setJoinLink(link);
        await createQr(link);
        setScreen('lobby');
        navigateToRoom(roomCode);
      } catch {
        showToast('Room creation failed', 'The room service is unavailable.');
      }
    },
    [adoptSharedRoom, bots, createQr, difficulty, localKey, navigateToRoom, players, rules, showToast]
  );

  const joinActiveRoom = useCallback(
    async (room: ActiveRoom) => {
      const link = room.mode === 'offline'
        ? buildLocalJoinUrl(room.code, room.secret ?? localKey)
        : buildJoinUrl(room.code);
      await applyInvite(link, room.myRoom ? 'Room opened' : 'Room joined');
    },
    [applyInvite, localKey]
  );

  const deleteLocalRoom = useCallback(
    async (room: ActiveRoom) => {
      if (!localMaintenance) return;

      try {
        const response = await fetch(`/api/rooms/${room.code}`, { method: 'DELETE' });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) {
          showToast('Delete failed', result.message ?? 'This room could not be removed.');
          return;
        }

        setDeletedRoomCodes((current) => {
          const nextCodes = Array.from(new Set([...current, room.code]));
          window.localStorage.setItem(DELETED_LOCAL_ROOMS_KEY, JSON.stringify(nextCodes));
          return nextCodes;
        });
        setServerRooms((current) => current.filter((item) => item.code !== room.code));
        if (sharedRoom?.code === room.code) {
          setSharedRoom(null);
          setRoomJoinMessage('');
        }
        showToast('Room deleted', `${room.title} was removed from this local app.`);
      } catch {
        showToast('Delete failed', 'The local room service is unavailable.');
      }
    },
    [localMaintenance, sharedRoom?.code, showToast]
  );

  const copyInvite = useCallback(async () => {
    const value =
      roomMode === 'offline'
        ? joinLink || buildLocalJoinUrl(code, localKey)
        : joinLink || buildJoinUrl(code);
    try {
      await navigator.clipboard.writeText(value);
      showToast('Invite copied', 'Room link is on the clipboard.');
    } catch {
      showToast('Copy failed', value);
    }
  }, [code, joinLink, localKey, roomMode, showToast]);

  const removeLobbyPlayer = useCallback(
    async (player: Player) => {
      if (!sharedRoom || roomRole !== 'host' || sharedRoom.status !== 'lobby') return;
      const isBot = player.id.startsWith('shared-bot-');

      try {
        const response = await fetch(`/api/rooms/${sharedRoom.code}/manage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: isBot ? 'remove-bot' : 'remove-member',
            clientId: getOrCreateClientId(),
            memberId: isBot ? undefined : player.id
          })
        });
        const result = (await response.json()) as { room?: SharedRoom; message?: string };
        if (!response.ok || !result.room) {
          showToast('Cannot remove seat', result.message ?? 'This seat could not be removed.');
          return;
        }

        adoptSharedRoom(result.room);
        showToast('Seat removed', `${player.name} was removed from the lobby.`);
      } catch {
        showToast('Cannot remove seat', 'The room service is unavailable.');
      }
    },
    [adoptSharedRoom, roomRole, sharedRoom, showToast]
  );

  const resetGameForReplay = useCallback((toastTitle = 'Your turn', toastBody = 'Draw first, play up to the room limit, then pass.') => {
    const nextDeck = shuffleCards(makeDrawPile());
    const nextBotHands: Record<string, GameCard[]> = {};
    let deckOffset = OPENING_HAND_SIZE;
    tablePlayers
      .filter((player) => player.isBot)
      .forEach((player) => {
        nextBotHands[player.id] = nextDeck.slice(deckOffset, deckOffset + OPENING_HAND_SIZE);
        deckOffset += OPENING_HAND_SIZE;
      });
    setHand(nextDeck.slice(0, OPENING_HAND_SIZE));
    setBotHands(nextBotHands);
    setDrawPile(nextDeck.slice(deckOffset));
    setTableCards([]);
    setDiscardPile([]);
    setTurnPlays([]);
    setActionsPlayed(0);
    setActiveCardId(nextDeck[0]?.id ?? null);
    setCurrentPlayerIndex(0);
    setTurnSerial(0);
    setTurnActivitySerial(0);
    setDrawnTurnSerial(-1);
    setRound(1);
    setWinner(null);
    setDefendedOwners([]);
    setPlayerTargetPrompt(null);
    setStreetSwapPrompt(null);
    setSetTargetPrompt(null);
    setWildcardPrompt(null);
    setUpgradePrompt(null);
    setPaymentPrompt(null);
    executedBotTurnRef.current = '';
    setTurnLog(['Table opened. Draw happens at the start of each turn.']);
    setScreen('game');
    playTurnSound();
    showToast(toastTitle, toastBody);
  }, [playTurnSound, showToast, tablePlayers]);

  const startGame = useCallback(async () => {
    if (!canStartGame) {
      showToast(
        roomIsFull ? 'Room full' : 'Waiting for host',
        roomIsFull ? 'This lobby has no open seats.' : 'Only the host can start this game.'
      );
      return;
    }

    if (!hasMinimumPlayers) {
      showToast('Cannot start game', 'At least 2 players are required to start the game.');
      return;
    }

    if (sharedRoom) {
      try {
        const response = await fetch(`/api/rooms/${sharedRoom.code}/manage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'start', clientId: getOrCreateClientId() })
        });
        const result = (await response.json()) as { room?: SharedRoom; message?: string };
        if (!response.ok || !result.room) {
          showToast('Cannot start game', result.message ?? 'The room could not be locked.');
          return;
        }
        adoptSharedRoom(result.room);
      } catch {
        showToast('Cannot start game', 'The room service is unavailable.');
        return;
      }
    }

    resetGameForReplay();
  }, [adoptSharedRoom, canStartGame, hasMinimumPlayers, resetGameForReplay, roomIsFull, sharedRoom, showToast]);

  const enterStartedGame = useCallback(() => {
    if (!sharedRoom || sharedRoom.status !== 'playing') return;
    setScreen('game');
    showToast(
      isSpectator ? 'Spectator mode' : 'Game continued',
      isSpectator
        ? 'You are watching this table. Player controls are disabled.'
        : `Welcome back to room ${sharedRoom.code}.`
    );
  }, [isSpectator, sharedRoom, showToast]);

  const sendReplayAction = useCallback(async (action: 'request-replay' | 'accept-replay' | 'start-replay') => {
    if (!sharedRoom) return null;

    try {
      const response = await fetch(`/api/rooms/${sharedRoom.code}/manage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, clientId: getOrCreateClientId() })
      });
      const result = (await response.json()) as { room?: SharedRoom; message?: string };
      if (!response.ok || !result.room) {
        showToast('Replay not ready', result.message ?? 'The replay action could not be saved.');
        return null;
      }
      adoptSharedRoom(result.room);
      return result.room;
    } catch {
      showToast('Replay not ready', 'The room service is unavailable.');
      return null;
    }
  }, [adoptSharedRoom, sharedRoom, showToast]);

  const requestReplay = useCallback(async () => {
    if (!sharedRoom || sharedRoom.mode === 'bots' || sharedRoom.mode === 'offline') {
      resetGameForReplay('Replay started', 'Fresh deck, same table.');
      return;
    }

    const room = await sendReplayAction('request-replay');
    if (room) {
      showToast('Replay requested', 'Waiting for every online player to accept.');
    }
  }, [resetGameForReplay, sendReplayAction, sharedRoom, showToast]);

  const acceptReplay = useCallback(async () => {
    const room = await sendReplayAction('accept-replay');
    if (room) {
      showToast('Replay accepted', 'Waiting for the rest of the room.');
    }
  }, [sendReplayAction, showToast]);

  const startReplay = useCallback(async () => {
    if (!sharedRoom || sharedRoom.mode === 'bots' || sharedRoom.mode === 'offline') {
      resetGameForReplay('Replay started', 'Fresh deck, same table.');
      return;
    }

    const room = await sendReplayAction('start-replay');
    if (room) {
      resetGameForReplay('Replay started', 'Everyone accepted. Fresh deck, same table.');
    }
  }, [resetGameForReplay, sendReplayAction, sharedRoom]);

  const handleScannerJoin = useCallback(
    (value: string) => {
      const cleanValue = value.trim();
      if (!parseInvitePayload(cleanValue)) {
        showToast('Invite not found', 'Paste a room link, room code, or LAN key.');
        return;
      }

      setScannerOpen(false);
      void applyInvite(cleanValue);
    },
    [applyInvite, showToast]
  );

  const canPlayCard = useCallback(
    (card: GameCard) => {
      const normalizedType = normalizePlayType(card);

      if (card.actionKind === 'block' && normalizedType !== 'money') {
        return 'Just Say No can only be banked or used when an action targets you.';
      }

      if (card.actionKind === 'doubleRent' && normalizedType !== 'money') {
        return 'Double Up is played from a rent card. Choose a rent card, then turn on Double Up there.';
      }

      if (rules.playStyle === 'rush' && actionsPlayed >= 2) {
        return 'Rush tables allow 2 cards each turn.';
      }

      if (rules.playStyle === 'draft' && actionsPlayed >= 2) {
        return 'Draft tables play 2 cards after drawing.';
      }

      if (rules.playStyle === 'anyThree' && actionsPlayed >= 3) {
        return 'This room allows 3 cards each turn.';
      }

      if (rules.playStyle === 'oneEach' && turnPlays.includes(normalizedType)) {
        return `One each mode already used a ${normalizedType} card.`;
      }

      if (rules.playStyle === 'oneEach' && actionsPlayed >= 3) {
        return 'One each mode allows 3 cards total.';
      }

      return null;
    },
    [actionsPlayed, rules.playStyle, turnPlays]
  );

  const playSelectedCard = useCallback((cardOverride?: GameCard) => {
    const selectedCard = cardOverride ?? activeCard;
    if (!selectedCard || !isLocalPlayerTurn || isCardAnimating || winner) return;

    const blockedReason = canPlayCard(selectedCard);
    if (blockedReason) {
      showToast(selectedCard.actionKind === 'doubleRent' ? 'Double Up' : 'Room rule', blockedReason);
      return;
    }

    const upgradeKind =
      selectedCard.actionKind === 'house' || selectedCard.actionKind === 'hotel'
        ? selectedCard.actionKind
        : null;
    const eligibleUpgradeDistricts = upgradeKind
      ? getEligibleUpgradeDistricts(tableCards, activePlayer?.name ?? 'You', upgradeKind)
      : [];
    if (upgradeKind && eligibleUpgradeDistricts.length === 0) {
      showToast(
        upgradeKind === 'house' ? 'No district to develop' : 'No district to upgrade',
        upgradeKind === 'house'
          ? 'Block Works needs a complete district without a development.'
          : 'Skyline Landmark needs a complete district that already has Block Works.'
      );
      return;
    }

    const playedBy = activePlayer?.name ?? 'You';
    if (selectedCard.actionKind === 'rent' && !canChargeRent(tableCards, playedBy)) {
      const ownsProperty = tableCards.some((item) => item.owner === playedBy && item.zone === 'property');
      showToast(
        'Rent blocked',
        ownsProperty
          ? 'No rival has bank money or property to pay.'
          : 'You need a property on the table before charging rent.'
      );
      return;
    }

    if (selectedCard.actionKind === 'birthday' && getRivalOwnersWithPayableAssets(tableCards, playedBy).length === 0) {
      showToast('No payments', 'No rival has bank money or property to pay.');
      return;
    }

    if (selectedCard.actionKind === 'stealProperty' && getLoosePropertyTargets(tableCards, playedBy).length === 0) {
      showToast('Plot Grab blocked', 'No loose rival property is available yet.');
      return;
    }

    const normalizedType = normalizePlayType(selectedCard);
    const newLogs = [`${playedBy} played ${selectedCard.name}.`];
    const zone = getZoneForCard(selectedCard);
    const emptiesHand = hand.length === 1;

    animateHandCard(selectedCard, zone, () => {
      const playedCard = makeDiscardCard(selectedCard, playedBy);
      const discardAfterPlay =
        selectedCard.type === 'wild' || upgradeKind
          ? discardPile
          : zone === 'action'
            ? [playedCard, ...discardPile]
            : discardPile;
      const refillResult = emptiesHand
        ? drawWithRecycledPile({
            pile: drawPile,
            count: EMPTY_HAND_DRAW,
            discardPile: discardAfterPlay
          })
        : {
            drawn: [] as GameCard[],
            remaining: drawPile,
            discardPile: discardAfterPlay,
            recycled: false
          };
      const refillCards = refillResult.drawn;
      if (selectedCard.type === 'wild') {
        setWildcardPrompt({ card: selectedCard, owner: playedBy });
        newLogs.unshift('Choose a district color for Wildcard Lease.');
      } else if (upgradeKind) {
        setUpgradePrompt({
          card: selectedCard,
          owner: playedBy,
          kind: upgradeKind,
          districtNames: eligibleUpgradeDistricts.map((district) => district.name)
        });
        newLogs.unshift(
          upgradeKind === 'house'
            ? 'Choose a complete district for Block Works.'
            : 'Choose a developed district for Skyline Landmark.'
        );
      } else {
        if (zone !== 'action') {
          setTableCards((cards) => [playedCard, ...cards]);
        }
      }
      setHand((cards) => cards.filter((card) => card.id !== selectedCard.id));
      setTurnPlays((plays) => [...plays, normalizedType]);
      setActionsPlayed((count) => count + 1);
      setTurnActivitySerial((serial) => serial + 1);

      if (selectedCard.actionKind === 'draw') {
        const drawActionResult = drawWithRecycledPile({
          pile: refillResult.remaining,
          count: 2,
          discardPile: refillResult.discardPile
        });
        const drawnCards = drawActionResult.drawn;
        const actualDrawCount = drawnCards.length;
        const allDrawnCards = [...refillCards, ...drawnCards];
        setDrawPile(drawActionResult.remaining);
        setDiscardPile(drawActionResult.discardPile);
        if (allDrawnCards.length > 0) {
          animateDrawCards(allDrawnCards, () => setHand((cards) => [...cards, ...allDrawnCards]));
        }
        if (refillCards.length > 0) newLogs.unshift(`Your empty hand was immediately refilled with ${refillCards.length} cards.`);
        if (refillResult.recycled || drawActionResult.recycled) {
          newLogs.unshift('The discard pile was shuffled into a fresh draw pile.');
        }
        newLogs.unshift(
          actualDrawCount > 0
            ? `Permit Push drew ${actualDrawCount} card${actualDrawCount === 1 ? '' : 's'}.`
            : 'Permit Push found the draw pile empty.'
        );
        showToast('Permit Push', actualDrawCount > 0 ? `Drew ${actualDrawCount} cards.` : 'Draw pile is empty.');
      } else {
        setDrawPile(refillResult.remaining);
        setDiscardPile(refillResult.discardPile);
        if (refillCards.length > 0) {
          animateDrawCards(refillCards, () => setHand((cards) => [...cards, ...refillCards]));
          newLogs.unshift(`Your empty hand was immediately refilled with ${refillCards.length} cards.`);
          if (refillResult.recycled) {
            newLogs.unshift('The discard pile was shuffled into a fresh draw pile.');
          }
          showToast('Hand refilled', `You drew ${refillCards.length} cards.`);
        }
      }

      const blockTargetedAction = (owner: string) => {
        if (!defendedOwners.includes(owner)) return false;
        setDefendedOwners((owners) => owners.filter((candidate) => candidate !== owner));
        newLogs.unshift(`${owner}'s Just Say No cancelled the action.`);
        showToast('Action blocked', `${owner} used Just Say No.`);
        return true;
      };

      if (selectedCard.actionKind === 'rent') {
        const rivalOwners = Array.from(
          new Set(
            tableCards
              .filter(
                (item) =>
                  item.owner !== playedBy &&
                  (item.zone === 'bank' || item.zone === 'property')
              )
              .map((item) => item.owner)
          )
        );
        if (rivalOwners.length > 0) {
          const doubleRentCard = hand.find((card) => card.actionKind === 'doubleRent');
          const canUseDoubleRent =
            Boolean(doubleRentCard) &&
            actionsPlayed + 1 < turnLimit &&
            (rules.playStyle !== 'oneEach' || !turnPlays.includes('action'));
          setRentTargetPrompt({
            action: selectedCard,
            actor: playedBy,
            targetOwners: rivalOwners,
            doubleRentCardId: canUseDoubleRent ? doubleRentCard?.id : undefined,
            useDoubleRent: false
          });
          newLogs.unshift('Rent Rush is waiting for you to choose who pays.');
        } else {
          newLogs.unshift('Rent Rush found no rival assets to collect.');
          showToast('Rent Rush', 'No rival has money or property available.');
        }
      } else if (selectedCard.actionKind === 'stealProperty') {
        const targets = getLoosePropertyTargets(tableCards, playedBy);
        if (targets.length > 0) {
          setPlayerTargetPrompt({
            action: selectedCard,
            targetKeys: targets.map(getTableCardKey)
          });
          newLogs.unshift('Plot Grab is waiting for you to choose a loose rival property.');
        } else {
          newLogs.unshift('Plot Grab needs a loose rival property target.');
          showToast('Plot Grab', 'No loose rival property is available yet.');
        }
      } else if (selectedCard.actionKind === 'swapProperty') {
        const ownTargets = getLoosePropertiesForOwner(tableCards, playedBy);
        const rivalTargets = getLoosePropertyTargets(tableCards, playedBy);
        if (ownTargets.length > 0 && rivalTargets.length > 0) {
          setStreetSwapPrompt({
            action: selectedCard,
            actor: playedBy,
            ownKeys: ownTargets.map(getTableCardKey),
            rivalKeys: rivalTargets.map(getTableCardKey)
          });
          newLogs.unshift('Street Swap is waiting for you to choose both properties.');
        } else {
          newLogs.unshift('Street Swap needs one of your properties and one rival property.');
          showToast('Street Swap', 'No valid property pair is available yet.');
        }
      } else if (selectedCard.actionKind === 'stealSet') {
        const completeSets = getCompleteSetTargets(tableCards, playedBy);
        if (completeSets.length === 1) {
          const target = completeSets[0];
          if (!blockTargetedAction(target.owner)) {
            setTableCards((cards) =>
              cards.map((item) =>
                item.owner === target.owner &&
                item.zone === 'property' &&
                item.card.district === target.district
                  ? { ...item, owner: playedBy }
                  : item
              )
            );
            newLogs.unshift(`Deal Breaker stole ${target.owner}'s complete ${target.district} district.`);
            showToast('Deal Breaker', `${target.district} now belongs to you.`);
          }
        } else if (completeSets.length > 1) {
          setSetTargetPrompt({ action: selectedCard, targets: completeSets });
          newLogs.unshift('Deal Breaker is waiting for you to choose a complete district.');
        } else {
          newLogs.unshift('Deal Breaker needs a rival complete district.');
          showToast('Deal Breaker', 'No rival has a complete district to take.');
        }
      } else if (selectedCard.actionKind === 'birthday') {
        const rivalOwners = getRivalOwnersWithPayableAssets(tableCards, playedBy);
        let collectedValue = 0;
        const paymentKeys = new Set<string>();
        rivalOwners.forEach((owner) => {
          if (blockTargetedAction(owner)) return;
          const payment = choosePaymentCards(tableCards, owner, 2);
          payment.chosen.forEach((item) => paymentKeys.add(`${item.owner}:${item.card.id}`));
          collectedValue += payment.total;
        });
        if (paymentKeys.size > 0) {
          setTableCards((cards) =>
            cards.map((item) =>
              paymentKeys.has(`${item.owner}:${item.card.id}`)
                ? { ...item, owner: playedBy }
                : item
            )
          );
          newLogs.unshift(`Celebration Collection received ${collectedValue}M with no change returned.`);
          showToast('Celebration payout', `Collected ${collectedValue}M from rival banks.`);
        } else if (rivalOwners.length === 0) {
          newLogs.unshift('Celebration Collection found no rival assets.');
          showToast('No payments', 'No rival has money or property available.');
        }
	      }

	      setTurnLog((entries) => [...newLogs, ...entries].slice(0, 40));
      setActiveCardId(null);
    });
  }, [activeCard, activePlayer, actionsPlayed, animateDrawCards, animateHandCard, bankCards, canPlayCard, defendedOwners, discardPile, drawPile, hand, isCardAnimating, isLocalPlayerTurn, propertyCards, rules.playStyle, showToast, tableCards, turnLimit, turnPlays, winner]);

  const assignWildcardDistrict = useCallback((districtName: string) => {
    if (!wildcardPrompt) return;
    const allowedDistricts = wildcardPrompt.card.wildDistricts?.length
      ? wildcardPrompt.card.wildDistricts
      : districtSets.map((district) => district.name);
    if (!allowedDistricts.includes(districtName)) return;
    const district = districtSets.find((item) => item.name === districtName);
    if (!district) return;

    const assignedCard: GameCard = {
      ...wildcardPrompt.card,
      district: district.name,
      setSize: district.size,
      accent: district.accent,
      text: `Wildcard assigned to the ${district.name} district.`
    };
    setTableCards((cards) => [
      {
        card: assignedCard,
        zone: 'property',
        playedAs: 'property',
        owner: wildcardPrompt.owner
      } satisfies TableCard,
      ...cards
    ]);
    setTurnLog((entries) => [
      `${wildcardPrompt.owner} assigned Wildcard Lease to ${district.name}.`,
      ...entries
    ].slice(0, 40));
    showToast('Wildcard assigned', `Wildcard Lease joined ${district.name}.`);
    setWildcardPrompt(null);
  }, [showToast, wildcardPrompt]);

  const assignUpgradeDistrict = useCallback((districtName: string) => {
    if (!upgradePrompt || !upgradePrompt.districtNames.includes(districtName)) return;
    const district = districtSets.find((item) => item.name === districtName);
    if (!district) return;

    const upgradedCard: GameCard = {
      ...upgradePrompt.card,
      district: district.name,
      accent: district.accent,
      text:
        upgradePrompt.kind === 'house'
          ? `Block Works development on the ${district.name} district.`
          : `Skyline Landmark on the developed ${district.name} district.`
    };
    setTableCards((cards) => [
      {
        card: upgradedCard,
        zone: 'property',
        playedAs: 'action',
        owner: upgradePrompt.owner
      } satisfies TableCard,
      ...cards
    ]);
    setTurnLog((entries) => [
      `${upgradePrompt.owner} added ${upgradePrompt.card.name} to ${district.name}.`,
      ...entries
    ].slice(0, 40));
    showToast(upgradePrompt.card.name, `${district.name} was upgraded.`);
    setUpgradePrompt(null);
  }, [showToast, upgradePrompt]);

  const togglePaymentCard = useCallback((paymentKey: string) => {
    setPaymentPrompt((current) => {
      if (!current) return current;
      if (current.forcedKeys.includes(paymentKey)) return current;

      const availableAssets = tableCards.filter(
        (item) =>
          item.owner === current.payer &&
          (item.zone === 'bank' || item.zone === 'property') &&
          item.card.value > 0
      );
      const clicked = availableAssets.find((item) => getPaymentKey(item) === paymentKey);
      const bankTotal = availableAssets
        .filter((item) => item.zone === 'bank')
        .reduce((sum, item) => sum + item.card.value, 0);
      if (bankTotal >= current.amount && clicked?.zone === 'property') return current;

      const selectedKeys = current.selectedKeys.includes(paymentKey)
        ? current.selectedKeys.filter((key) => key !== paymentKey)
        : [...current.selectedKeys, paymentKey];
      return { ...current, selectedKeys };
    });
  }, [tableCards]);

  const confirmPayment = useCallback(() => {
    if (!paymentPrompt) return;
    const selected = tableCards.filter((item) =>
      paymentPrompt.selectedKeys.includes(getPaymentKey(item)) &&
      (item.zone === 'bank' || item.zone === 'property') &&
      item.card.value > 0
    );
    const total = selected.reduce((sum, item) => sum + item.card.value, 0);
    const availableTotal = tableCards
      .filter(
        (item) =>
          item.owner === paymentPrompt.payer &&
          (item.zone === 'bank' || item.zone === 'property') &&
          item.card.value > 0
      )
      .reduce((sum, item) => sum + item.card.value, 0);
    if (total < paymentPrompt.amount && total < availableTotal) {
      showToast('Payment incomplete', `Select at least ${paymentPrompt.amount}M of assets.`);
      return;
    }

    const paymentKeys = new Set(paymentPrompt.selectedKeys);
    const nextPayee = paymentPrompt.payee;
    const nextActionName = paymentPrompt.actionName;
    const completePayment = () => {
      setTableCards((cards) =>
        cards.map((item) =>
          paymentKeys.has(getPaymentKey(item))
            ? { ...item, owner: nextPayee }
            : item
        )
      );
      setTurnLog((entries) => [
        `${paymentPrompt.payer} paid ${total}M to ${nextPayee} for ${nextActionName}.`,
        ...entries
      ].slice(0, 40));
      showToast('Payment made', `${total}M paid with no change.`);
      setPaymentPrompt(null);
      setPaymentBlockPrompt(null);
      const continueAction = paymentContinueRef.current;
      paymentContinueRef.current = null;
      continueAction?.();
    };

    animatePlayedCardsToOwner(selected, nextPayee, completePayment);
  }, [animatePlayedCardsToOwner, paymentPrompt, showToast, tableCards]);

  const playBlockFromPayment = useCallback(() => {
    if (!paymentBlockPrompt || !incomingActionResolveRef.current) return;
    setPaymentPrompt(null);
    setPaymentBlockPrompt(null);
    incomingActionResolveRef.current(true);
  }, [paymentBlockPrompt]);

  const toggleRentDouble = useCallback(() => {
    setRentTargetPrompt((current) =>
      current?.doubleRentCardId ? { ...current, useDoubleRent: !current.useDoubleRent } : current
    );
  }, []);

  const resolveRentTarget = useCallback((targetOwner: string) => {
    if (!rentTargetPrompt) return;

    if (defendedOwners.includes(targetOwner)) {
      setDefendedOwners((owners) => owners.filter((owner) => owner !== targetOwner));
      setTurnLog((entries) => [
        `${targetOwner}'s Just Say No cancelled Rent Rush.`,
        ...entries
      ].slice(0, 40));
      showToast('Action blocked', `${targetOwner} used Just Say No.`);
      setRentTargetPrompt(null);
      return;
    }

    const doubleRentCard =
      rentTargetPrompt.useDoubleRent && rentTargetPrompt.doubleRentCardId
        ? hand.find((card) => card.id === rentTargetPrompt.doubleRentCardId)
        : undefined;
    const rentAmount = rentTargetPrompt.action.value * (doubleRentCard ? 2 : 1);
    const payment = choosePaymentCards(tableCards, targetOwner, rentAmount);
    if (payment.chosen.length === 0) {
      setTurnLog((entries) => [
        `${targetOwner} has no bank money or property to pay Rent Rush.`,
        ...entries
      ].slice(0, 40));
      showToast('Rent Rush', `${targetOwner} has no table assets to pay.`);
      setRentTargetPrompt(null);
      return;
    }

    const payee = rentTargetPrompt.actor;
    const paymentKeys = new Set(payment.chosen.map(getPaymentKey));
    const bankPaid = payment.chosen
      .filter((item) => item.zone === 'bank')
      .reduce((total, item) => total + item.card.value, 0);
    const propertyPaid = payment.chosen
      .filter((item) => item.zone === 'property')
      .reduce((total, item) => total + item.card.value, 0);
    const paymentParts = [
      bankPaid > 0 ? `${bankPaid}M bank money` : '',
      propertyPaid > 0 ? `${propertyPaid}M property` : ''
    ].filter(Boolean);
    const completeRentPayment = () => {
      setTableCards((cards) =>
        cards.map((item) =>
          paymentKeys.has(getPaymentKey(item))
            ? { ...item, owner: payee }
            : item
        )
      );
      setTurnLog((entries) => [
        `${rentTargetPrompt.action.name}${doubleRentCard ? ' with Double Up' : ''} moved ${paymentParts.join(' and ')} from ${targetOwner} to ${payee}.`,
        ...entries
      ].slice(0, 40));
      showToast(
        doubleRentCard ? 'Double Up rent' : rentTargetPrompt.action.name,
        `${targetOwner} paid ${payment.total}M: ${paymentParts.join(' and ')}.`
      );
    };
    if (doubleRentCard) {
      setHand((cards) => cards.filter((card) => card.id !== doubleRentCard.id));
      setDiscardPile((cards) => [makeDiscardCard(doubleRentCard, payee), ...cards]);
      setTurnPlays((plays) => [...plays, normalizePlayType(doubleRentCard)]);
      setActionsPlayed((count) => count + 1);
      setTurnActivitySerial((serial) => serial + 1);
    }
    setRentTargetPrompt(null);
    animatePlayedCardsToOwner(payment.chosen, payee, completeRentPayment);
  }, [animatePlayedCardsToOwner, defendedOwners, hand, rentTargetPrompt, showToast, tableCards]);

  const resolvePlayerTarget = useCallback((targetKey: string) => {
    if (!playerTargetPrompt) return;
    const [targetOwner, targetId] = targetKey.split(':');
    if (defendedOwners.includes(targetOwner)) {
      setDefendedOwners((owners) => owners.filter((owner) => owner !== targetOwner));
      setTurnLog((entries) => [`${targetOwner}'s Just Say No cancelled Plot Grab.`, ...entries].slice(0, 40));
      showToast('Action blocked', `${targetOwner} used Just Say No.`);
    } else {
      const targetCard = tableCards.find((item) => item.owner === targetOwner && item.card.id === targetId);
      const targetName = targetCard?.card.name ?? 'property';
      const completeSteal = () => setTableCards((cards) =>
        cards.map((item) => {
          if (item.owner === targetOwner && item.card.id === targetId) {
            return { ...item, owner: 'You' };
          }
          return item;
        })
      );
      if (targetCard) animatePlayedCardsToOwner([targetCard], 'You', completeSteal);
      else completeSteal();
      setTurnLog((entries) => [`You took ${targetName} from ${targetOwner}.`, ...entries].slice(0, 40));
      showToast('Plot Grab', `Took ${targetName} from ${targetOwner}.`);
    }
    setPlayerTargetPrompt(null);
  }, [animatePlayedCardsToOwner, defendedOwners, playerTargetPrompt, showToast, tableCards]);

  const resolveStreetSwap = useCallback(() => {
    if (!streetSwapPrompt?.selectedRivalKey || !streetSwapPrompt.selectedOwnKey) return;
    const [rivalOwner, rivalId] = streetSwapPrompt.selectedRivalKey.split(':');
    const [ownOwner, ownId] = streetSwapPrompt.selectedOwnKey.split(':');
    if (ownOwner !== streetSwapPrompt.actor) return;

    const rivalCard = tableCards.find((item) => item.owner === rivalOwner && item.card.id === rivalId);
    const ownCard = tableCards.find((item) => item.owner === ownOwner && item.card.id === ownId);
    if (!rivalCard || !ownCard) {
      showToast('Street Swap', 'That swap is no longer available.');
      setStreetSwapPrompt(null);
      return;
    }

    if (defendedOwners.includes(rivalOwner)) {
      setDefendedOwners((owners) => owners.filter((owner) => owner !== rivalOwner));
      setTurnLog((entries) => [`${rivalOwner}'s Just Say No cancelled Street Swap.`, ...entries].slice(0, 40));
      showToast('Action blocked', `${rivalOwner} used Just Say No.`);
      setStreetSwapPrompt(null);
      return;
    }

    const completeSwap = () => setTableCards((cards) =>
      cards.map((item) => {
        if (item.owner === ownOwner && item.card.id === ownId) {
          return { ...item, owner: rivalOwner };
        }
        if (item.owner === rivalOwner && item.card.id === rivalId) {
          return { ...item, owner: streetSwapPrompt.actor };
        }
        return item;
      })
    );

    animatePlayedCardsToOwner([rivalCard], streetSwapPrompt.actor, completeSwap);
    setTurnLog((entries) => [
      `Street Swap traded ${ownCard.card.name} to ${rivalOwner} for ${rivalCard.card.name}.`,
      ...entries
    ].slice(0, 40));
    showToast('Street Swap', `Swapped ${ownCard.card.name} for ${rivalCard.card.name}.`);
    setStreetSwapPrompt(null);
  }, [animatePlayedCardsToOwner, defendedOwners, showToast, streetSwapPrompt, tableCards]);

  const resolveSetTarget = useCallback((targetKey: string) => {
    if (!setTargetPrompt) return;
    const target = setTargetPrompt.targets.find((item) => item.key === targetKey);
    if (!target) return;

    if (defendedOwners.includes(target.owner)) {
      setDefendedOwners((owners) => owners.filter((owner) => owner !== target.owner));
      setTurnLog((entries) => [`${target.owner}'s Just Say No cancelled Deal Breaker.`, ...entries].slice(0, 40));
      showToast('Action blocked', `${target.owner} used Just Say No.`);
    } else {
      const stolenCards = tableCards.filter(
        (item) =>
          item.owner === target.owner &&
          item.zone === 'property' &&
          item.card.district === target.district
      );
      const completeSteal = () => setTableCards((cards) =>
        cards.map((item) =>
          item.owner === target.owner &&
          item.zone === 'property' &&
          item.card.district === target.district
            ? { ...item, owner: 'You' }
            : item
        )
      );
      animatePlayedCardsToOwner(stolenCards, 'You', completeSteal);
      setTurnLog((entries) => [
        `You stole ${target.owner}'s complete ${target.district} district with Deal Breaker.`,
        ...entries
      ].slice(0, 40));
      showToast('Deal Breaker', `${target.district} now belongs to you.`);
    }

    setSetTargetPrompt(null);
  }, [animatePlayedCardsToOwner, defendedOwners, setTargetPrompt, showToast, tableCards]);

  const bankSelectedCard = useCallback(() => {
    if (!activeCard || !isLocalPlayerTurn || isCardAnimating || winner) return;
      const canBankActionLike =
	      rules.actionCardsAsMoney && (activeCard.type === 'action' || activeCard.type === 'rent' || activeCard.type === 'defense');
	    if (activeCard.type !== 'money' && !canBankActionLike) {
	      showToast('Bank blocked', 'Only money cards or allowed action cards can be banked.');
	      return;
	    }

    const blockedReason = canPlayCard({ ...activeCard, type: 'money' });
    if (blockedReason) {
      showToast('Room rule', blockedReason);
      return;
    }

    const bankedCard: TableCard = {
      card: activeCard,
      zone: 'bank',
      playedAs: 'money',
      owner: activePlayer?.name ?? 'You'
    };
    const emptiesHand = hand.length === 1;

    animateHandCard(activeCard, 'bank', () => {
      const refillResult = emptiesHand
        ? drawWithRecycledPile({
            pile: drawPile,
            count: EMPTY_HAND_DRAW,
            discardPile
          })
        : {
            drawn: [] as GameCard[],
            remaining: drawPile,
            discardPile,
            recycled: false
          };
      const refillCards = refillResult.drawn;
      setTableCards((cards) => [bankedCard, ...cards]);
      setHand((cards) => cards.filter((card) => card.id !== activeCard.id));
      setDrawPile(refillResult.remaining);
      setDiscardPile(refillResult.discardPile);
      if (refillCards.length > 0) {
        animateDrawCards(refillCards, () => setHand((cards) => [...cards, ...refillCards]));
        showToast('Hand refilled', `You drew ${refillCards.length} cards.`);
      }
      setTurnPlays((plays) => [...plays, 'money']);
      setActionsPlayed((count) => count + 1);
      setTurnActivitySerial((serial) => serial + 1);
      setTurnLog((entries) => [
        ...(refillResult.recycled ? ['The discard pile was shuffled into a fresh draw pile.'] : []),
        ...(refillCards.length > 0 ? [`Your empty hand was immediately refilled with ${refillCards.length} cards.`] : []),
        `${activePlayer?.name ?? 'You'} banked ${activeCard.name}.`,
        ...entries
      ].slice(0, 40));
      setActiveCardId(null);
    });
	  }, [activeCard, activePlayer, animateDrawCards, animateHandCard, canPlayCard, discardPile, drawPile, hand.length, isCardAnimating, isLocalPlayerTurn, rules.actionCardsAsMoney, showToast, winner]);

  const advanceTurn = useCallback(() => {
    if (!tablePlayers.length || winner || turnTransitionRef.current) return;
    turnTransitionRef.current = true;
    setIsTurnTransitioning(true);

    const nextIndex = (currentPlayerIndex + 1) % tablePlayers.length;
    const nextPlayer = tablePlayers[nextIndex];
    setCurrentPlayerIndex(nextIndex);
    setTurnSerial((value) => value + 1);
    if (nextIndex === 0) setRound((value) => value + 1);
    setTurnPlays([]);
    setActionsPlayed(0);
    setTurnActivitySerial(0);
    setActiveCardId(hand[0]?.id ?? null);
    if (!isSpectator && nextPlayer?.id === 'host') playTurnSound();
    showToast(`${nextPlayer?.name ?? 'Next player'}'s turn`, 'The table is waiting for the next move.');
    window.setTimeout(() => {
      turnTransitionRef.current = false;
      setIsTurnTransitioning(false);
    }, 450);
  }, [currentPlayerIndex, hand, isSpectator, playTurnSound, showToast, tablePlayers, winner]);

  const finishEndTurn = useCallback(() => {
    if (hand.length > MAX_HAND_SIZE) {
      setDiscardPrompt({
        count: hand.length - MAX_HAND_SIZE,
        selectedIds: []
      });
      return;
    }

    advanceTurn();
  }, [advanceTurn, hand.length]);

  const requestEndTurn = useCallback(() => {
    if (!isLocalPlayerTurn || turnTransitionRef.current || discardPrompt) return;
    if (isLocalPlayerTurn && remainingPlays > 0 && hand.length > 0) {
      setConfirmEndTurnOpen(true);
      return;
    }

    finishEndTurn();
  }, [discardPrompt, finishEndTurn, hand.length, isLocalPlayerTurn, remainingPlays]);

  const toggleDiscardCard = useCallback((cardId: string) => {
    setDiscardPrompt((current) => {
      if (!current) return current;
      const isSelected = current.selectedIds.includes(cardId);
      if (isSelected) {
        return {
          ...current,
          selectedIds: current.selectedIds.filter((id) => id !== cardId)
        };
      }

      if (current.selectedIds.length >= current.count) return current;

      return {
        ...current,
        selectedIds: [...current.selectedIds, cardId]
      };
    });
  }, []);

  const confirmDiscardCards = useCallback(() => {
    if (!discardPrompt || discardPrompt.selectedIds.length !== discardPrompt.count) {
      showToast('Choose cards to discard', `Pick ${discardPrompt?.count ?? 0} card${discardPrompt?.count === 1 ? '' : 's'} before ending your turn.`);
      return;
    }

    const selectedIds = new Set(discardPrompt.selectedIds);
    const discardedNames = hand
      .filter((card) => selectedIds.has(card.id))
      .map((card) => card.name);
    const discardedCards = hand
      .filter((card) => selectedIds.has(card.id))
      .map((card) => makeDiscardCard(card, 'You'));

    setHand((cards) => cards.filter((card) => !selectedIds.has(card.id)));
    setDiscardPile((cards) => [...discardedCards, ...cards]);
    setActiveCardId((current) => (current && selectedIds.has(current) ? null : current));
    setTurnLog((entries) => [
      `You discarded ${discardedNames.join(', ')} to reach the 7 card hand limit.`,
      ...entries
    ].slice(0, 40));
    setDiscardPrompt(null);
    advanceTurn();
  }, [advanceTurn, discardPrompt, hand, showToast]);

  useEffect(() => {
    if (screen !== 'game' || !isLocalPlayerTurn || drawnTurnSerial === turnSerial || winner) return;

    const drawCount = NORMAL_TURN_DRAW;
    const drawResult = drawWithRecycledPile({
      pile: drawPile,
      count: drawCount,
      discardPile
    });
    const drawnCards = drawResult.drawn;
    const actualDrawCount = drawnCards.length;

    setDrawnTurnSerial(turnSerial);
    if (actualDrawCount === 0) {
      showToast('No cards available', 'Every card is currently in a hand or on the table.');
      return;
    }

    animateDrawCards(drawnCards, () => {
      setDrawPile(drawResult.remaining);
      setDiscardPile(drawResult.discardPile);
      setHand((cards) => [...cards, ...drawnCards]);
      setActiveCardId((current) => current ?? drawnCards[0]?.id ?? null);
      setTurnLog((entries) => [
        ...(drawResult.recycled ? ['The discard pile was shuffled into a fresh draw pile.'] : []),
        `You drew ${actualDrawCount} card${actualDrawCount === 1 ? '' : 's'} at turn start.`,
        ...entries
      ].slice(0, 40));
      if (drawResult.recycled) {
        showToast('Draw pile refreshed', 'Discarded cards were shuffled into a new pile.');
      }
    });
  }, [animateDrawCards, discardPile, drawPile, drawnTurnSerial, isLocalPlayerTurn, screen, showToast, turnSerial, winner]);

  useEffect(() => {
    if (screen !== 'game' || !activePlayer?.isBot || winner) return;

    const delay = activePlayer.difficulty === 'hard' ? 1200 : activePlayer.difficulty === 'medium' ? 1550 : 1900;
    const timeout = window.setTimeout(() => {
      const botTurnKey = `${turnSerial}:${activePlayer.id}`;
      if (executedBotTurnRef.current === botTurnKey) return;
      executedBotTurnRef.current = botTurnKey;

      const drawResult = drawWithRecycledPile({
        pile: drawPile,
        count: NORMAL_TURN_DRAW,
        discardPile
      });
	      const drawnCards = drawResult.drawn;
	      const availableCards = [...(botHands[activePlayer.id] ?? []), ...drawnCards];
	      const moves: GameCard[] = [];
	      let remainingHand = [...availableCards];
	      let simulatedCards = [...tableCards];
	      const botPlayLimit = rules.playStyle === 'rush' || rules.playStyle === 'draft' ? 2 : 3;
	      const canBotUseCard = (card: GameCard) => {
	        const botName = activePlayer.name;
	        if (card.actionKind === 'block') return false;
	        if (card.actionKind === 'house' || card.actionKind === 'hotel') {
	          return getEligibleUpgradeDistricts(simulatedCards, botName, card.actionKind).length > 0;
	        }
	        if (card.actionKind === 'stealSet') {
	          return getCompleteSetTargets(simulatedCards, botName).length > 0;
	        }
	        if (card.actionKind === 'stealProperty') {
	          return getLoosePropertyTargets(simulatedCards, botName).length > 0;
	        }
        if (card.actionKind === 'swapProperty') {
	          const botHasLooseProperty = getLoosePropertiesForOwner(simulatedCards, botName).length > 0;
	          const rivalHasLooseProperty = getLoosePropertyTargets(simulatedCards, botName).length > 0;
	          return botHasLooseProperty && rivalHasLooseProperty;
	        }
          if (card.actionKind === 'rent') {
            return canChargeRent(simulatedCards, botName);
          }
          if (card.actionKind === 'birthday') {
            return getRivalOwnersWithPayableAssets(simulatedCards, botName).length > 0;
          }
	        return true;
	      };
	
	      while (moves.length < botPlayLimit && remainingHand.length > 0) {
	        const unusedNames = remainingHand.filter(
	          (card) => !moves.some((move) => move.name === card.name)
	        );
	        const candidatePool = unusedNames.length > 0 ? unusedNames : remainingHand;
	        const selectionPool = candidatePool.filter(canBotUseCard);
	        const selectedMove = chooseBotMove(activePlayer.difficulty ?? 'medium', selectionPool);
	        if (!selectedMove) break;
	        moves.push(selectedMove);
          const selectedZone = getZoneForCard(selectedMove);
          if (selectedZone !== 'action') {
            simulatedCards = [
              {
                card: selectedMove,
                zone: selectedZone,
                playedAs: normalizePlayType(selectedMove),
                owner: activePlayer.name
              },
              ...simulatedCards
            ];
          }
	        remainingHand = remainingHand.filter((card) => card.id !== selectedMove.id);
      }

      if (moves.length === 0) {
        setDrawPile(drawResult.remaining);
        setDiscardPile(drawResult.discardPile);
        setBotHands((hands) => ({
          ...hands,
          [activePlayer.id]: remainingHand
        }));
        advanceTurn();
        return;
      }
      const refillResult =
        remainingHand.length === 0
          ? drawWithRecycledPile({
              pile: drawResult.remaining,
              count: EMPTY_HAND_DRAW,
              discardPile: drawResult.discardPile
            })
          : {
              drawn: [] as GameCard[],
              remaining: drawResult.remaining,
              discardPile: drawResult.discardPile,
              recycled: false
            };
      const refillCards = refillResult.drawn;
      setDrawPile(refillResult.remaining);
      setDiscardPile(refillResult.discardPile);
      setBotHands((hands) => ({
        ...hands,
        [activePlayer.id]: [...remainingHand, ...refillCards]
      }));
      setTurnLog((entries) => [
        `${activePlayer.name} drew ${drawnCards.length} card${drawnCards.length === 1 ? '' : 's'}.`,
        ...((drawResult.recycled || refillResult.recycled)
          ? ['The discard pile was shuffled into a fresh draw pile.']
          : []),
        ...entries
      ].slice(0, 40));
      const sourceRect = tablePlayerRefs.current.get(activePlayer.id)?.getBoundingClientRect();
      const botCardRect = sourceRect
        ? {
            left: sourceRect.left + sourceRect.width / 2 - 54,
            top: sourceRect.top + sourceRect.height / 2 - 72,
            width: 108,
            height: 144
          }
        : null;

      const playMove = (moveIndex: number) => {
        const move = moves[moveIndex];
        if (!move) {
          if (refillCards.length > 0) {
            setTurnLog((entries) => [
              `${activePlayer.name} refilled an empty hand with ${refillCards.length} cards.`,
              ...entries
            ].slice(0, 40));
          }
          advanceTurn();
          return;
        }

        const botWildcardDistrict =
          move.type === 'wild'
            ? districtSets
                .map((district) => {
                  const count = tableCards.filter(
                    (item) =>
                      item.owner === activePlayer.name &&
                      item.zone === 'property' &&
                      item.card.district === district.name
                  ).length;
                  return { district, count, remaining: district.size - count };
                })
                .filter((item) => item.remaining > 0)
                .sort((left, right) => left.remaining - right.remaining || right.count - left.count)[0]?.district
            : undefined;
        const botUpgradeKind =
          move.actionKind === 'house' || move.actionKind === 'hotel'
            ? move.actionKind
            : undefined;
        const botUpgradeDistrict = botUpgradeKind
          ? getEligibleUpgradeDistricts(tableCards, activePlayer.name, botUpgradeKind)[0]
          : undefined;
        const playedMove =
          move.type === 'wild' && botWildcardDistrict
            ? {
                ...move,
                district: botWildcardDistrict.name,
                setSize: botWildcardDistrict.size,
                accent: botWildcardDistrict.accent,
                text: `Wildcard assigned to the ${botWildcardDistrict.name} district.`
              }
            : botUpgradeDistrict
              ? {
                  ...move,
                  district: botUpgradeDistrict.name,
                  accent: botUpgradeDistrict.accent,
                  text:
                    botUpgradeKind === 'house'
                      ? `Block Works development on the ${botUpgradeDistrict.name} district.`
                      : `Skyline Landmark on the developed ${botUpgradeDistrict.name} district.`
                }
            : move;
        const zone = getZoneForCard(playedMove);
        const target = zone === 'property' || zone === 'bank'
          ? tablePlayerRefs.current.get(activePlayer.id) ?? feltTableRef.current
          : drawPileRef.current;
        const targetRect = target?.getBoundingClientRect();

        animateCardTransfer(
          [move],
          botCardRect ? [botCardRect] : [],
          targetRect ? toCardRect(targetRect) : null,
          false,
          () => {
            const playedTableCard: TableCard = {
              card: playedMove,
              zone,
              playedAs: normalizePlayType(playedMove),
              owner: activePlayer.name
            };
            if (zone === 'action') {
              setDiscardPile((cards) => [playedTableCard, ...cards]);
            } else {
              setTableCards((cards) => [playedTableCard, ...cards]);
            }
            setTurnLog((entries) => [
              `${activePlayer.name} played ${move.name}${
                botWildcardDistrict
                  ? ` as ${botWildcardDistrict.name}`
                  : botUpgradeDistrict
                    ? ` on ${botUpgradeDistrict.name}`
                    : ''
              }.`,
              ...entries
            ].slice(0, 40));

            const yourAssets = tableCards.filter(
              (item) => item.owner === 'You' && (item.zone === 'bank' || item.zone === 'property')
            );
            const yourPayableAssets = yourAssets.filter((item) => item.card.value > 0);
            const yourProperties = tableCards.filter((item) => item.owner === 'You' && item.zone === 'property');
            const yourLooseProperty = getLoosePropertiesForOwner(tableCards, 'You')[0];
            const botHasLooseProperty = getLoosePropertiesForOwner(tableCards, activePlayer.name).length > 0;
            const dealBreakerTargets =
              move.actionKind === 'stealSet'
                ? getCompleteSetTargets(tableCards, activePlayer.name).sort((left, right) => right.value - left.value)
                : [];
            const dealBreakerTarget = dealBreakerTargets[0];
            const rentTargetOwner =
              move.actionKind === 'rent'
                ? chooseBotPayableTarget(tableCards, activePlayer.name, activePlayer.difficulty)
                : undefined;
            const birthdayTargetOwners =
              move.actionKind === 'birthday'
                ? getRivalOwnersWithPayableAssets(tableCards, activePlayer.name)
                : [];
            const targetsLocalPlayer =
              (move.actionKind === 'rent' && rentTargetOwner === 'You' && yourPayableAssets.length > 0) ||
              (move.actionKind === 'birthday' && birthdayTargetOwners.includes('You') && yourPayableAssets.length > 0) ||
              (move.actionKind === 'stealProperty' && Boolean(yourLooseProperty)) ||
              (move.actionKind === 'swapProperty' && botHasLooseProperty && getLoosePropertiesForOwner(tableCards, 'You').length > 0) ||
              (move.actionKind === 'stealSet' && dealBreakerTarget?.owner === 'You');

            if (move.actionKind === 'stealSet' && !targetsLocalPlayer) {
              if (dealBreakerTarget) {
                const stolenCards = tableCards.filter(
                  (item) =>
                    item.owner === dealBreakerTarget.owner &&
                    item.zone === 'property' &&
                    item.card.district === dealBreakerTarget.district
                );
                animatePlayedCardsToOwner(stolenCards, activePlayer.name, () => {
                  setTableCards((cards) =>
                    cards.map((item) =>
                      item.owner === dealBreakerTarget.owner &&
                      item.zone === 'property' &&
                      item.card.district === dealBreakerTarget.district
                        ? { ...item, owner: activePlayer.name }
                        : item
                    )
                  );
                  setTurnLog((entries) => [
                    `${activePlayer.name} stole ${dealBreakerTarget.owner}'s complete ${dealBreakerTarget.district} district with Deal Breaker.`,
                    ...entries
                  ].slice(0, 40));
                  window.setTimeout(() => playMove(moveIndex + 1), 450);
                });
                return;
              } else {
                setTurnLog((entries) => [
                  `${activePlayer.name}'s Deal Breaker found no complete rival district.`,
                  ...entries
                ].slice(0, 40));
              }
              window.setTimeout(() => playMove(moveIndex + 1), 850);
              return;
            }

            if (move.actionKind === 'rent' && rentTargetOwner && rentTargetOwner !== 'You') {
              const payment = choosePaymentCards(tableCards, rentTargetOwner, move.value);
              if (payment.chosen.length > 0) {
                const paymentKeys = new Set(payment.chosen.map(getPaymentKey));
                animatePlayedCardsToOwner(payment.chosen, activePlayer.name, () => {
                  setTableCards((cards) =>
                    cards.map((item) =>
                      paymentKeys.has(getPaymentKey(item))
                        ? { ...item, owner: activePlayer.name }
                        : item
                    )
                  );
                  setTurnLog((entries) => [
                    `${move.name} moved ${payment.total}M from ${rentTargetOwner} to ${activePlayer.name}.`,
                    ...entries
                  ].slice(0, 40));
                  window.setTimeout(() => playMove(moveIndex + 1), 450);
                });
                return;
              }
              window.setTimeout(() => playMove(moveIndex + 1), 850);
              return;
            }

            if (move.actionKind === 'birthday') {
              const nonHumanTargets = birthdayTargetOwners.filter((owner) => owner !== 'You');
              const paymentKeys = new Set<string>();
              let collectedValue = 0;
              nonHumanTargets.forEach((owner) => {
                const payment = choosePaymentCards(tableCards, owner, 2);
                payment.chosen.forEach((item) => paymentKeys.add(getPaymentKey(item)));
                collectedValue += payment.total;
              });
              if (paymentKeys.size > 0) {
                setTableCards((cards) =>
                  cards.map((item) =>
                    paymentKeys.has(getPaymentKey(item))
                      ? { ...item, owner: activePlayer.name }
                      : item
                  )
                );
                setTurnLog((entries) => [
                  `Celebration Collection moved ${collectedValue}M from other rivals to ${activePlayer.name}.`,
                  ...entries
                ].slice(0, 40));
              }
              if (!targetsLocalPlayer) {
                window.setTimeout(() => playMove(moveIndex + 1), 850);
                return;
              }
            }

            if (move.actionKind === 'stealProperty' && !targetsLocalPlayer) {
              const looseTarget = getLoosePropertyTargets(tableCards, activePlayer.name)
                .filter((item) => item.owner !== 'You')[0];
              if (looseTarget) {
                animatePlayedCardsToOwner([looseTarget], activePlayer.name, () => {
                  setTableCards((cards) =>
                    cards.map((item) =>
                      item.owner === looseTarget.owner && item.card.id === looseTarget.card.id
                        ? { ...item, owner: activePlayer.name }
                        : item
                    )
                  );
                  setTurnLog((entries) => [
                    `${activePlayer.name} took ${looseTarget.card.name} from ${looseTarget.owner} with ${move.name}.`,
                    ...entries
                  ].slice(0, 40));
                  window.setTimeout(() => playMove(moveIndex + 1), 450);
                });
                return;
              }
              window.setTimeout(() => playMove(moveIndex + 1), 850);
              return;
            }

            if (move.actionKind === 'swapProperty' && !targetsLocalPlayer) {
              const ownLoose = getLoosePropertiesForOwner(tableCards, activePlayer.name)[0];
              const rivalLoose = getLoosePropertyTargets(tableCards, activePlayer.name)
                .filter((item) => item.owner !== 'You')[0];
              if (ownLoose && rivalLoose) {
                animatePlayedCardsToOwner([rivalLoose], activePlayer.name, () => {
                  setTableCards((cards) =>
                    cards.map((item) => {
                      if (item.owner === ownLoose.owner && item.card.id === ownLoose.card.id) {
                        return { ...item, owner: rivalLoose.owner };
                      }
                      if (item.owner === rivalLoose.owner && item.card.id === rivalLoose.card.id) {
                        return { ...item, owner: activePlayer.name };
                      }
                      return item;
                    })
                  );
                  setTurnLog((entries) => [
                    `${activePlayer.name} swapped ${ownLoose.card.name} for ${rivalLoose.owner}'s ${rivalLoose.card.name}.`,
                    ...entries
                  ].slice(0, 40));
                  window.setTimeout(() => playMove(moveIndex + 1), 450);
                });
                return;
              }
              window.setTimeout(() => playMove(moveIndex + 1), 850);
              return;
            }

            if (targetsLocalPlayer) {
              setIncomingActionPrompt({ actor: activePlayer.name, action: move });
              incomingActionResolveRef.current = (blocked) => {
                const continueBotTurn = () => {
                  incomingActionResolveRef.current = null;
                  setIncomingActionPrompt(null);
                  setPaymentBlockPrompt(null);
                  window.setTimeout(() => playMove(moveIndex + 1), 850);
                };
                if (blocked) {
                  const hardPass = hand.find((card) => card.actionKind === 'block');
                  if (hardPass) {
                    setHand((cards) => cards.filter((card) => card.id !== hardPass.id));
                    setDiscardPile((cards) => [makeDiscardCard(hardPass, 'You'), ...cards]);
                    setTurnLog((entries) => [`You used Just Say No against ${move.name}.`, ...entries].slice(0, 40));
                  }
                } else {
                  if (move.actionKind === 'rent' || move.actionKind === 'birthday') {
                    const amount = move.actionKind === 'birthday' ? 2 : move.value;
                    const availableAssets = tableCards.filter(
                      (item) =>
                        item.owner === 'You' &&
                        (item.zone === 'bank' || item.zone === 'property') &&
                        item.card.value > 0
	                    );
	                    if (availableAssets.length > 0) {
	                      const paymentPlan = choosePaymentCards(tableCards, 'You', amount);
	                      const bankTotal = availableAssets
	                        .filter((item) => item.zone === 'bank')
	                        .reduce((sum, item) => sum + item.card.value, 0);
	                      const selectedKeys =
	                        bankTotal >= amount
	                          ? paymentPlan.chosen
	                              .filter((item) => item.zone === 'bank')
	                              .map(getPaymentKey)
	                          : availableAssets
	                              .filter((item) => item.zone === 'bank')
	                              .map(getPaymentKey);
	                      const forcedKeys = bankTotal >= amount ? [] : selectedKeys;
	                      setIncomingActionPrompt(null);
	                      setPaymentBlockPrompt(
	                        hand.some((card) => card.actionKind === 'block')
	                          ? { actor: activePlayer.name, action: move }
	                          : null
	                      );
	                      setPaymentPrompt({
	                        payer: 'You',
	                        payee: activePlayer.name,
	                        amount,
	                        actionName: move.name,
	                        selectedKeys,
	                        forcedKeys
	                      });
	                      paymentContinueRef.current = continueBotTurn;
	                      return;
	                    }
                  }
                  const currentYourProperties = tableCards.filter((item) => item.owner === 'You' && item.zone === 'property');

                  if (move.actionKind === 'stealProperty') {
                    const looseProperty = getLoosePropertiesForOwner(tableCards, 'You')[0];
                    if (looseProperty) {
                      setIncomingActionPrompt(null);
                      animatePlayedCardsToOwner([looseProperty], activePlayer.name, () => {
                        setTableCards((cards) =>
                          cards.map((item) =>
                            item.owner === 'You' && item.card.id === looseProperty.card.id
                              ? { ...item, owner: activePlayer.name }
                              : item
                          )
                        );
                        setTurnLog((entries) => [`${activePlayer.name}'s ${move.name} resolved against you.`, ...entries].slice(0, 40));
                        continueBotTurn();
                      });
                      return;
                    }
                  }

                  if (move.actionKind === 'stealSet') {
                    const districts = new Map<string, TableCard[]>();
                    currentYourProperties.forEach((item) => {
                      if (
                        item.playedAs !== 'property' ||
                        !item.card.district ||
                        item.card.district === 'Wildcard'
                      ) return;
                      districts.set(item.card.district, [...(districts.get(item.card.district) ?? []), item]);
                    });
                    const complete = Array.from(districts.values()).find(
                      (items) => items.length >= (items[0]?.card.setSize ?? Number.POSITIVE_INFINITY)
                    );
                    const district = complete?.[0]?.card.district;
                    if (district && complete) {
                      setIncomingActionPrompt(null);
                      animatePlayedCardsToOwner(complete, activePlayer.name, () => {
                        setTableCards((cards) =>
                          cards.map((item) =>
                            item.owner === 'You' &&
                            item.zone === 'property' &&
                            item.card.district === district
                              ? { ...item, owner: activePlayer.name }
                              : item
                          )
                        );
                        setTurnLog((entries) => [`${activePlayer.name}'s ${move.name} resolved against you.`, ...entries].slice(0, 40));
                        continueBotTurn();
                      });
                      return;
                    }
                  }

                  if (move.actionKind === 'swapProperty') {
                    const yours = getLoosePropertiesForOwner(tableCards, 'You')[0];
                    const bots = getLoosePropertiesForOwner(tableCards, activePlayer.name)[0];
                    if (yours && bots) {
                      setIncomingActionPrompt(null);
                      animatePlayedCardsToOwner([yours], activePlayer.name, () => {
                        setTableCards((cards) =>
                          cards.map((item) => {
                            if (item.owner === 'You' && item.card.id === yours.card.id) {
                              return { ...item, owner: activePlayer.name };
                            }
                            if (item.owner === activePlayer.name && item.card.id === bots.card.id) {
                              return { ...item, owner: 'You' };
                            }
                            return item;
                          })
                        );
                        setTurnLog((entries) => [`${activePlayer.name}'s ${move.name} resolved against you.`, ...entries].slice(0, 40));
                        continueBotTurn();
                      });
                      return;
                    }
                  }
                }
                continueBotTurn();
              };
              return;
            }

            window.setTimeout(() => playMove(moveIndex + 1), 800);
          }
        );
      };

      playMove(0);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [activePlayer, advanceTurn, animateCardTransfer, animatePlayedCardsToOwner, botHands, discardPile, drawPile, hand, rules.playStyle, screen, tableCards, turnSerial, winner]);

  useEffect(() => {
    if (screen !== 'game' || !isLocalPlayerTurn || !rules.reminderEverySeconds) return;

    const interval = window.setInterval(() => {
      playTurnSound();
      showToast('Still your turn', 'Taking your sweet turn. Drag this away when you are back.');
    }, rules.reminderEverySeconds * 1000);

    return () => window.clearInterval(interval);
  }, [isLocalPlayerTurn, playTurnSound, rules.reminderEverySeconds, screen, showToast, turnActivitySerial]);

  useEffect(() => {
    if (screen !== 'game' || isSpectator) {
      handAutoOpenedRef.current = false;
      return;
    }

    if (isLocalPlayerTurn && handCollapsed) {
      handAutoOpenedRef.current = true;
      setHandCollapsed(false);
      return;
    }

    if (!isLocalPlayerTurn && handAutoOpenedRef.current) {
      handAutoOpenedRef.current = false;
      setHandCollapsed(true);
    }
  }, [handCollapsed, isLocalPlayerTurn, isSpectator, screen]);

  const updatePlayers = (value: number) => {
    const nextValue = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, value));
    setPlayers(nextValue);
    setBots((current) => Math.min(current, nextValue - 1, MAX_BOTS));
  };

  const updateBots = (value: number) => {
    setBots(Math.max(0, Math.min(maxBotsForPlayers, value)));
  };

  const updateCurrentRoom = useCallback(async () => {
    if (!sharedRoom || roomRole !== 'host' || sharedRoom.status !== 'lobby') return;

    try {
      const response = await fetch(`/api/rooms/${sharedRoom.code}/manage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          clientId: getOrCreateClientId(),
          maxPlayers: players,
          bots,
          difficulty,
          rules
        })
      });
      const result = (await response.json()) as { room?: SharedRoom; message?: string };
      if (!response.ok || !result.room) {
        showToast('Update failed', result.message ?? 'The room settings could not be updated.');
        return;
      }

      adoptSharedRoom(result.room);
      setConfirmDiscardSettingsOpen(false);
      setScreen('lobby');
      showToast('Room updated', `Settings for ${result.room.code} were saved.`);
    } catch {
      showToast('Update failed', 'The room service is unavailable.');
    }
  }, [adoptSharedRoom, bots, difficulty, players, roomRole, rules, sharedRoom, showToast]);

  const restoreSharedRoomSettings = useCallback(() => {
    if (!sharedRoom) return;
    setPlayers(sharedRoom.maxPlayers);
    setBots(sharedRoom.bots);
    setDifficulty(sharedRoom.difficulty);
    setRules(sharedRoom.rules);
  }, [sharedRoom]);

  const closeSettingsPanel = useCallback(() => {
    setConfirmDiscardSettingsOpen(false);
    setScreen(sharedRoom ? 'lobby' : 'dashboard');
  }, [sharedRoom]);

  const requestCloseSettingsPanel = useCallback(() => {
    if (roomSettingsDirty) {
      setConfirmDiscardSettingsOpen(true);
      return;
    }

    closeSettingsPanel();
  }, [closeSettingsPanel, roomSettingsDirty]);

  const discardSettingsChanges = useCallback(() => {
    restoreSharedRoomSettings();
    closeSettingsPanel();
  }, [closeSettingsPanel, restoreSharedRoomSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (confirmDiscardSettingsOpen) {
        event.preventDefault();
        setConfirmDiscardSettingsOpen(false);
        return;
      }

      if (rulesGuideOpen) {
        event.preventDefault();
        setRulesGuideOpen(false);
        return;
      }

      if (cardGuideOpen) {
        event.preventDefault();
        setCardGuideOpen(false);
        return;
      }

      if (scannerOpen) {
        event.preventDefault();
        setScannerOpen(false);
        return;
      }

      if (screen === 'settings' && sharedRoom) {
        event.preventDefault();
        requestCloseSettingsPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cardGuideOpen,
    confirmDiscardSettingsOpen,
    requestCloseSettingsPanel,
    rulesGuideOpen,
    scannerOpen,
    screen,
    sharedRoom
  ]);

  return (
    <main className="app-shell">
      <div className="app-frame">
        {screen !== 'dashboard' && (
          <TopBar
            code={code}
            screen={screen}
            settingsAvailable={Boolean(sharedRoom) && !roomHasStarted && roomRole === 'host'}
            onHome={navigateHome}
            onRules={() => setRulesGuideOpen(true)}
            onCards={() => setCardGuideOpen(true)}
            onSettings={() => setScreen('settings')}
          />
        )}

        {screen === 'dashboard' && (
          <DashboardScreen
            roomsCollapsed={roomsCollapsed}
            activeRooms={activeRooms}
            localMaintenance={localMaintenance}
            players={players}
            bots={bots}
            difficulty={difficulty}
            rules={rules}
            onOpenRules={() => setRulesGuideOpen(true)}
            onOpenCards={() => setCardGuideOpen(true)}
            onPlayOffline={navigateOffline}
            onPlayBots={() => void openRoom('bots', 4, 3)}
            onPlayOnline={() => setScreen('settings')}
            onRoomsCollapsedChange={setRoomsCollapsed}
            onDeleteRoom={deleteLocalRoom}
            onJoinRoom={(room) => void joinActiveRoom(room)}
            onPlayers={updatePlayers}
            onBots={updateBots}
            onDifficulty={setDifficulty}
            onRules={setRules}
            onCreate={() => void openRoom('online')}
            onClose={() => setScreen('dashboard')}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            players={players}
            bots={bots}
            difficulty={difficulty}
            rules={rules}
            editingRoom={Boolean(sharedRoom)}
            onPlayers={updatePlayers}
            onBots={updateBots}
            onDifficulty={setDifficulty}
            onRules={setRules}
            onCreate={sharedRoom ? () => void updateCurrentRoom() : () => void openRoom('online')}
            onClose={requestCloseSettingsPanel}
          />
        )}

        {screen === 'lobby' && (
          <LobbyScreen
            roomMode={roomMode}
            code={code}
            roomJoinMessage={roomJoinMessage}
            roomRole={roomRole}
            isSpectator={isSpectator}
            roomHasStarted={roomHasStarted}
            canStartGame={canStartGame}
            hasMinimumPlayers={hasMinimumPlayers}
            roomIsFull={roomIsFull}
            occupiedSeats={occupiedSeats}
            players={players}
            bots={bots}
            rules={rules}
            qr={qr}
            localKey={localKey}
            joinLink={joinLink}
            lobbyPlayers={lobbyPlayers}
            onPrimaryAction={() => {
              if (roomHasStarted) enterStartedGame();
              else void startGame();
            }}
            onCopyInvite={() => void copyInvite()}
            onOpenScanner={() => setScannerOpen(true)}
            onRemovePlayer={
              roomRole === 'host' && sharedRoom?.status === 'lobby'
                ? (player) => void removeLobbyPlayer(player)
                : undefined
            }
            canRemovePlayer={(player) =>
              player.cards > 0 &&
              player.id !== clientId &&
              !sharedRoom?.members.find((member) => member.id === player.id)?.isHost
            }
          />
        )}

        {screen === 'offline' && (
          <OfflineScreen
            localPlayerName={localPlayerName}
            localJoinKey={localJoinKey}
            onLocalPlayerNameChange={setLocalPlayerName}
            onLocalJoinKeyChange={setLocalJoinKey}
            onCreateLocalTable={() => void openRoom('offline')}
            onJoinLocalTable={() => void joinLocalTable()}
          />
        )}

        {screen === 'game' && (
          <section className="game-layout">
            {isSpectator && (
              <div className="spectator-banner" role="status">
                <Shield size={18} />
                <div>
                  <strong>Spectator mode</strong>
                  <span>You are watching room {code}. Player controls and private hand actions are disabled.</span>
                </div>
              </div>
            )}
            <div className="game-header">
              <div>
                <div className="section-kicker">Round {round}</div>
                <h1>{activeTurnLabel}</h1>
              </div>
              <div className="turn-tools">
                <MetaPill icon={<Timer size={16} />} label={`${rules.turnSeconds}s`} />
                <MetaPill icon={<Volume2 size={16} />} label={`${rules.reminderEverySeconds}s nudge`} />
                <div className="draw-pile-anchor" ref={drawPileRef}>
                  <MetaPill icon={<Layers size={16} />} label={`${drawPile.length} draw / ${discardPile.length} discard`} />
                </div>
              </div>
            </div>

            <div
              className="table-grid"
              ref={tableGridRef}
              style={{ '--player-panel-width': `${playerPanelWidth}px`, '--board-height': `${boardHeight}px` } as CSSProperties}
            >
              <div className="felt-table" ref={feltTableRef} onWheel={scrollPageFromFelt}>
                <TablePlayerLayout
                  players={tablePlayers}
                  activeIndex={currentPlayerIndex}
                  tableCards={tableCards}
                  playerRefs={tablePlayerRefs}
                />

                <button
                  className="table-resize-handle table-resize-handle-y"
                  type="button"
                  aria-label="Resize board height"
                  onPointerDown={resizeBoardHeight}
                />
              </div>
            </div>

            {!isSpectator && <div
              className={`hand-dock ${handCollapsed ? 'collapsed' : ''}`}
              style={{ '--hand-panel-height': `${handPanelHeight}px` } as CSSProperties}
            >
              {!handCollapsed && (
                <button
                  className="hand-resize-handle"
                  type="button"
                  aria-label="Resize hand panel"
                  title="Drag to resize. Double click to snap open or closed."
                  onPointerDown={resizeHandPanel}
                  onDoubleClick={toggleHandPanelHeight}
                />
              )}
              <div className="hand-toolbar">
                <div>
                  <div className="section-kicker">Your hand</div>
                  <strong>{actionsPlayed} played this turn - {hand.length} in hand</strong>
                </div>
                <div className="hand-activity-feed" aria-label="Recent game activity">
                  {turnLog.slice(0, 8).map((entry, index) => (
                    <p key={`${entry}-${index}`}>{entry}</p>
                  ))}
                </div>
                <div className="hand-action-stack">
                  <div className="hand-actions">
	                    <button
	                      className="primary-button"
	                      onClick={() => playSelectedCard()}
	                      disabled={!activeCard || activeCard.actionKind === 'block' || !isLocalPlayerTurn || isCardAnimating || remainingPlays === 0 || Boolean(winner)}
	                      title={activeCard?.actionKind === 'block' ? 'Just Say No is only played as a response.' : undefined}
	                    >
	                      <Play size={18} />
	                      Play
	                    </button>
                    <button className="ghost-button" onClick={bankSelectedCard} disabled={!activeCard || !isLocalPlayerTurn || isCardAnimating || remainingPlays === 0 || Boolean(winner)}>
                      <Trophy size={18} />
                      Bank
                    </button>
                    <button className="ghost-button" onClick={requestEndTurn} disabled={!isLocalPlayerTurn || isCardAnimating || isTurnTransitioning || Boolean(winner)}>
                      <RotateCcw size={18} />
                      End turn
                    </button>
                    <button
                      className="ghost-button hand-collapse-button"
                      onClick={() => {
                        if (handCollapseBlocked) return;
                        handAutoOpenedRef.current = false;
                        setHandCollapsed((current) => !current);
                      }}
                      disabled={handCollapseBlocked}
                      aria-expanded={!handCollapsed}
                      aria-label={`${handCollapsed ? 'Expand' : 'Collapse'} your hand panel`}
                      title={handCollapseBlocked ? 'Finish or end your turn before hiding your hand.' : undefined}
                    >
                      <ChevronRight size={18} />
                      {handCollapsed ? 'Show hand' : 'Hide hand'}
                    </button>
                  </div>
                </div>
              </div>

              {!handCollapsed && <div className="hand-summary" aria-label="Your table summary">
                <div className="hand-summary-slot" ref={boardSummaryRef}>
                  <TableMiniSummary
                    icon={<Layers size={15} />}
                    label="Board"
                    cards={yourPropertyCards}
                    total={`${yourCompletedSetCount}/3 sets`}
                    collapsed={handSummaryCollapsed.board}
                    onToggle={() => setHandSummaryCollapsed((current) => ({ ...current, board: !current.board }))}
                  />
                </div>
                <div className="hand-summary-slot" ref={bankSummaryRef}>
                  <TableMiniSummary
                    icon={<Trophy size={15} />}
                    label="Bank"
                    cards={yourBankCards}
                    total={`${yourBankValue}M`}
                    collapsed={handSummaryCollapsed.bank}
                    onToggle={() => setHandSummaryCollapsed((current) => ({ ...current, bank: !current.bank }))}
                  />
                </div>
              </div>}

              {!handCollapsed && <div className={`hand-scroll-wrap ${handCanScroll ? 'can-scroll' : ''}`}>
                <div className={`hand-scroll ${isCardAnimating ? 'animating' : ''}`} ref={handTargetRef}>
                  {hand.map((card) => (
                    <button
                      className={`game-card ${getWildcardBand(card) ? 'wild-choice' : ''} ${activeCardId === card.id ? 'selected' : ''} ${movingCardIds.includes(card.id) ? 'moving' : ''}`}
                      key={card.id}
                      ref={(node) => {
                        if (node) handCardRefs.current.set(card.id, node);
                        else handCardRefs.current.delete(card.id);
                      }}
                      onClick={() => {
                        if (!isCardAnimating) setActiveCardId(card.id);
                      }}
  	                    onDoubleClick={() => {
  	                      if (!isCardAnimating && remainingPlays > 0 && card.actionKind !== 'block') playSelectedCard(card);
  	                    }}
                      aria-disabled={isCardAnimating}
                      style={getCardStyle(card)}
                    >
                      <span className="card-kind">{card.type}</span>
                      {card.type === 'property' && card.district && card.setSize && (
                        <span
                          className="card-set-progress"
                          title={`${yourPropertyCards.filter((item) => item.playedAs === 'property' && item.card.district === card.district).length} of ${card.setSize} currently played`}
                        >
                          {yourPropertyCards.filter((item) => item.playedAs === 'property' && item.card.district === card.district).length}/{card.setSize}
                        </span>
                      )}
                      <span className="card-title-band">
                        <strong>{card.name}</strong>
                        {card.district && card.district !== 'Wildcard' && <small>{card.district}</small>}
                      </span>
                      <small className="card-copy">{card.text}</small>
                      <b className="card-value">{card.value}M</b>
                    </button>
                  ))}
                </div>
                <span className="scroll-hint-arrow" aria-hidden="true">
                  <ChevronRight size={24} />
                </span>
              </div>}
            </div>}
          </section>
        )}

        {cardFlights.map((flight) => (
          <FlyingCard flight={flight} key={flight.id} />
        ))}
        {rulesGuideOpen && (
          <RulesGuide rules={rules} onClose={() => setRulesGuideOpen(false)} />
        )}
        {cardGuideOpen && <CardGuide onClose={() => setCardGuideOpen(false)} />}
        {confirmDiscardSettingsOpen && (
          <ConfirmDiscardSettings
            onCancel={() => setConfirmDiscardSettingsOpen(false)}
            onConfirm={discardSettingsChanges}
          />
        )}
        {toast && <TurnToast key={toast.id} toast={toast} onDismiss={dismissToast} />}
        {scannerOpen && <ScannerPanel onClose={() => setScannerOpen(false)} onJoin={handleScannerJoin} />}
        {discardPrompt && (
          <DiscardPromptDialog
            prompt={discardPrompt}
            hand={hand}
            maxHandSize={MAX_HAND_SIZE}
            onToggleCard={toggleDiscardCard}
            onClose={() => setDiscardPrompt(null)}
            onConfirm={confirmDiscardCards}
          />
        )}
        {confirmEndTurnOpen && (
          <ConfirmEndTurn
            remainingPlays={remainingPlays}
            onCancel={() => setConfirmEndTurnOpen(false)}
            onConfirm={() => {
              setConfirmEndTurnOpen(false);
              finishEndTurn();
            }}
          />
        )}
        {rentTargetPrompt && (
          <RentTargetPromptDialog
            prompt={rentTargetPrompt}
            tableCards={tableCards}
            onToggleDouble={toggleRentDouble}
            onResolve={resolveRentTarget}
          />
        )}
        {playerTargetPrompt && (
          <PlayerTargetPromptDialog
            prompt={playerTargetPrompt}
            tableCards={tableCards}
            onResolve={resolvePlayerTarget}
          />
        )}
        {streetSwapPrompt && (
          <StreetSwapPromptDialog
            prompt={streetSwapPrompt}
            tableCards={tableCards}
            onSelectRival={(key) =>
              setStreetSwapPrompt((prompt) => (prompt ? { ...prompt, selectedRivalKey: key } : prompt))
            }
            onSelectOwn={(key) =>
              setStreetSwapPrompt((prompt) => (prompt ? { ...prompt, selectedOwnKey: key } : prompt))
            }
            onClose={() => setStreetSwapPrompt(null)}
            onResolve={resolveStreetSwap}
          />
        )}
        {setTargetPrompt && (
          <SetTargetPromptDialog prompt={setTargetPrompt} onResolve={resolveSetTarget} />
        )}
        {wildcardPrompt && (
          <WildcardPromptDialog
            prompt={wildcardPrompt}
            propertyCards={propertyCards}
            onAssign={assignWildcardDistrict}
          />
        )}
        {upgradePrompt && (
          <UpgradePromptDialog prompt={upgradePrompt} onAssign={assignUpgradeDistrict} />
        )}
        {paymentPrompt && (
          <PaymentPromptDialog
            prompt={paymentPrompt}
            tableCards={tableCards}
            hand={hand}
            canPlayBlock={Boolean(paymentBlockPrompt)}
            onToggleCard={togglePaymentCard}
            onPlayBlock={playBlockFromPayment}
            onConfirm={confirmPayment}
          />
        )}
        {incomingActionPrompt && (
          <IncomingActionPromptDialog
            prompt={incomingActionPrompt}
            hand={hand}
            onResolve={(blocked) => incomingActionResolveRef.current?.(blocked)}
          />
        )}
        {winner && (
          <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Game over">
            <div className="confirm-sheet">
              <div className="section-kicker">Game over</div>
              <Trophy size={38} />
              <h2>{winner === 'You' ? 'You won!' : `${winner} won`}</h2>
              <p>{winner} completed three full property districts. That ends the game.</p>
              {onlineReplayNeedsAccept && sharedRoom?.replay && (
                <p className="replay-status">
                  Replay accepted by {replayAcceptedCount}/{replayTotalCount} players.
                </p>
              )}
              <div className="confirm-actions">
                {!onlineReplayNeedsAccept && (
                  <button className="primary-button" onClick={() => void startReplay()}>
                    <RotateCcw size={18} />
                    Replay
                  </button>
                )}
                {onlineReplayNeedsAccept && !sharedRoom?.replay && !isSpectator && (
                  <button className="primary-button" onClick={() => void requestReplay()}>
                    <RotateCcw size={18} />
                    Request replay
                  </button>
                )}
                {onlineReplayNeedsAccept && sharedRoom?.replay && !currentPlayerAcceptedReplay && !isSpectator && (
                  <button className="primary-button" onClick={() => void acceptReplay()}>
                    <Check size={18} />
                    Accept replay
                  </button>
                )}
                {onlineReplayNeedsAccept && sharedRoom?.replay && roomRole === 'host' && (
                  <button
                    className="primary-button"
                    onClick={() => void startReplay()}
                    disabled={!allPlayersAcceptedReplay}
                  >
                    <Play size={18} />
                    Start rematch
                  </button>
                )}
                <button className="primary-button" onClick={navigateHome}>
                  <Home size={18} />
                  Return home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
