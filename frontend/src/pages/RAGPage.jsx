import React, { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import ragApi from '../api/rag';
import '../styles/variables.scss';
import {
  Layout, Card, Space, Typography, Input, Button, Tag, Upload, List,
  Popconfirm, Tabs, Descriptions, Skeleton, message, Select, Modal, Empty, Divider, InputNumber
} from 'antd';
import {
  ReloadOutlined, CloudUploadOutlined, DeleteOutlined, EyeOutlined,
  FileTextOutlined, DownloadOutlined, FileSearchOutlined, SyncOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea, Search } = Input;
const { Sider, Content } = Layout;

const RAGPage = () => {
  const [kbName, setKbName] = useState('default');
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState([]);
  const [kbList, setKbList] = useState([]);

  // QA state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loadingQA, setLoadingQA] = useState(false);

  // Preview/Summary state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [preview, setPreview] = useState('');
  const [summary, setSummary] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [segPage, setSegPage] = useState(1);
  const [segTotal, setSegTotal] = useState(0);
  const [segPageSize, setSegPageSize] = useState(() => {
    const saved = parseInt(localStorage.getItem('rag.pageSize') || '1', 10);
    return Number.isNaN(saved) || saved < 1 ? 1 : saved;
  });
  const [segPageInput, setSegPageInput] = useState(1);
  const [basis, setBasis] = useState(() => localStorage.getItem('rag.basis') || 'auto');

  const [uploading, setUploading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameKbName, setRenameKbName] = useState('');
  const [docSearch, setDocSearch] = useState('');

  const refreshStatus = async () => {
    try {
      const s = await ragApi.status(kbName);
      setStatus(s);
    } catch (e) {
      setStatus({ kb: kbName, ready: false, doc_chunks: 0, error: e.message });
    }
  };

  const refreshDocs = async () => {
    try {
      const d = await ragApi.docs(kbName);
      setDocs(d.documents || []);
    } catch (e) {
      setDocs([]);
    }
  };

  const refreshKbList = async () => {
    try {
      const r = await ragApi.listKBs();
      setKbList(r.kbs || []);
      if (r.kbs && !r.kbs.find(k => k.name === kbName) && r.kbs.length) {
        setKbName(r.kbs[0].name);
      }
    } catch (e) {
      setKbList([]);
    }
  };

  useEffect(() => {
    refreshKbList();
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshDocs();
  }, [kbName]);

  const beforeUpload = async (file) => {
    setUploading(true);
    try {
      await ragApi.upload(kbName, file);
      await Promise.all([refreshStatus(), refreshDocs()]);
      message.success('上传并入库成功');
    } catch (err) {
      message.error(`上传失败: ${err.message}`);
    } finally {
      setUploading(false);
    }
    return false; // prevent auto upload
  };

  const onDelete = async (fileName) => {
    try {
      await ragApi.deleteDoc(kbName, fileName, false);
      await Promise.all([refreshStatus(), refreshDocs()]);
      message.success('删除成功');
    } catch (err) {
      message.error('删除失败: ' + err.message);
    }
  };

  const onRebuild = async () => {
    try {
      const hide = message.loading('正在重建索引...', 0);
      await ragApi.rebuild(kbName);
      await Promise.all([refreshStatus(), refreshDocs()]);
      hide();
      message.success('重建完成');
    } catch (err) {
      message.error('重建失败: ' + err.message);
    }
  };

  const loadPreview = async (fileName, page = 1) => {
    setLoadingPreview(true);
    setSelectedDoc(fileName);
    setSummary(null);
    try {
      const p = await ragApi.segments(kbName, fileName, page, segPageSize, basis);
      setSegPage(p.page);
      setSegPageInput(p.page);
      setSegTotal(p.total);
      setPreview((p.items || []).join('\n\n'));
    } catch (err) {
      setPreview('预览失败: ' + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Persist page size and basis; reload preview on change
  useEffect(() => {
    localStorage.setItem('rag.pageSize', String(segPageSize));
    if (selectedDoc) {
      loadPreview(selectedDoc, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segPageSize]);

  useEffect(() => {
    localStorage.setItem('rag.basis', basis);
    if (selectedDoc) {
      const key = `rag.lastPage.${kbName}.${selectedDoc}.${basis}`;
      const saved = parseInt(localStorage.getItem(key) || '1', 10);
      const pg = Number.isNaN(saved) || saved < 1 ? 1 : saved;
      loadPreview(selectedDoc, pg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis]);

  // Persist last page when it changes
  useEffect(() => {
    if (selectedDoc) {
      const key = `rag.lastPage.${kbName}.${selectedDoc}.${basis}`;
      localStorage.setItem(key, String(segPage));
    }
  }, [segPage, selectedDoc, kbName, basis]);

  const loadSummary = async (fileName) => {
    setLoadingSummary(true);
    setSelectedDoc(fileName);
    try {
      const s = await ragApi.summarizeDoc(kbName, fileName);
      setSummary(s);
    } catch (err) {
      setSummary({ error: '摘要失败: ' + err.message });
    } finally {
      setLoadingSummary(false);
    }
  };

  const onAsk = async () => {
    if (!question.trim()) return;
    setLoadingQA(true);
    setAnswer('');
    setSources([]);
    try {
      const res = await ragApi.query(kbName, question, 5);
      setAnswer(res.answer || '');
      setSources(res.sources || []);
    } catch (err) {
      setAnswer('检索失败: ' + err.message);
    } finally {
      setLoadingQA(false);
    }
  };

  const docActions = (item) => (
    <Space>
      <Button size="small" icon={<EyeOutlined />} onClick={() => {
        const key = `rag.lastPage.${kbName}.${item.file_name}.${basis}`;
        const saved = parseInt(localStorage.getItem(key) || '1', 10);
        const page = Number.isNaN(saved) || saved < 1 ? 1 : saved;
        loadPreview(item.file_name, page);
      }}>预览</Button>
      <Button size="small" icon={<FileSearchOutlined />} onClick={() => loadSummary(item.file_name)}>摘要</Button>
      <Popconfirm title={`删除文档 “${item.file_name}”？`} onConfirm={() => onDelete(item.file_name)}>
        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
      </Popconfirm>
    </Space>
  );

  const totalPages = Math.max(1, Math.ceil(segTotal / Math.max(1, segPageSize)));

  const previewFooter = (
    <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8 }}>
      <Space>
        <Button disabled={segPage <= 1 || loadingPreview} onClick={() => loadPreview(selectedDoc, segPage - 1)}>上一段</Button>
        <Text type="secondary">{segPage} / {totalPages}</Text>
        <Button disabled={segPage >= totalPages || loadingPreview} onClick={() => loadPreview(selectedDoc, segPage + 1)}>下一段</Button>
      </Space>
      <Space>
        <Text type="secondary">分段粒度</Text>
        <Select
          size="small"
          value={basis}
          onChange={setBasis}
          options={[
            { value: 'auto', label: '自动' },
            { value: 'pages', label: '页' },
            { value: 'paragraphs', label: '段' },
            { value: 'slides', label: '幻灯' },
          ]}
          style={{ width: 120 }}
        />
        <Text type="secondary">每页段数</Text>
        <InputNumber min={1} max={10} value={segPageSize} onChange={(v) => { const val = v || 1; setSegPageSize(val); localStorage.setItem('rag.pageSize', String(val)); if (selectedDoc) loadPreview(selectedDoc, 1); }} />
        <Text type="secondary">跳转到</Text>
        <InputNumber min={1} max={totalPages} value={segPageInput} onChange={(v) => setSegPageInput(v || 1)} />
        <Button onClick={() => selectedDoc && loadPreview(selectedDoc, Math.min(Math.max(1, segPageInput), totalPages))}>跳转</Button>
        <Divider type="vertical" />
        <Button
          icon={<DownloadOutlined />}
          onClick={async () => {
            try {
              const blob = await ragApi.downloadFull(kbName, selectedDoc, 'txt');
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedDoc}.txt`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              message.error('下载失败: ' + e.message);
            }
          }}
        >下载TXT</Button>
        <Button
          onClick={async () => {
            try {
              const blob = await ragApi.downloadFull(kbName, selectedDoc, 'md');
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedDoc}.md`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              message.error('下载失败: ' + e.message);
            }
          }}
        >Markdown</Button>
      </Space>
    </Space>
  );

  return (
    <div className="app">
      <Header />
      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        <Sider width={320} theme="light" style={{ borderRight: '1px solid var(--border-color)', padding: 12, overflow: 'auto' }}>
          <Card
            title="知识库"
            size="small"
            extra={
              <Space>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => { refreshStatus(); refreshDocs(); refreshKbList(); }} />
                <Button size="small" icon={<SyncOutlined />} onClick={onRebuild} />
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space wrap>
                <Select
                  style={{ minWidth: 200 }}
                  value={kbName}
                  onChange={setKbName}
                  options={kbList.map(k => ({ label: `${k.name} (${k.documents})`, value: k.name }))}
                  placeholder="选择知识库"
                />
                <Button size="small" onClick={() => { setCreateVisible(true); setNewKbName(''); }}>新建</Button>
                <Button size="small" onClick={() => { setRenameVisible(true); setRenameKbName(kbName); }}>重命名</Button>
                <Popconfirm
                  title={`删除知识库 “${kbName}”？`}
                  description="将删除该知识库的文件与索引，不可恢复"
                  onConfirm={async () => {
                    try {
                      await ragApi.deleteKB(kbName);
                      message.success('已删除知识库');
                      await refreshKbList();
                      await refreshStatus();
                      await refreshDocs();
                    } catch (e) {
                      message.error('删除失败: ' + e.message);
                    }
                  }}
                >
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
              <Space>
                <Text>状态:</Text>
                {status?.ready ? <Tag color="green">已就绪</Tag> : <Tag>未就绪</Tag>}
                <Text type="secondary">分片 {status?.doc_chunks ?? 0}</Text>
              </Space>
              <Upload beforeUpload={beforeUpload} showUploadList={false} disabled={uploading}>
                <Button block icon={<CloudUploadOutlined />} loading={uploading}>上传文档</Button>
              </Upload>
            </Space>
          </Card>

          <Card title="文档列表" size="small" style={{ marginTop: 12 }} bodyStyle={{ paddingTop: 8 }}>
            <Search placeholder="搜索文档" allowClear value={docSearch} onChange={(e) => setDocSearch(e.target.value)} style={{ marginBottom: 8 }} />
            <List
              itemLayout="horizontal"
              dataSource={docs.filter(d => !docSearch || d.file_name.toLowerCase().includes(docSearch.toLowerCase()))}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文档" /> }}
              renderItem={(item) => (
                <List.Item actions={[docActions(item)]}>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 18 }} />}
                    title={<Text ellipsis style={{ maxWidth: 200 }}>{item.file_name}</Text>}
                    description={
                      <Space size={12} wrap>
                        <Text type="secondary">{Math.round((item.size || 0) / 1024)} KB</Text>
                        <Text type="secondary">分片 {item.chunks}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Sider>

        <Content style={{ padding: 16, overflow: 'auto' }}>
          <Tabs
            defaultActiveKey="qa"
            items={[
              {
                key: 'qa',
                label: '检索问答',
                children: (
                  <Card bordered={false} bodyStyle={{ padding: 0 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      <TextArea
                        placeholder="输入你的问题..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                      />
                      <Button type="primary" onClick={onAsk} loading={loadingQA} style={{ width: 140 }}>检索问答</Button>
                      <Card size="small" title="回答">
                        {loadingQA ? (
                          <Skeleton active paragraph={{ rows: 3 }} />
                        ) : (
                          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{answer}</Paragraph>
                        )}
                      </Card>
                      <Card size="small" title="来源">
                        <List
                          size="small"
                          dataSource={sources}
                          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无来源" /> }}
                          renderItem={(s, idx) => (
                            <List.Item>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Text type="secondary">{s?.metadata?.file || `片段 ${idx + 1}`}</Text>
                                <Text style={{ whiteSpace: 'pre-wrap' }}>{s?.content}</Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                      </Card>
                    </Space>
                  </Card>
                )
              },
              {
                key: 'docs',
                label: '文档',
                children: (
                  !selectedDoc ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择左侧文档进行预览或生成摘要" />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 16 }}>
                      <Card title="预览" extra={preview && (<span>{segPage} / {Math.max(1, Math.ceil(segTotal / 1))}</span>)}>
                        {loadingPreview ? (
                          <Skeleton active paragraph={{ rows: 8 }} />
                        ) : (
                          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{preview}</Paragraph>
                        )}
                        <Divider />
                        {previewFooter}
                      </Card>
                      <Card title="摘要" extra={
                        <Space>
                          <Button type="primary" loading={loadingSummary} onClick={() => loadSummary(selectedDoc)}>生成摘要</Button>
                          <Button icon={<DownloadOutlined />} onClick={async () => {
                            try {
                              const blob = await ragApi.exportSummary(kbName, selectedDoc, 'txt');
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${selectedDoc}.summary.txt`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              message.error('导出摘要失败: ' + e.message);
                            }
                          }}>导出TXT</Button>
                          <Button onClick={async () => {
                            try {
                              const blob = await ragApi.exportSummary(kbName, selectedDoc, 'md');
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${selectedDoc}.summary.md`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              message.error('导出摘要失败: ' + e.message);
                            }
                          }}>Markdown</Button>
                        </Space>
                      }>
                        {loadingSummary ? (
                          <Skeleton active paragraph={{ rows: 6 }} />
                        ) : summary ? (
                          summary.error ? (
                            <Text type="danger">{summary.error}</Text>
                          ) : (
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                              <Descriptions size="small" column={2} bordered>
                                <Descriptions.Item label="字数">{summary.statistics?.character_count ?? '-'}</Descriptions.Item>
                                <Descriptions.Item label="段落">{summary.statistics?.paragraph_count ?? '-'}</Descriptions.Item>
                              </Descriptions>
                              {summary.summaries?.summary_100 && (
                                <div>
                                  <Title level={5}>100字摘要</Title>
                                  <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{summary.summaries.summary_100}</Paragraph>
                                </div>
                              )}
                              {summary.summaries?.llm_summary && (
                                <div>
                                  <Title level={5}>LLM摘要</Title>
                                  <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{summary.summaries.llm_summary}</Paragraph>
                                </div>
                              )}
                            </Space>
                          )
                        ) : (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未生成摘要" />
                        )}
                      </Card>
                    </div>
                  )
                )
              }
            ]}
          />
        </Content>
      </Layout>

      {/* Modals */}
      <Modal
        title="新建知识库"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={async () => {
          if (!newKbName.trim()) {
            message.warning('请输入知识库名称');
            return;
          }
          try {
            await ragApi.createKB(newKbName.trim());
            message.success('创建成功');
            setCreateVisible(false);
            setKbName(newKbName.trim());
            await refreshKbList();
            await refreshStatus();
            await refreshDocs();
          } catch (e) {
            message.error('创建失败: ' + e.message);
          }
        }}
      >
        <Input placeholder="输入名称" value={newKbName} onChange={(e) => setNewKbName(e.target.value)} />
      </Modal>

      <Modal
        title="重命名知识库"
        open={renameVisible}
        onCancel={() => setRenameVisible(false)}
        onOk={async () => {
          const val = renameKbName.trim();
          if (!val) { message.warning('请输入新名称'); return; }
          try {
            await ragApi.renameKB(kbName, val);
            message.success('重命名成功');
            setRenameVisible(false);
            setKbName(val);
            await refreshKbList();
            await refreshStatus();
            await refreshDocs();
          } catch (e) {
            message.error('重命名失败: ' + e.message);
          }
        }}
      >
        <Input placeholder="新名称" value={renameKbName} onChange={(e) => setRenameKbName(e.target.value)} />
      </Modal>
    </div>
  );
};

export default RAGPage;
