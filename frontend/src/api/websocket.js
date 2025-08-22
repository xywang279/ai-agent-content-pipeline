class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
    this.messageQueue = [];
  }

  // 根据环境变量或默认值构建 WebSocket URL
  getWebSocketUrl() {
    const apiUrl = 'http://localhost:8000/api/chat';
    // 将 http/https 转换为 ws/wss
    return apiUrl.replace(/^http/, 'ws') + '/ws';
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    return; // 已连接，无需重复连接
  }
    const wsUrl = this.getWebSocketUrl();
    console.log('连接 WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket 连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // 发送队列中的消息
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected');
        
        // 正常关闭不重连
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.emit('error', error);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('达到最大重连次数，停止重连');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  send(data) {
      let sendData = data;
  if (typeof data !== "string") {
    sendData = JSON.stringify(data);
  }
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
         this.ws.send(sendData);
        return true;
      } catch (error) {
        console.error('发送 WebSocket 消息失败:', error);
        return false;
      }
    } else {
      // 如果未连接，将消息加入队列
      console.log('WebSocket 未连接，消息加入队列');
      this.messageQueue.push(data);
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }

  // 事件监听器
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('事件回调执行失败:', error);
        }
      });
    }
  }
}

export default new WebSocketService();