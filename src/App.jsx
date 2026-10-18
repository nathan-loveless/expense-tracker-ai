import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    ConfigProvider,
    DatePicker,
    Empty,
    Form,
    Input,
    InputNumber,
    Layout,
    Modal,
    Radio,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    CloudUploadOutlined,
    DeleteOutlined,
    EditOutlined,
    LinkOutlined,
    PlusCircleOutlined,
    QrcodeOutlined,
    SearchOutlined,
    ShareAltOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

const STORAGE_KEY = 'expense-tracker-ai-demo';
const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Other'];

const seedExpenses = [
    { id: '1', date: '2026-10-01', amount: 24.5, category: 'Food', description: 'Groceries at Fresh Market' },
    { id: '2', date: '2026-10-02', amount: 64.99, category: 'Transportation', description: 'Fuel refill and parking' },
    { id: '3', date: '2026-10-05', amount: 18.0, category: 'Entertainment', description: 'Movie night tickets' },
    { id: '4', date: '2026-10-07', amount: 120.0, category: 'Bills', description: 'Internet and utilities' },
    { id: '5', date: '2026-10-09', amount: 89.0, category: 'Shopping', description: 'Work supplies and office items' },
    { id: '6', date: '2026-10-10', amount: 34.75, category: 'Food', description: 'Lunch with client' },
];

const exportTemplates = [
    { key: 'tax', title: 'Tax Report', description: 'Prepared for annual filing', accent: '#6d5efc' },
    { key: 'summary', title: 'Monthly Summary', description: 'Budget snapshot for finance reviews', accent: '#14b8a6' },
    { key: 'analysis', title: 'Category Analysis', description: 'Breakdown by spending patterns', accent: '#f59e0b' },
];

const cloudServices = [
    { name: 'Google Sheets', status: 'Connected', color: '#22c55e' },
    { name: 'Dropbox', status: 'Ready', color: '#3b82f6' },
    { name: 'OneDrive', status: 'Connected', color: '#8b5cf6' },
    { name: 'Slack', status: 'Linked', color: '#f97316' },
];

const initialHistory = [
    { id: 'h1', name: 'Tax Report', channel: 'Email', time: 'Today, 9:41 AM', status: 'Delivered', size: '1.2 MB' },
    { id: 'h2', name: 'Monthly Summary', channel: 'Google Sheets', time: 'Yesterday, 6:15 PM', status: 'Synced', size: '860 KB' },
    { id: 'h3', name: 'Category Analysis', channel: 'Dropbox', time: 'Mon, 8:30 AM', status: 'Stored', size: '2.0 MB' },
];

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value || 0);

const formatDate = (date) =>
    new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(date));

const getCategoryColor = (category) => {
    const palette = {
        Food: '#52c41a',
        Transportation: '#1890ff',
        Entertainment: '#eb2f96',
        Shopping: '#722ed1',
        Bills: '#fa8c16',
        Other: '#8c8c8c',
    };

    return palette[category] || '#1890ff';
};

