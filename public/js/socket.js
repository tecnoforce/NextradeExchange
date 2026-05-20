class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = {};
    this.pendingSubscriptions = [];
  }

  connect() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[Socket] Connected');
      this.flushPendingSubscriptions();
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return this;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  subscribePair(pair) {
    if (!this.socket || !this.connected) {
      if (!this.pendingSubscriptions.includes(pair)) {
        this.pendingSubscriptions.push(pair);
      }
      return;
    }
    this.socket.emit('subscribe:pair', { pair });
  }

  unsubscribePair(pair) {
    this.pendingSubscriptions = this.pendingSubscriptions.filter(p => p !== pair);
    if (!this.socket || !this.connected) return;
    this.socket.emit('unsubscribe:pair', { pair });
  }

  subscribeAll() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('subscribe:all');
  }

  subscribeChart(pair, timeframe) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('subscribe:chart', { pair, timeframe });
  }

  unsubscribeChart(pair, timeframe) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('unsubscribe:chart', { pair, timeframe });
  }

  flushPendingSubscriptions() {
    const pairs = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];
    pairs.forEach(pair => {
      this.socket.emit('subscribe:pair', { pair });
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return this;
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    if (this.socket && callback) {
      this.socket.off(event, callback);
    }
  }
}

const socketManager = new SocketManager();