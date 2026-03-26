import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function TasksPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: ''
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeader()),
        axios.get(`${API}/users`, getAuthHeader())
      ]);
      setTasks(tasksRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const response = await axios.post(`${API}/tasks`, newTask, getAuthHeader());
      setTasks([response.data, ...tasks]);
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
      toast.success('Task created successfully!');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const response = await axios.patch(`${API}/tasks/${taskId}`, { status: newStatus }, getAuthHeader());
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      if (selectedTask?.id === taskId) setSelectedTask(response.data);
      toast.success('Task updated!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`, getAuthHeader());
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedTask) return;

    try {
      const response = await axios.post(
        `${API}/tasks/${selectedTask.id}/comments`,
        { text: comment },
        getAuthHeader()
      );
      setSelectedTask(response.data);
      setTasks(tasks.map(t => t.id === selectedTask.id ? response.data : t));
      setComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const filteredTasks = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div data-testid="tasks-page" className="h-full flex flex-col pb-32">
      <div className="mb-6">
        <h1 className="font-outfit text-4xl sm:text-5xl tracking-tight text-zinc-900 font-medium mb-4">
          Tasks
        </h1>
        
        <div className="flex gap-2 flex-wrap">
          {['all', 'todo', 'in_progress', 'completed'].map(status => (
            <button
              key={status}
              data-testid={`filter-${status}-button`}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full font-plex text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-plex text-base text-zinc-500">No tasks found. Create one below!</p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`task-item-${index}`}
              className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-plex text-base font-medium text-zinc-900 mb-2">{task.title}</h3>
                  {task.description && (
                    <p className="font-plex text-sm text-zinc-600 mb-3">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
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
                        → {task.assigned_to_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="font-plex text-xs text-zinc-500">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.comments?.length > 0 && (
                      <span className="inline-flex items-center gap-1 font-plex text-xs text-zinc-500">
                        <MessageSquare className="w-3 h-3" />
                        {task.comments.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    data-testid={`delete-task-${index}-button`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Chat-like sticky input */}
      <div className="fixed bottom-6 left-64 right-6 ml-6">
        <form onSubmit={handleCreateTask} className="bg-white border border-zinc-200 rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              data-testid="task-assign-select"
              value={newTask.assigned_to}
              onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white font-plex text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Assign to...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select
              data-testid="task-priority-select"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white font-plex text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <Input
              data-testid="task-due-date-input"
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="rounded-xl border-zinc-200"
            />
          </div>
          <div className="flex gap-3">
            <Input
              data-testid="task-title-input"
              placeholder="Assign a task..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="flex-1 rounded-xl border-zinc-200 font-plex"
            />
            <Input
              data-testid="task-description-input"
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="flex-1 rounded-xl border-zinc-200 font-plex"
            />
            <Button
              data-testid="create-task-button"
              type="submit"
              className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent data-testid="task-detail-dialog" className="max-w-2xl rounded-2xl" aria-describedby="task-detail-description">
          <DialogHeader>
            <DialogTitle className="font-outfit text-2xl font-medium">{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          <div id="task-detail-description" className="sr-only">Task details and comments</div>
          {selectedTask && (
            <div className="space-y-6">
              <div>
                <p className="font-plex text-sm text-zinc-600 mb-4">{selectedTask.description || 'No description'}</p>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    selectedTask.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                    selectedTask.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {selectedTask.priority}
                  </span>
                  {selectedTask.assigned_to_name && (
                    <span className="font-plex text-xs text-zinc-600">
                      Assigned to: {selectedTask.assigned_to_name}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {['todo', 'in_progress', 'completed'].map(status => (
                    <button
                      key={status}
                      data-testid={`status-${status}-button`}
                      onClick={() => handleUpdateStatus(selectedTask.id, status)}
                      className={`px-4 py-2 rounded-full font-plex text-xs font-medium transition-all ${
                        selectedTask.status === status
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-plex text-sm font-semibold text-zinc-900 mb-3">Comments ({selectedTask.comments?.length || 0})</h4>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {selectedTask.comments?.map((c) => (
                    <div key={c.id} className="bg-zinc-50 rounded-xl p-3">
                      <p className="font-plex text-sm text-zinc-900">{c.text}</p>
                      <p className="font-plex text-xs text-zinc-500 mt-1">
                        {c.user_name} • {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    data-testid="comment-input"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 rounded-xl"
                  />
                  <Button
                    data-testid="add-comment-button"
                    onClick={handleAddComment}
                    className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
