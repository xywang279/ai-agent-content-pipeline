const API_BASE_URL = 'http://localhost:8000';

class RAGAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async upload(kbName, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).detail || '上传失败');
    return res.json();
  }

  async status(kbName) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/status`);
    if (!res.ok) throw new Error((await res.json()).detail || '状态查询失败');
    return res.json();
  }

  async query(kbName, question, topK = 5) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, top_k: topK }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || '检索失败');
    return res.json();
  }

  async docs(kbName) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs`);
    if (!res.ok) throw new Error((await res.json()).detail || '获取文档列表失败');
    return res.json();
  }

  async deleteDoc(kbName, fileName, keepFile = false) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs/${encodeURIComponent(fileName)}?keep_file=${keepFile ? 'true' : 'false'}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error((await res.json()).detail || '删除文档失败');
    return res.json();
  }

  async rebuild(kbName) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/rebuild`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error((await res.json()).detail || '重建索引失败');
    return res.json();
  }

  async previewDoc(kbName, fileName, maxLen = 1200) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs/${encodeURIComponent(fileName)}/preview?max_len=${maxLen}`);
    if (!res.ok) throw new Error((await res.json()).detail || '预览失败');
    return res.json();
  }

  async summarizeDoc(kbName, fileName) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs/${encodeURIComponent(fileName)}/summarize`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error((await res.json()).detail || '生成摘要失败');
    return res.json();
  }

  async segments(kbName, fileName, page = 1, pageSize = 1, basis = 'auto') {
    const url = `${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs/${encodeURIComponent(fileName)}/segments?page=${page}&page_size=${pageSize}&basis=${encodeURIComponent(basis)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).detail || '获取分段失败');
    return res.json();
  }

  async downloadFull(kbName, fileName, format = 'txt') {
    const url = `${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs/${encodeURIComponent(fileName)}/download?format=${encodeURIComponent(format)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).detail || '下载失败');
    const blob = await res.blob();
    return blob;
  }

  async exportSummary(kbName, fileName, format = 'txt') {
    const url = `${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/docs/${encodeURIComponent(fileName)}/summary/export?format=${encodeURIComponent(format)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).detail || '导出摘要失败');
    const blob = await res.blob();
    return blob;
  }

  async ingestExisting(kbName, filePath, fileName) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(kbName)}/ingest_existing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, file_name: fileName })
    });
    if (!res.ok) throw new Error((await res.json()).detail || '加入知识库失败');
    return res.json();
  }

  // ==== KB management ====
  async listKBs() {
    const res = await fetch(`${this.baseUrl}/api/rag/kb`);
    if (!res.ok) throw new Error((await res.json()).detail || '获取知识库失败');
    return res.json();
  }

  async createKB(name) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error((await res.json()).detail || '创建知识库失败');
    return res.json();
  }

  async deleteKB(name) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error((await res.json()).detail || '删除知识库失败');
    return res.json();
  }

  async renameKB(oldName, newName) {
    const res = await fetch(`${this.baseUrl}/api/rag/kb/${encodeURIComponent(oldName)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName })
    });
    if (!res.ok) throw new Error((await res.json()).detail || '重命名知识库失败');
    return res.json();
  }
}

export default new RAGAPI();
