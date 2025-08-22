// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  Menu,
  Card,
  Input,
  Button,
  List,
  Typography,
  Form,
  Select,
  DatePicker,
  Space,
  Badge,
  Tag,
  Tabs,
  message,
  Spin,
  Empty,
  Divider,
  Row,
  Col,
  Upload,
  Modal
} from 'antd';
import {
  MessageOutlined,
  RobotOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SendOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import dayjs from 'dayjs';
import styles from './Home.module.scss';

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Home = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [selectedTask, setSelectedTask] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '您好！我是您的AI助手，可以帮助您创建和管理任务。有什么我可以帮您的吗？',
      timestamp: dayjs().subtract(2, 'minute')
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: '数据分析报告生成',
      description: '生成月度销售数据分析报告',
      type: '数据分析',
      status: 'completed',
      schedule: '每天 15:00',
      createTime: dayjs().subtract(1, 'hour'),
      result: {
        markdown: `# 销售数据分析报告

## 关键指标
- 总销售额：¥1,250,000
- 订单数量：1,250单
- 平均客单价：¥1,000
- 转化率：3.2%

## 产品线分析
\`\`\`
产品线A: ¥450,000 (36%)
产品线B: ¥380,000 (30%)
产品线C: ¥280,000 (22%)
产品线D: ¥140,000 (12%)
\`\`\`

## 趋势预测
基于历史数据分析，预计下月销售额将增长15-20%。`,
        files: [
          { name: 'sales_data_2024.xlsx', type: 'excel' },
          { name: 'analysis_report.pdf', type: 'pdf' },
          { name: 'raw_data.csv', type: 'csv' }
        ]
      }
    },
    {
      id: 2,
      title: '网站性能监控',
      description: '监控网站响应时间和可用性',
      type: '网络监控',
      status: 'running',
      schedule: '每30分钟',
      createTime: dayjs().subtract(2, 'hour')
    },
    {
      id: 3,
      title: '邮件自动发送',
      description: '定期发送报告邮件给相关人员',
      type: '邮件发送',
      status: 'pending',
      schedule: '每周一 09:00',
      createTime: dayjs().subtract(1, 'day')
    }
  ]);
  const [form] = Form.useForm();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'default', text: '待执行', icon: <ClockCircleOutlined /> },
      running: { color: 'processing', text: '执行中', icon: <SyncOutlined spin /> },
      completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
      failed: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> }
    };
    return configs[status] || configs.pending;
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: dayjs()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // 模拟AI回复
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: '我已收到您的消息，正在处理中...',
        timestamp: dayjs()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleCreateTask = (values) => {
    const newTask = {
      id: tasks.length + 1,
      title: values.title,
      description: values.description,
      type: values.type,
      status: 'pending',
      schedule: values.scheduleType === 'once' 
        ? dayjs(values.executeTime).format('YYYY-MM-DD HH:mm')
        : `每天 ${dayjs(values.executeTime).format('HH:mm')}`,
      createTime: dayjs(),
      executeTime: values.executeTime
    };

    setTasks([newTask, ...tasks]);
    form.resetFields();
    message.success('任务创建成功！');
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleDownloadFile = (fileName) => {
    message.success(`开始下载 ${fileName}`);
  };

  const renderTaskStatus = (status) => {
    const config = getStatusConfig(status);
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const renderFileIcon = (fileType) => {
    switch (fileType) {
      case 'excel': return <FileTextOutlined style={{ color: '#217346' }} />;
      case 'pdf': return <FileTextOutlined style={{ color: '#DC3545' }} />;
      case 'csv': return <FileTextOutlined style={{ color: '#28A745' }} />;
      default: return <FileTextOutlined />;
    }
  };

  return (
    <Layout className={styles.appLayout}>
      {/* 侧边栏 */}
      <Sider width={300} className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Title level={4} style={{ color: 'white', marginBottom: 0 }}>
            <RobotOutlined /> AI Agent
          </Title>
          <Text type="secondary" style={{ color: 'rgba(255,255,255,0.6)' }}>
            智能任务助手
          </Text>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarStyle={{ margin: '0 16px' }}
        >
          <TabPane tab="任务列表" key="1">
            <List
              dataSource={tasks}
              renderItem={task => (
                <List.Item
                  className={`${styles.taskItem} ${selectedTask?.id === task.id ? styles.selected : ''}`}
                  onClick={() => handleTaskClick(task)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        {task.title}
                        {renderTaskStatus(task.status)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {task.description}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          <ClockCircleOutlined /> {task.schedule}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>
          <TabPane tab="历史记录" key="2">
            <Empty description="暂无历史记录" />
          </TabPane>
        </Tabs>
      </Sider>

      {/* 主内容区 */}
      <Layout>
        <Content className={styles.mainContent}>
          <Row gutter={[20, 20]}>
            {/* 聊天区域 */}
            <Col span={24}>
              <Card className={styles.chatCard} title={<><MessageOutlined /> 实时聊天</>}>
                <div className={styles.chatMessages}>
                  {messages.map(message => (
                    <div key={message.id} className={`${styles.message} ${styles[`${message.type}Message`]}`}>
                      <div className={styles.messageContent}>
                        <div className={styles.messageText}>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <div className={styles.messageTime}>
                          {message.timestamp.format('HH:mm')}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className={styles.chatInput}>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onPressEnter={handleSendMessage}
                    placeholder="输入您的消息..."
                    suffix={
                      <Button 
                        type="primary" 
                        icon={<SendOutlined />} 
                        onClick={handleSendMessage}
                        size="small"
                      />
                    }
                  />
                </div>
              </Card>
            </Col>

            {/* 任务创建区域 */}
            <Col span={24}>
              <Card title={<><PlusOutlined /> 创建新任务</>} className={styles.taskCreationCard}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleCreateTask}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="title"
                        label="任务名称"
                        rules={[{ required: true, message: '请输入任务名称' }]}
                      >
                        <Input placeholder="请输入任务名称" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="type"
                        label="任务类型"
                        rules={[{ required: true, message: '请选择任务类型' }]}
                      >
                        <Select placeholder="请选择任务类型">
                          <Option value="数据分析">数据分析</Option>
                          <Option value="文件处理">文件处理</Option>
                          <Option value="网络爬虫">网络爬虫</Option>
                          <Option value="邮件发送">邮件发送</Option>
                          <Option value="网络监控">网络监控</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item
                    name="description"
                    label="任务描述"
                  >
                    <TextArea placeholder="请输入任务描述" rows={3} />
                  </Form.Item>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="executeTime"
                        label="执行时间"
                        rules={[{ required: true, message: '请选择执行时间' }]}
                      >
                        <DatePicker 
                          showTime 
                          placeholder="请选择执行时间"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="scheduleType"
                        label="定时设置"
                        rules={[{ required: true, message: '请选择定时类型' }]}
                      >
                        <Select placeholder="请选择定时类型">
                          <Option value="once">一次性执行</Option>
                          <Option value="daily">每日执行</Option>
                          <Option value="weekly">每周执行</Option>
                          <Option value="monthly">每月执行</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      <PlusOutlined /> 创建任务
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* 结果展示区域 */}
            {selectedTask && selectedTask.result && (
              <Col span={24}>
                <Card 
                  className={styles.resultCard}
                  title={<><FileTextOutlined /> {selectedTask.title} - 执行结果</>}
                  extra={
                    <Space>
                      <Button icon={<DownloadOutlined />}>下载报告</Button>
                      <Button icon={<ShareAltOutlined />}>分享</Button>
                    </Space>
                  }
                >
                  <div className={styles.resultContent}>
                    <ReactMarkdown className={styles.markdownContent}>
                      {selectedTask.result.markdown}
                    </ReactMarkdown>
                    
                    {selectedTask.result.files && (
                      <>
                        <Divider>生成的文件报告</Divider>
                        <div className={styles.fileList}>
                          {selectedTask.result.files.map((file, index) => (
                            <Button
                              key={index}
                              icon={renderFileIcon(file.type)}
                              onClick={() => handleDownloadFile(file.name)}
                              style={{ marginRight: 8, marginBottom: 8 }}
                            >
                              {file.name}
                            </Button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </Col>
            )}
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Home;