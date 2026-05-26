import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============ Types ============

interface VoteData {
  sessionId: string
  platformId: string
  platform: 'TWITCH' | 'GOODGAME'
  vote: 1 | 2  // 1 = FOR, 2 = AGAINST
}

interface ActiveVoteSession {
  id: string
  postId: string
  durationSec: number
  startedAt: number  // timestamp
  votesFor: number
  votesAgainst: number
  voters: Map<string, { platform: string; vote: number }>  // platformId -> vote
  timer?: ReturnType<typeof setTimeout>
}

// ============ State ============

const activeSessions = new Map<string, ActiveVoteSession>()

// ============ Socket Handlers ============

io.on('connection', (socket) => {
  console.log(`[StreamPost] Client connected: ${socket.id}`)

  // ---- Moderation events ----

  // Join moderation room
  socket.on('moderation:join', () => {
    socket.join('moderation')
    console.log(`[Moderation] ${socket.id} joined moderation room`)
  })

  // Leave moderation room
  socket.on('moderation:leave', () => {
    socket.leave('moderation')
    console.log(`[Moderation] ${socket.id} left moderation room`)
  })

  // New post arrived (called by API after creating a post)
  socket.on('post:new', (postData) => {
    io.to('moderation').emit('post:new', postData)
    console.log(`[Moderation] New post broadcast: ${postData.id}`)
  })

  // Post status changed
  socket.on('post:status', (data: { postId: string; status: string }) => {
    io.to('moderation').emit('post:status', data)
    console.log(`[Moderation] Post ${data.postId} -> ${data.status}`)
  })

  // ---- Vote events ----

  // Join overlay room (for stream overlay)
  socket.on('overlay:join', () => {
    socket.join('overlay')
    console.log(`[Overlay] ${socket.id} joined overlay room`)
  })

  // Start a vote session
  socket.on('vote:start', (data: { sessionId: string; postId: string; durationSec: number }) => {
    const session: ActiveVoteSession = {
      id: data.sessionId,
      postId: data.postId,
      durationSec: data.durationSec,
      startedAt: Date.now(),
      votesFor: 0,
      votesAgainst: 0,
      voters: new Map(),
    }

    activeSessions.set(data.sessionId, session)

    // Notify all clients about the vote start
    io.to('moderation').emit('vote:start', {
      sessionId: data.sessionId,
      postId: data.postId,
      durationSec: data.durationSec,
    })

    io.to('overlay').emit('vote:start', {
      sessionId: data.sessionId,
      postId: data.postId,
      durationSec: data.durationSec,
    })

    console.log(`[Vote] Session ${data.sessionId} started (${data.durationSec}s)`)

    // Auto-close after duration + 2s buffer
    session.timer = setTimeout(() => {
      closeVoteSession(data.sessionId)
    }, (data.durationSec + 2) * 1000)
  })

  // Receive a vote from chat (Twitch/GoodGame)
  socket.on('vote:cast', (data: VoteData) => {
    const session = activeSessions.get(data.sessionId)
    if (!session) {
      socket.emit('vote:error', { message: 'Vote session not found or closed' })
      return
    }

    const voterKey = `${data.platform}:${data.platformId}`

    // Check if already voted - update vote
    const existingVote = session.voters.get(voterKey)
    if (existingVote) {
      // Update vote
      if (existingVote.vote === 1 && data.vote === 2) {
        session.votesFor--
        session.votesAgainst++
      } else if (existingVote.vote === 2 && data.vote === 1) {
        session.votesAgainst--
        session.votesFor++
      }
      existingVote.vote = data.vote
    } else {
      // New vote
      if (data.vote === 1) {
        session.votesFor++
      } else {
        session.votesAgainst++
      }
      session.voters.set(voterKey, { platform: data.platform, vote: data.vote })
    }

    const totalVoters = session.voters.size
    const updateData = {
      sessionId: data.sessionId,
      votesFor: session.votesFor,
      votesAgainst: session.votesAgainst,
      totalVoters,
      timeRemaining: Math.max(0, session.durationSec - Math.floor((Date.now() - session.startedAt) / 1000)),
    }

    // Broadcast to moderation and overlay
    io.to('moderation').emit('vote:update', updateData)
    io.to('overlay').emit('vote:update', updateData)
  })

  // Close vote session manually
  socket.on('vote:close', (data: { sessionId: string; finalDecision?: string }) => {
    closeVoteSession(data.sessionId, data.finalDecision as any)
  })

  // ---- Test event ----
  socket.on('test', (data) => {
    console.log('[Test] Received:', data)
    socket.emit('test-response', {
      message: 'StreamPost realtime service is running',
      data,
      timestamp: new Date().toISOString(),
    })
  })

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    console.log(`[StreamPost] Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[StreamPost] Socket error (${socket.id}):`, error)
  })
})

// ============ Helpers ============

function closeVoteSession(sessionId: string, finalDecision?: 'POSTED' | 'SKIPPED') {
  const session = activeSessions.get(sessionId)
  if (!session) return

  // Clear auto-close timer
  if (session.timer) {
    clearTimeout(session.timer)
  }

  const result = {
    sessionId,
    postId: session.postId,
    votesFor: session.votesFor,
    votesAgainst: session.votesAgainst,
    totalVoters: session.voters.size,
    finalDecision: finalDecision || (session.votesFor >= session.votesAgainst ? 'POSTED' : 'SKIPPED'),
  }

  // Broadcast to all rooms
  io.to('moderation').emit('vote:end', result)
  io.to('overlay').emit('vote:end', result)

  console.log(`[Vote] Session ${sessionId} closed: ${result.votesFor} FOR / ${result.votesAgainst} AGAINST -> ${result.finalDecision}`)

  // Remove from active sessions
  activeSessions.delete(sessionId)
}

// ============ Start Server ============

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[StreamPost] Realtime service running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[StreamPost] Received SIGTERM, shutting down...')
  httpServer.close(() => {
    console.log('[StreamPost] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[StreamPost] Received SIGINT, shutting down...')
  httpServer.close(() => {
    console.log('[StreamPost] Server closed')
    process.exit(0)
  })
})
