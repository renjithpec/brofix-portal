import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES, Category } from '@/lib/constants';

const Stats = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0
  });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ day: string; count: number }[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      // Get all complaints for this branch
      const { data: complaints } = await supabase
        .from('complaints')
        .select('*')
        .eq('branch', profile.branch);

      if (complaints) {
        setStats({
          total: complaints.length,
          pending: complaints.filter(c => c.status !== 'Resolved').length,
          resolved: complaints.filter(c => c.status === 'Resolved').length
        });

        // Category breakdown
        const categoryCount: Record<string, number> = {};
        CATEGORIES.forEach(cat => categoryCount[cat] = 0);
        complaints.forEach(c => {
          if (categoryCount[c.category] !== undefined) {
            categoryCount[c.category]++;
          }
        });
        setCategoryData(Object.entries(categoryCount).map(([name, value]) => ({ name, value })));

        // Daily activity (last 7 days)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyCounts = days.map(day => ({ day, count: 0 }));
        
        complaints.forEach(c => {
          const date = new Date(c.created_at);
          const dayIndex = (date.getDay() + 6) % 7; // Monday = 0
          dailyCounts[dayIndex].count++;
        });
        
        setDailyData(dailyCounts);
      }
    };

    fetchStats();
  }, [profile]);

  const COLORS = ['#8b5cf6', '#f97316', '#06b6d4', '#10b981', '#71717a'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Platform overview and statistics for {profile?.branch}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Total Issues
          </p>
          <p className="text-4xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Pending
          </p>
          <p className="text-4xl font-bold text-foreground">{stats.pending}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Resolved
          </p>
          <p className="text-4xl font-bold text-foreground">{stats.resolved}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">By Category</h3>
          {categoryData.every(d => d.value === 0) ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(222 47% 8%)', 
                    border: '1px solid hsl(222 30% 20%)',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Daily Activity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 20%)" />
              <XAxis dataKey="day" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(222 47% 8%)', 
                  border: '1px solid hsl(222 30% 20%)',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="count" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Stats;
