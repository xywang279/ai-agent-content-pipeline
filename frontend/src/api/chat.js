const API_BASE_URL = 'http://localhost:8000'; // FastAPI 默认端口

class ChatAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    // 添加认证 token（如果需要）
    this.token = localStorage.getItem('access_token');
  }

  // 设置认证 token
  setToken(token) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  // 获取请求头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // 发送消息到 AI
  async sendMessage(message, conversationId = null, sessionId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: message,
          conversation_id: conversationId,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 流式发送消息（如果 FastAPI 支持 SSE）
  async sendMessageStream(message, conversationId = null, onMessage, onError) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: message,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onMessage(data);
            } catch (e) {
              console.error('解析流数据失败:', e);
            }
          }
        });
      }
    } catch (error) {
      console.error('流式发送消息失败:', error);
      onError && onError(error);
    }
  }

  // 获取对话历史
  async getConversationHistory(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取对话历史失败:', error);
      throw error;
    }
  }

  // 获取所有对话列表
  async getAllConversations() {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取对话列表失败:', error);
      throw error;
    }
  }

  // 创建新对话
  async createNewConversation(title = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          title: title
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('创建新对话失败:', error);
      throw error;
    }
  }

  // 更新对话
  async updateConversation(conversationId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('更新对话失败:', error);
      throw error;
    }
  }

  // 删除对话
  async deleteConversation(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('删除对话失败:', error);
      throw error;
    }
  }

  // 用户登录
  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.access_token) {
        this.setToken(data.access_token);
      }
      
      return data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  // 用户注册
  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  // 获取用户信息
  async getUserInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }
}

export default new ChatAPI();