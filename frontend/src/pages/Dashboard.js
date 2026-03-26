import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { LayoutDashboard, CheckSquare, Users, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    total_tasks: 0,
    my_tasks: 0,
    completed_tasks: 0,
    total_articles: 0,
    total_users: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/stats`, getAuthHeader()),
        axios.get(`${API}/tasks`, getAuthHeader())
      ]);
      setStats(statsRes.data);
      setRecentTasks(tasksRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Tasks', value: stats.total_tasks, icon: CheckSquare, color: 'bg-blue-50 text-blue-700' },
    { label: 'My Tasks', value: stats.my_tasks, icon: LayoutDashboard, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Completed', value: stats.completed_tasks, icon: CheckSquare, color: 'bg-zinc-50 text-zinc-700' },
    { label: 'Knowledge Base', value: stats.total_articles, icon: FileText, color: 'bg-amber-50 text-amber-700' },
    { label: 'Team Members', value: stats.total_users, icon: Users, color: 'bg-red-50 text-red-700' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="space-y-8">
      <div>
        <h1 className="font-outfit text-4xl sm:text-5xl tracking-tight text-zinc-900 font-medium mb-2">
          Welcome back, {user.name}
        </h1>
        <p className="font-plex text-base text-zinc-600 leading-relaxed">
          Here's what's happening with your team today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-sm hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`inline-flex p-3 rounded-xl ${stat.color} mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-outfit text-3xl font-medium text-zinc-900 mb-1">{stat.value}</div>
              <div className="font-plex text-sm text-zinc-500">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {recentTasks.length > 0 && (
        <div>
          <h2 className="font-outfit text-2xl sm:text-3xl tracking-tight text-zinc-900 font-medium mb-6">
            Recent Tasks
          </h2>
          <div className="space-y-3">
            {recentTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`recent-task-${index}`}
                className="bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-sm hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-plex text-base text-zinc-900 font-medium">{task.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        task.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                        task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-zinc-50 text-zinc-700 border-zinc-200'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.assigned_to_name && (
                        <span className="font-plex text-xs text-zinc-500">
                          Assigned to {task.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
