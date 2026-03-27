import { useMemo } from 'react';
import { useGraphStore } from '@/stores/graph';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function DataAnalysisDashboard() {
  const rawGraph = useGraphStore(state => state.rawGraph);

  const stats = useMemo(() => {
    if (!rawGraph || !rawGraph.nodes) return null;

    // 1. Entity Type Distribution
    const typeCount: Record<string, number> = {};
    rawGraph.nodes.forEach(node => {
      const type = node.properties?.entity_type || '未知';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const typeData = Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 2. Node Degree Distribution (Top 10)
    const degreeData = [...rawGraph.nodes]
      .sort((a, b) => (b.degree || 0) - (a.degree || 0))
      .slice(0, 10)
      .map(node => ({
        name: node.id.length > 10 ? node.id.substring(0, 10) + '...' : node.id,
        degree: node.degree || 0
      }));

    // 3. Node Degree Frequency Distribution (for Line Chart)
    const degreeFrequency: Record<number, number> = {};
    rawGraph.nodes.forEach(node => {
      const degree = node.degree || 0;
      degreeFrequency[degree] = (degreeFrequency[degree] || 0) + 1;
    });

    const degreeDistData = Object.entries(degreeFrequency)
        .map(([degree, count]) => ({ 
            name: `度数 ${degree}`, 
            degree: Number(degree), 
            count 
        }))
        .sort((a, b) => a.degree - b.degree);


    return { typeData, degreeData, degreeDistData };
  }, [rawGraph]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        暂无图谱数据可用于分析
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entity Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>实体类型分布</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, '数量']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Connected Nodes */}
        <Card>
          <CardHeader>
            <CardTitle>连接数最多的节点 (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.degreeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: any) => [value, '连接数']} />
                <Bar dataKey="degree" fill="#82ca9d" name="连接数" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Node Degree Distribution Trend */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>节点度数分布趋势</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.degreeDistData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [value, '节点数量']} />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" name="节点数量" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
