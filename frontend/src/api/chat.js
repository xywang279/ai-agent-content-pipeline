const API_BASE_URL = 'http://localhost:8000'; // FastAPI 默认端口
class ChatAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('access_token');
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
  async sendMessage(message, conversationId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 获取对话历史
  async getConversationHistory(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/conversations/${conversationId}`, {
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

  // 创建新对话
  async createNewConversation(title = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/conversations`, {
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

  // 获取所有对话列表
  async getAllConversations() {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/conversations`, {
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

  // 删除对话
  async deleteConversation(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/conversations/${conversationId}`, {
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

  // 清空对话
  async clearConversation(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/conversations/${conversationId}/clear`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('清空对话失败:', error);
      throw error;
    }
  }
  // 生成报告
  async generateReport(request) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/reports/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }

  // 优化报告
  async optimizeReport(request) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/reports/optimize`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('优化报告失败:', error);
      throw error;
    }
  }

  async exportReport (format, reportContent) {
    if (!reportContent) return;

    if (format === "pdf") {
      // === 生成 PDF ===
      const doc = new jsPDF();
      // 设置字体为中文
      doc.setFont("SimHei", "normal"); 
      doc.setFontSize(12);
      // 设置内容（自动换行）
      const lines = doc.splitTextToSize(reportContent, 180);
      doc.text(lines, 10, 10);
      // 下载
      doc.save("报告.pdf");
    } else if (format === "docx") {
      // === 生成 Word ===
      const paragraphs = reportContent.split("\n").map(
        (line) =>
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: "SimSun",
                size: 24, // 12pt
              }),
            ],
          })
      );

      const doc = new Document({
        sections: [{ children: paragraphs }],
      });

      Packer.toBlob(doc).then((blob) => {
        saveAs(blob, "报告.docx");
      });
    } else {
      console.warn("Unsupported format:", format);
      }
  }
  // 在现有方法基础上添加以下方法

// 上传文件
  async uploadFile(file, conversationId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', conversationId);
      
      const response = await fetch(`${this.baseUrl}/api/chat/upload`, {
        method: 'POST',
        body: formData,
        // 注意：不要设置 Content-Type，让浏览器自动设置
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
      console.log('文件上传成功:', data);
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }

  // 获取文件列表
  async getFileList(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/files/${conversationId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取文件列表失败:', error);
      throw error;
    }
  }

  // 预览文件
  async previewFile(fileId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/files/${fileId}/preview`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('预览文件失败:', error);
      throw error;
    }

  }
}

export default new ChatAPI();