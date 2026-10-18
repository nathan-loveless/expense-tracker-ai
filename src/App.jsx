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
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    PlusCircleOutlined,
    SearchOutlined,
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
                    !startDate ||
                    new Date(expense.date) >= new Date(startDate.format('YYYY-MM-DD'));

                const matchesEnd =
                    !endDate ||
                    new Date(expense.date) <= new Date(endDate.format('YYYY-MM-DD'));

                return matchesSearch && matchesCategory && matchesStart && matchesEnd;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [expenses, searchQuery, categoryFilter, startDate, endDate]);

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

    const handleExport = () => {
        const exportRows = filteredExpenses.length ? filteredExpenses : expenses;

        const header = ['Date', 'Amount', 'Category', 'Description'];
        const rows = exportRows.map((item) => [
            item.date,
            item.amount,
            item.category,
            item.description,
        ]);

        const csvContent = [header, ...rows]
            .map((row) => row.map(csvEscape).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'expenses.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('CSV export generated.');
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
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => handleDelete(record.id)}
                    >
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
                    colorPrimary: '#3b82f6',
                    borderRadius: 14,
                    colorBgContainer: '#ffffff',
                    colorBgElevated: '#ffffff',
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
                <Header className="app-header">
                    <div>
                        <Title level={3} style={{ margin: 0, color: '#f5f7fb' }}>
                            Expense Tracker AI
                        </Title>
                    </div>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                        Export CSV
                    </Button>
                </Header>

                <Content style={{ padding: '24px' }}>
                    <Row gutter={[16, 16]}>
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
                            <Card className="panel-card" title="Quick Overview" bordered={false}>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    <div className="overview-item">
                                        <Text type="secondary">Transactions</Text>
                                        <Title level={4} style={{ margin: 0 }}>{expenses.length}</Title>
                                    </div>
                                    <div className="overview-item">
                                        <Text type="secondary">Average expense</Text>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {expenses.length ? formatCurrency(totalSpending / expenses.length) : formatCurrency(0)}
                                        </Title>
                                    </div>
                                    {topCategory && (
                                        <div className="overview-item">
                                            <Text type="secondary">Largest category spend</Text>
                                            <Title level={4} style={{ margin: 0 }}>
                                                {formatCurrency(topCategory.amount)}
                                            </Title>
                                        </div>
                                    )}
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
                                        {editingId && (
                                            <Button onClick={resetForm}>
                                                Cancel
                                            </Button>
                                        )}
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
                                <Select
                                    value={categoryFilter}
                                    style={{ width: '100%' }}
                                    onChange={setCategoryFilter}
                                >
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
        </ConfigProvider>
    );
}

export default App;
