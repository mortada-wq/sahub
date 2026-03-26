import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Megaphone, Plus, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function UpdatesPage({ user }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    content: '',
    type: 'announcement'
  });

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      const response = await axios.get(`${API}/updates`, getAuthHeader());
      setUpdates(response.data);
    } catch (error) {
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.title.trim() || !newUpdate.content.trim()) return;

    try {
      const response = await axios.post(`${API}/updates`, newUpdate, getAuthHeader());
      setUpdates([response.data, ...updates]);
      setNewUpdate({ title: '', content: '', type: 'announcement' });
      setShowCreateDialog(false);
      toast.success('Update posted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create update');
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    try {
      await axios.delete(`${API}/updates/${updateId}`, getAuthHeader());
      setUpdates(updates.filter(u => u.id !== updateId));
      toast.success('Update deleted');
    } catch (error) {
      toast.error('Failed to delete update');
    }
  };

  const canCreateUpdate = user.role === 'admin' || user.role === 'manager';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div data-testid="updates-page" className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl sm:text-4xl lg:text-5xl tracking-tight text-zinc-900 font-medium mb-2">
            Company Updates
          </h1>
          <p className="font-plex text-sm sm:text-base text-zinc-600 leading-relaxed">
            Latest news and announcements
          </p>
        </div>
        {canCreateUpdate && (
          <Button
            data-testid="create-update-button"
            onClick={() => setShowCreateDialog(true)}
            className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-plex font-medium w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Update
          </Button>
        )}
      </div>

      {updates.length === 0 ? (
        <div className="text-center py-16 border border-zinc-200 rounded-2xl">
          <Megaphone className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="font-plex text-base text-zinc-500 mb-4">No updates yet</p>
          {canCreateUpdate && (
            <Button
              data-testid="create-first-update-button"
              onClick={() => setShowCreateDialog(true)}
              className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
            >
              Post First Update
            </Button>
          )}
        </div>
      ) : (
        <div className="max-w-3xl space-y-4 sm:space-y-6">
          {updates.map((update, index) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`update-item-${index}`}
              className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    update.type === 'announcement' ? 'bg-blue-50' :
                    update.type === 'feature' ? 'bg-emerald-50' :
                    'bg-amber-50'
                  }`}>
                    <Megaphone className={`w-5 h-5 ${
                      update.type === 'announcement' ? 'text-blue-600' :
                      update.type === 'feature' ? 'text-emerald-600' :
                      'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      update.type === 'announcement' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      update.type === 'feature' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {update.type}
                    </span>
                  </div>
                </div>
                {canCreateUpdate && (
                  <Button
                    data-testid={`delete-update-${index}-button`}
                    onClick={() => handleDeleteUpdate(update.id)}
                    variant="outline"
                    className="rounded-full text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <h3 className="font-outfit text-2xl font-medium text-zinc-900 mb-3">{update.title}</h3>
              <p className="font-plex text-base text-zinc-700 leading-relaxed mb-4 whitespace-pre-wrap">
                {update.content}
              </p>
              <div className="flex items-center text-sm text-zinc-500">
                <span className="font-plex">Posted by {update.created_by_name}</span>
                <span className="mx-2">•</span>
                <span className="font-plex">{new Date(update.created_at).toLocaleString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Update Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="create-update-dialog" className="max-w-2xl rounded-2xl" aria-describedby="create-update-description">
          <DialogHeader>
            <DialogTitle className="font-outfit text-2xl font-medium">Post New Update</DialogTitle>
          </DialogHeader>
          <div id="create-update-description" className="sr-only">Form to post a new company update or announcement</div>
          <form onSubmit={handleCreateUpdate} className="space-y-4">
            <div>
              <label className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                Title
              </label>
              <Input
                data-testid="update-title-input"
                value={newUpdate.title}
                onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                className="rounded-xl border-zinc-200"
                placeholder="Update title..."
                required
              />
            </div>
            <div>
              <label className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                Type
              </label>
              <select
                data-testid="update-type-select"
                value={newUpdate.type}
                onChange={(e) => setNewUpdate({ ...newUpdate, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white font-plex text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="announcement">Announcement</option>
                <option value="news">News</option>
                <option value="feature">Feature</option>
              </select>
            </div>
            <div>
              <label className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                Content
              </label>
              <Textarea
                data-testid="update-content-textarea"
                value={newUpdate.content}
                onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                className="rounded-xl border-zinc-200 min-h-[150px]"
                placeholder="Write your update..."
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                data-testid="cancel-update-button"
                type="button"
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                data-testid="submit-update-button"
                type="submit"
                className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
              >
                Post Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
