// SSE Manager — singleton in-process registry.
// Maps userId (string) → Set<Response> so a user can have multiple connections
// (e.g. admin with two tabs open).

class SSEManager {
  constructor() {
    /** @type {Map<string, Set<import('express').Response>>} */
    this.clients = new Map();
    /** @type {Set<string>} */
    this.admins = new Set();
  }

  /**
   * Register a new SSE connection for a user.
   * Sends an immediate heartbeat to flush headers.
   * Sets up auto-cleanup on socket close.
   */
  register(userId, role, res) {
    const uid = String(userId);
    if (!this.clients.has(uid)) this.clients.set(uid, new Set());
    this.clients.get(uid).add(res);

    if (role === 'admin') this.admins.add(uid);

    // Heartbeat — prevents Nginx/proxies killing idle connections
    const heartbeat = setInterval(() => {
      res.write('event: ping\ndata: {}\n\n');
    }, 30_000);

    res.on('close', () => {
      clearInterval(heartbeat);
      const set = this.clients.get(uid);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          this.clients.delete(uid);
          if (role === 'admin') this.admins.delete(uid);
        }
      }
    });
  }

  /** Send an SSE event to a specific user (all their connections). */
  sendToUser(userId, event, data) {
    const connections = this.clients.get(String(userId));
    if (!connections || connections.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    connections.forEach((res) => res.write(payload));
  }

  /** Send an SSE event to all connected admin users without a DB query. */
  sendToAdmins(event, data) {
    this.admins.forEach((id) => this.sendToUser(id, event, data));
  }
}

export const sseManager = new SSEManager();
