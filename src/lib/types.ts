export interface Player {
  id: string
  name: string
  email?: string
  technique: number // 1-10 estrelas
  speed: number // 1-10 estrelas
  totalVotes: number
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  name: string
  players: Player[]
  color: 'green' | 'white' | 'blue' | 'red'
}

export interface Draw {
  id: string
  date: Date
  gameDate: Date
  teams: Team[]
  selectedPlayers: string[] // IDs dos jogadores selecionados
  drawNumber: number
  createdBy: string
  createdAt: Date
}

export interface Vote {
  id: string
  gameId: string
  voterId: string
  targetPlayerId: string
  technique: number // 1-10
  speed: number // 1-10
  createdAt: Date
}

export interface AuditLog {
  id: string
  action: 'draw' | 'manual_draw' | 'vote' | 'player_created' | 'player_edited'
  description: string
  userId: string
  userName: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface WeeklyDrawCount {
  weekStart: Date
  weekEnd: Date
  count: number
}

export interface User {
  uid: string
  email: string
  displayName?: string
  isAdmin: boolean
}

export interface Game {
  id: string
  date: Date
  drawId?: string
  votingOpen: boolean
  votingClosed: boolean
  createdAt: Date
}