const buildCategorySummary = (items) => {
    const totals = items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
        return acc;
    }, {});

    return Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function App() {
    const [expenses, setExpenses] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) && saved.length ? saved : seedExpenses;
        } catch {
            return seedExpenses;
        }
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('tax');
    const [exportDestination, setExportDestination] = useState('email');
    const [scheduleOption, setScheduleOption] = useState('Weekly');
    const [emailRecipient, setEmailRecipient] = useState('finance@company.com');
    const [exportStartDate, setExportStartDate] = useState(null);
    const [exportEndDate, setExportEndDate] = useState(null);
    const [selectedExportCategories, setSelectedExportCategories] = useState([...categories]);
    const [filename, setFilename] = useState('tax-report');
    const [isExporting, setIsExporting] = useState(false);
    const [exportHistory, setExportHistory] = useState(initialHistory);
    const [shareLink, setShareLink] = useState('https://secure.expensecloud.app/share/expense-report-9321');

    const [form] = Form.useForm();

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }, [expenses]);

    const resetForm = () => {
        form.resetFields();
        form.setFieldsValue({ date: dayjs(), category: 'Food', amount: null, description: '' });
        setEditingId(null);
    };

    const totalSpending = useMemo(
        () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [expenses],
    );

    const currentMonthSpending = useMemo(() => {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();

        return expenses.reduce((sum, item) => {
            const expenseDate = new Date(item.date);
            if (expenseDate.getMonth() === month && expenseDate.getFullYear() === year) {
                return sum + Number(item.amount || 0);
            }
            return sum;
        }, 0);
    }, [expenses]);

    const categoriesBreakdown = useMemo(() => buildCategorySummary(expenses), [expenses]);
    const topCategory = categoriesBreakdown[0];

    const filteredExpenses = useMemo(() => {
        return [...expenses]
            .filter((expense) => {
                const matchesSearch =
                    !searchQuery ||
                    expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    expense.category.toLowerCase().includes(searchQuery.toLowerCase());

                const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;

                const matchesStart =
                    !startDate || new Date(expense.date) >= new Date(startDate.format('YYYY-MM-DD'));

                const matchesEnd =
                    !endDate || new Date(expense.date) <= new Date(endDate.format('YYYY-MM-DD'));

                return matchesSearch && matchesCategory && matchesStart && matchesEnd;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [expenses, searchQuery, categoryFilter, startDate, endDate]);

    const exportableExpenses = useMemo(() => {
        return [...expenses]
            .filter((expense) => selectedExportCategories.includes(expense.category))
            .filter((expense) => {
                const expenseDate = new Date(expense.date);
                const startValue = exportStartDate ? new Date(exportStartDate.format('YYYY-MM-DD')) : null;
                const endValue = exportEndDate ? new Date(exportEndDate.format('YYYY-MM-DD')) : null;

                if (startValue && expenseDate < startValue) return false;
                if (endValue && expenseDate > endValue) return false;
                return true;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [expenses, selectedExportCategories, exportStartDate, exportEndDate]);

    const selectedTemplateConfig = exportTemplates.find((template) => template.key === selectedTemplate) || exportTemplates[0];
    const previewRows = exportableExpenses.slice(0, 5);

    const handleSubmit = async (values) => {
        const payload = {
            id: editingId || crypto.randomUUID(),
            date: values.date.format('YYYY-MM-DD'),
            amount: Number(values.amount),
            category: values.category,
            description: values.description.trim(),
        };

        if (!payload.description || !payload.amount || payload.amount <= 0) {
            setFormMessage('Please provide a valid amount and description before saving.');
            return;
        }

        setIsSaving(true);
        setFormMessage('');

        setTimeout(() => {
            setExpenses((current) => {
                if (editingId) {
                    return current.map((item) => (item.id === editingId ? payload : item));
                }
                return [payload, ...current];
            });

            setIsSaving(false);
            message.success(editingId ? 'Expense updated successfully.' : 'Expense added successfully.');
            resetForm();
        }, 350);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue({
            date: dayjs(record.date),
            amount: record.amount,
            category: record.category,
            description: record.description,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        setExpenses((current) => current.filter((item) => item.id !== id));
        if (editingId === id) {
            resetForm();
        }
        message.success('Expense deleted.');
    };

    const handleCreateShareLink = () => {
        const token = Math.random().toString(36).substring(2, 10);
        const nextLink = `https://secure.expensecloud.app/share/expense-report-${token}`;
        setShareLink(nextLink);
        message.success('Share link refreshed.');
    };

    const handleExport = () => {
        if (!exportableExpenses.length) {
            message.warning('No data matched the export filters.');
            return;
        }

        setIsExporting(true);

        setTimeout(() => {
            const fileBase = (filename || 'expense-export').trim() || 'expense-export';
            const cleanFileName = fileBase.includes('.') ? fileBase : `${fileBase}.csv`;

            const rows = exportableExpenses.map((item) => [item.date, item.category, item.amount, item.description]);
            const csvContent = [['Date', 'Category', 'Amount', 'Description'], ...rows]
                .map((row) => row.map(csvEscape).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            if (exportDestination === 'email') {
                const emailUrl = `mailto:${emailRecipient}?subject=${encodeURIComponent(`${selectedTemplateConfig.title} Export`)}&body=${encodeURIComponent('Your expense export is attached.')}`;
                window.location.href = emailUrl;
            }

            downloadBlob(blob, cleanFileName);

            const destinationLabel =
                exportDestination === 'email'
                    ? 'Email'
                    : exportDestination === 'sheets'
                        ? 'Google Sheets'
                        : exportDestination === 'dropbox'
                            ? 'Dropbox'
                            : 'OneDrive';

            setExportHistory((current) => [
                {
                    id: `h${Date.now()}`,
                    name: selectedTemplateConfig.title,
                    channel: destinationLabel,
                    time: 'Just now',
                    status: exportDestination === 'email' ? 'Queued' : 'Synced',
                    size: `${(rows.length * 0.18).toFixed(1)} KB`,
                },
                ...current,
            ]);

            message.success(`${selectedTemplateConfig.title} export prepared for ${destinationLabel.toLowerCase()}.`);
            setIsExporting(false);
            setExportOpen(false);
        }, 800);
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            width: 120,
            render: (value) => formatDate(value),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            render: (value) => <Tag color={getCategoryColor(value)}>{value}</Tag>,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 140,
            render: (value) => <Text strong>{formatCurrency(value)}</Text>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 140,
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
                        Edit
                    </Button>
                    <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id)}>
                        Delete
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#4f46e5',
                    borderRadius: 14,
                    colorBgContainer: '#ffffff',
                    colorBgElevated: '#ffffff',
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: '#f4f7ff' }}>
                <Header className="cloud-header">
                    <div className="brand-wrap">
                        <div className="brand-mark">E</div>
                        <div>
                            <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                                Expense Cloud
                            </Title>
                            <Text style={{ color: '#dbeafe' }}>Finance operations</Text>
                        </div>
                    </div>

                    <div className="header-actions">
                        <Tag color="green" className="sync-pill">
                            <SyncOutlined /> Live sync
                        </Tag>
                        <Button type="primary" className="cloud-primary" onClick={() => setExportOpen(true)}>
                            Open export center
                        </Button>
                    </div>
                </Header>

                <Content style={{ padding: '24px' }} className="page-shell">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} xl={16}>
                            <Card className="panel-card cloud-panel" title="Export Center" bordered={false}>
                                <div className="hero-row">
                                    <div>
                                        <Text type="secondary">Connected workflows</Text>
                                        <Title level={3} style={{ margin: '8px 0 0' }}>
                                            Share, schedule, and sync your financial reports
                                        </Title>
                                    </div>
                                    <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setExportOpen(true)}>
                                        Create export
                                    </Button>
                                </div>

                                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                                    <Col xs={24} sm={4}>
                                        <div className="summary-box soft-indigo">
                                            <Text type="secondary">Reports</Text>
                                            <Title level={4} style={{ margin: '8px 0 0' }}>12</Title>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={4}>
                                        <div className="summary-box soft-green">
                                            <Text type="secondary">Synced</Text>
                                            <Title level={4} style={{ margin: '8px 0 0' }}>96%</Title>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={4}>
                                        <div className="summary-box soft-gold">
                                            <Text type="secondary">Queued</Text>
                                            <Title level={4} style={{ margin: '8px 0 0' }}>3</Title>
                                        </div>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <div className="summary-box soft-white">
                                            <Text type="secondary">Next scheduled export</Text>
                                            <Title level={4} style={{ margin: '8px 0 0' }}>Thursday 9:00 AM</Title>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="template-grid" style={{ marginTop: 20 }}>
                                    {exportTemplates.map((template) => (
                                        <div
                                            key={template.key}
                                            className={`template-card ${selectedTemplate === template.key ? 'active' : ''}`}
                                            style={{ borderColor: selectedTemplate === template.key ? template.accent : '#e5e7eb' }}
                                            onClick={() => setSelectedTemplate(template.key)}
                                        >
                                            <div className="template-icon" style={{ background: template.accent }}>
                                                {template.title.charAt(0)}
                                            </div>
                                            <div>
                                                <Title level={5} style={{ margin: 0 }}>{template.title}</Title>
                                                <Text type="secondary">{template.description}</Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} xl={8}>
                            <Card className="panel-card cloud-panel" title="Connected services" bordered={false}>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    {cloudServices.map((service) => (
                                        <div key={service.name} className="service-row">
                                            <div className="service-name">
                                                <span className="dot" style={{ background: service.color }} />
                                                <Text strong>{service.name}</Text>
                                            </div>
                                            <Tag color="success">{service.status}</Tag>
                                        </div>
                                    ))}
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col xs={24} lg={16}>
                            <Card className="panel-card" title="Recent exports" bordered={false}>
                                <Table
                                    size="small"
                                    dataSource={exportHistory}
                                    pagination={false}
                                    rowKey="id"
                                    columns={[
                                        { title: 'Report', dataIndex: 'name', key: 'name' },
                                        { title: 'Channel', dataIndex: 'channel', key: 'channel' },
                                        { title: 'Time', dataIndex: 'time', key: 'time' },
                                        {
                                            title: 'Status',
                                            dataIndex: 'status',
                                            key: 'status',
                                            render: (value) => <Tag color={value === 'Delivered' ? 'green' : value === 'Synced' ? 'blue' : 'orange'}>{value}</Tag>,
                                        },
                                        { title: 'Size', dataIndex: 'size', key: 'size' },
                                    ]}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} lg={8}>
                            <Card className="panel-card" title="Share & collaboration" bordered={false}>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <div className="share-box">
                                        <div className="share-link-row">
                                            <LinkOutlined />
                                            <Text ellipsis>{shareLink}</Text>
                                        </div>
                                        <Button type="default" onClick={handleCreateShareLink}>
                                            Refresh link
                                        </Button>
                                    </div>

                                    <div className="qr-box">
                                        <QrcodeOutlined style={{ fontSize: 52, color: '#4f46e5' }} />
                                        <Text type="secondary">Shareable QR code ready</Text>
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col xs={24} xl={16}>
                            <Card className="panel-card" title="Expense Summary" bordered={false}>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={8}>
                                        <Statistic title="Total Spending" value={totalSpending} precision={2} prefix="$" />
                                    </Col>
                                    <Col xs={24} sm={8}>
                                        <Statistic title="This Month" value={currentMonthSpending} precision={2} prefix="$" />
                                    </Col>
                                    <Col xs={24} sm={8}>
                                        <Statistic title="Top Category" value={topCategory ? topCategory.category : 'N/A'} />
                                    </Col>
                                </Row>
                            </Card>
                        </Col>

                        <Col xs={24} xl={8}>
                            <Card className="panel-card" title="Backup scheduling" bordered={false}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Select value={scheduleOption} style={{ width: '100%' }} onChange={setScheduleOption}>
                                        <Select.Option value="Daily">Daily</Select.Option>
                                        <Select.Option value="Weekly">Weekly</Select.Option>
                                        <Select.Option value="Monthly">Monthly</Select.Option>
                                    </Select>
                                    <Tag color="blue">Auto backup enabled</Tag>
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                        <Col xs={24} lg={8}>
                            <Card className="panel-card" title="Add or Edit Expense" bordered={false}>
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleSubmit}
                                    initialValues={{
                                        date: dayjs(),
                                        category: 'Food',
                                    }}
                                >
                                    <Form.Item
                                        label="Date"
                                        name="date"
                                        rules={[{ required: true, message: 'Please choose a date.' }]}
                                    >
                                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                                    </Form.Item>

                                    <Form.Item
                                        label="Amount"
                                        name="amount"
                                        rules={[{ required: true, message: 'Please enter an amount.' }]}
                                    >
                                        <InputNumber
                                            min={0.01}
                                            step={0.01}
                                            style={{ width: '100%' }}
                                            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Category"
                                        name="category"
                                        rules={[{ required: true, message: 'Select a category.' }]}
                                    >
                                        <Select>
                                            {categories.map((category) => (
                                                <Select.Option key={category} value={category}>
                                                    {category}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        label="Description"
                                        name="description"
                                        rules={[{ required: true, message: 'Please add a description.' }]}
                                    >
                                        <Input placeholder="e.g. Weekly groceries" maxLength={120} />
                                    </Form.Item>

                                    {formMessage && <Alert type="error" showIcon message={formMessage} style={{ marginBottom: 16 }} />}

                                    <Space>
                                        <Button type="primary" htmlType="submit" loading={isSaving} icon={<PlusCircleOutlined />}>
                                            {editingId ? 'Save Changes' : 'Add Expense'}
                                        </Button>
                                        {editingId && <Button onClick={resetForm}>Cancel</Button>}
                                    </Space>
                                </Form>
                            </Card>
                        </Col>

                        <Col xs={24} lg={16}>
                            <Card className="panel-card" title="Category Breakdown" bordered={false}>
                                {categoriesBreakdown.length ? (
                                    <div className="category-bars">
                                        {categoriesBreakdown.map(({ category, amount }) => {
                                            const percentage = totalSpending ? (amount / totalSpending) * 100 : 0;
                                            return (
                                                <div key={category} className="category-row">
                                                    <div className="category-label-row">
                                                        <Tag color={getCategoryColor(category)}>{category}</Tag>
                                                        <Text strong>{formatCurrency(amount)}</Text>
                                                    </div>
                                                    <div className="bar-track">
                                                        <div
                                                            className="bar-fill"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                background: getCategoryColor(category),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <Empty description="No spending data yet" />
                                )}
                            </Card>
                        </Col>
                    </Row>

                    <Card className="panel-card" title="Expense History" style={{ marginTop: 16 }} bordered={false}>
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                            <Col xs={24} md={8}>
                                <Input
                                    allowClear
                                    placeholder="Search by description or category"
                                    prefix={<SearchOutlined />}
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                />
                            </Col>
                            <Col xs={12} md={4}>
                                <Select value={categoryFilter} style={{ width: '100%' }} onChange={setCategoryFilter}>
                                    <Select.Option value="All">All categories</Select.Option>
                                    {categories.map((category) => (
                                        <Select.Option key={category} value={category}>
                                            {category}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={12} md={6}>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    placeholder="From date"
                                    value={startDate}
                                    onChange={setStartDate}
                                />
                            </Col>
                            <Col xs={12} md={6}>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    placeholder="To date"
                                    value={endDate}
                                    onChange={setEndDate}
                                />
                            </Col>
                        </Row>

                        <Table
                            columns={columns}
                            dataSource={filteredExpenses}
                            rowKey="id"
                            locale={{ emptyText: <Empty description="No expenses match the current filters" /> }}
                            pagination={{ pageSize: 6 }}
                        />
                    </Card>
                </Content>
            </Layout>

            <Modal
                title="Create cloud export"
                open={exportOpen}
                onCancel={() => setExportOpen(false)}
                width={980}
                footer={[
                    <Button key="cancel" onClick={() => setExportOpen(false)}>
                        Cancel
                    </Button>,
                    <Button key="confirm" type="primary" loading={isExporting} onClick={handleExport}>
                        Send export
                    </Button>,
                ]}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div className="export-step">
                        <Text strong>1. Choose template</Text>
                        <Radio.Group value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)} style={{ marginTop: 12 }}>
                            {exportTemplates.map((template) => (
                                <Radio.Button key={template.key} value={template.key}>
                                    {template.title}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </div>

                    <div className="export-step">
                        <Text strong>2. Destination</Text>
                        <Radio.Group value={exportDestination} onChange={(event) => setExportDestination(event.target.value)} style={{ marginTop: 12 }}>
                            <Radio.Button value="email">Email</Radio.Button>
                            <Radio.Button value="sheets">Google Sheets</Radio.Button>
                            <Radio.Button value="dropbox">Dropbox</Radio.Button>
                            <Radio.Button value="onedrive">OneDrive</Radio.Button>
                        </Radio.Group>
                    </div>

                    {exportDestination === 'email' && (
                        <div className="export-step">
                            <Text strong>Email recipient</Text>
                            <Input value={emailRecipient} onChange={(event) => setEmailRecipient(event.target.value)} style={{ marginTop: 8 }} />
                        </div>
                    )}

                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Text strong>Start date</Text>
                            <DatePicker style={{ width: '100%', marginTop: 8 }} value={exportStartDate} onChange={setExportStartDate} />
                        </Col>
                        <Col xs={24} md={12}>
                            <Text strong>End date</Text>
                            <DatePicker style={{ width: '100%', marginTop: 8 }} value={exportEndDate} onChange={setExportEndDate} />
                        </Col>
                    </Row>

                    <div className="export-step">
                        <Text strong>Categories</Text>
                        <Select
                            mode="multiple"
                            value={selectedExportCategories}
                            style={{ width: '100%', marginTop: 8 }}
                            onChange={setSelectedExportCategories}
                        >
                            {categories.map((category) => (
                                <Select.Option key={category} value={category}>
                                    {category}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    <div className="export-step">
                        <Text strong>Backup schedule</Text>
                        <Select value={scheduleOption} style={{ width: '100%', marginTop: 8 }} onChange={setScheduleOption}>
                            <Select.Option value="Daily">Daily</Select.Option>
                            <Select.Option value="Weekly">Weekly</Select.Option>
                            <Select.Option value="Monthly">Monthly</Select.Option>
                        </Select>
                    </div>

                    <div className="export-step">
                        <Text strong>File name</Text>
                        <Input value={filename} style={{ marginTop: 8 }} onChange={(event) => setFilename(event.target.value)} />
                    </div>

                    <Alert
                        type="info"
                        showIcon
                        message={`${exportableExpenses.length} records will be exported using the ${selectedTemplateConfig.title} template`}
                    />

                    <Card size="small" title="Preview" bordered>
                        <Table
                            size="small"
                            dataSource={previewRows}
                            rowKey="id"
                            pagination={false}
                            columns={[
                                { title: 'Date', dataIndex: 'date', key: 'date', render: (value) => formatDate(value) },
                                { title: 'Category', dataIndex: 'category', key: 'category' },
                                { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (value) => formatCurrency(value) },
                                { title: 'Description', dataIndex: 'description', key: 'description' },
                            ]}
                            locale={{ emptyText: <Empty description="No records to preview" /> }}
                        />
                    </Card>
                </Space>
            </Modal>
        </ConfigProvider>
    );
}

export default App;
