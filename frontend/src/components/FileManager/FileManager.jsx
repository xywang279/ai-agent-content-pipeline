import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  List, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Modal, 
  Spin, 
  message,
  Divider,
  Select,
  Tag
} from 'antd';
import { 
  UploadOutlined, 
  FilePdfOutlined, 
  FileWordOutlined, 
  FileExcelOutlined, 
  FileTextOutlined, 
  FilePptOutlined, 
  FolderOpenOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import api from '../../api/chat';
import ragApi from '../../api/rag';
import './FileManager.scss';

const { Text, Title } = Typography;
const { Dragger } = Upload;

const FileManager = ({ conversationId, onFileAnalyzed }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [kbList, setKbList] = useState([]);
  const [selectedKb, setSelectedKb] = useState('');
  const [kbTargetFile, setKbTargetFile] = useState(null);

  // 获取文件列表
  const fetchFileList = async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      const response = await api.getFileList(conversationId);
      setUploadedFiles(response.files);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileList();
  }, [conversationId]);

  const openKbModal = async (file) => {
    try {
      setKbTargetFile(file);
      const r = await ragApi.listKBs();
      setKbList(r.kbs || []);
      setSelectedKb(r.kbs && r.kbs.length ? r.kbs[0].name : '');
      setKbModalOpen(true);
    } catch (e) {
      message.error('加载知识库失败');
    }
  };

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    accept: '.pdf,.docx,.xlsx,.xls,.txt,.pptx',
    disabled: loading || !conversationId,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      
      if (!conversationId) {
        message.error('请先创建对话');
        onError(new Error('请先创建对话'));
        return;
      }

      try {
        setLoading(true);
        const response = await api.uploadFile(file, conversationId);
        
        // 更新文件列表
        setUploadedFiles(prev => [...prev, response]);
        
        // 通知父组件文件已分析
        onFileAnalyzed && onFileAnalyzed(response);
        
        message.success(`文件 "${file.name}" 分析完成！`);
        onSuccess(response);
      } catch (error) {
        console.error('文件上传失败:', error);
        message.error(`文件上传失败: ${error.message}`);
        onError(error);
      } finally {
        setLoading(false);
      }
    },
  };

  // 获取文件图标
  const getFileIcon = (format) => {
    const iconMap = {
      '.pdf': <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />,
      '.docx': <FileWordOutlined style={{ color: '#1890ff', fontSize: '24px' }} />,
      '.xlsx': <FileExcelOutlined style={{ color: '#52c41a', fontSize: '24px' }} />,
      '.xls': <FileExcelOutlined style={{ color: '#52c41a', fontSize: '24px' }} />,
      '.txt': <FileTextOutlined style={{ color: '#faad14', fontSize: '24px' }} />,
      '.pptx': <FilePptOutlined style={{ color: '#eb2f96', fontSize: '24px' }} />,
    };
    return iconMap[format] || <FolderOpenOutlined style={{ color: '#1890ff', fontSize: '24px' }} />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 预览文件
  const previewFile = async (fileId, fileName) => {
    try {
      setLoading(true);
      const response = await api.previewFile(fileId);
      setPreviewContent(response.preview);
      setPreviewTitle(fileName);
      setPreviewVisible(true);
    } catch (error) {
      console.error('预览文件失败:', error);
      message.error('预览文件失败');
    } finally {
      setLoading(false);
    }
  };

  // 重新分析文件
  const reanalyzeFile = async (file) => {
    try {
      setLoading(true);
      // 这里可以调用重新分析的API
      message.info('重新分析功能待实现');
      onFileAnalyzed && onFileAnalyzed(file);
    } catch (error) {
      console.error('重新分析失败:', error);
      message.error('重新分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载文件
  const downloadFile = (filePath, fileName) => {
    // 这里应该调用下载API
    message.info('下载功能待实现');
  };

  return (
    <div className="file-manager">
      <Card 
        title={
          <Space>
            <FolderOpenOutlined />
            <span>文件管理</span>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={fetchFileList}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {/* 文件上传区域 */}
        <div className="upload-section">
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF, DOCX, XLSX, XLS, TXT, PPTX 格式文件
            </p>
          </Dragger>
        </div>

        <Divider />

        {/* 文件列表 */}
        <div className="file-list-section">
          <Title level={5}>最近上传的文件</Title>
          
          {loading && uploadedFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin tip="加载中..." />
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
              <p style={{ marginTop: '16px', color: '#999' }}>暂无上传文件</p>
            </div>
          ) : (
            <List
              dataSource={uploadedFiles}
              renderItem={(file) => (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      icon={<EyeOutlined />} 
                      onClick={() => previewFile(file.id, file.file_name)}
                    >
                      预览
                    </Button>,
                    <Button type="text" onClick={() => openKbModal(file)}>加入知识库</Button>,
                    <Button
                      type="text"
                      onClick={async () => {
                        const kb = window.prompt('输入要加入的知识库名称');
                        if (!kb) return;
                        try {
                          await ragApi.ingestExisting(kb, file.file_path, file.file_name);
                          message.success(`已加入知识库 ${kb}`);
                        } catch (e) {
                          message.error(`加入知识库失败: ${e.message}`);
                        }
                      }}
                    >
                      加入知识库
                    </Button>,
                    <Button 
                      type="text" 
                      icon={<ReloadOutlined />} 
                      onClick={() => reanalyzeFile(file)}
                    >
                      重新分析
                    </Button>,
                    <Button 
                      type="text" 
                      icon={<DownloadOutlined />} 
                      onClick={() => downloadFile(file.file_path, file.file_name)}
                    >
                      下载
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(file.file_format)}
                    title={
                      <Space>
                        <Text strong>{file.file_name}</Text>
                        <Tag color="blue">{file.file_format}</Tag>
                      </Space>
                    }
                    description={
                      <Space size="middle">
                        <Text type="secondary">大小: {formatFileSize(file.file_size)}</Text>
                        <Text type="secondary">
                          上传时间: {new Date(file.upload_time).toLocaleString()}
                        </Text>
                        {file.page_count && (
                          <Text type="secondary">页数: {file.page_count}</Text>
                        )}
                        {file.word_count && (
                          <Text type="secondary">字数: {file.word_count}</Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>

      {/* 文件预览模态框 */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div className="preview-content">
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {previewContent || '暂无预览内容'}
          </pre>
        </div>
      </Modal>
      <Modal
        title="加入知识库"
        open={kbModalOpen}
        onCancel={() => setKbModalOpen(false)}
        onOk={async () => {
          if (!kbTargetFile || !selectedKb) { message.warning('请选择知识库'); return; }
          try {
            await ragApi.ingestExisting(selectedKb, kbTargetFile.file_path, kbTargetFile.file_name);
            message.success(`已加入知识库 ${selectedKb}`);
            setKbModalOpen(false);
          } catch (e) {
            message.error(`加入知识库失败: ${e.message}`);
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>选择知识库</div>
          <Select
            style={{ width: '100%' }}
            value={selectedKb || undefined}
            onChange={setSelectedKb}
            options={(kbList || []).map(k => ({ label: `${k.name} (${k.documents})`, value: k.name }))}
            placeholder="请选择"
          />
          {kbTargetFile && (
            <div style={{ color: '#999' }}>文件: {kbTargetFile.file_name}</div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default FileManager;
