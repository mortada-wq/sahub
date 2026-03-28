import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function KnowledgePage({ user }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const { t } = useLanguage();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await axios.get(`${API}/articles`, getAuthHeader());
      setArticles(response.data);
    } catch (error) {
      toast.error(t.failedToLoadArticles);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (e) => {
    e.preventDefault();
    if (!newArticle.title.trim() || !newArticle.content.trim()) return;

    try {
      const response = await axios.post(`${API}/articles`, newArticle, getAuthHeader());
      setArticles([response.data, ...articles]);
      setNewArticle({ title: '', content: '', category: 'general' });
      setShowCreateDialog(false);
      toast.success(t.articleCreated);
    } catch (error) {
      toast.error(t.failedToCreateArticle);
    }
  };

  const handleDeleteArticle = async (articleId) => {
    try {
      await axios.delete(`${API}/articles/${articleId}`, getAuthHeader());
      setArticles(articles.filter(a => a.id !== articleId));
      setSelectedArticle(null);
      toast.success(t.articleDeleted);
    } catch (error) {
      toast.error(t.failedToDeleteArticle);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div data-testid="knowledge-page" className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl sm:text-4xl lg:text-5xl tracking-tight text-zinc-900 font-medium mb-2">
            {t.knowledgeBaseTitle}
          </h1>
          <p className="font-plex text-sm sm:text-base text-zinc-600 leading-relaxed">
            {t.knowledgeSubtitle}
          </p>
        </div>
        <Button
          data-testid="create-article-button"
          onClick={() => setShowCreateDialog(true)}
          className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-plex font-medium w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 me-2" />
          {t.newArticle}
        </Button>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 border border-zinc-200 rounded-2xl">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="font-plex text-base text-zinc-500 mb-4">{t.noArticlesYet}</p>
          <Button
            data-testid="create-first-article-button"
            onClick={() => setShowCreateDialog(true)}
            className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
          >
            {t.createFirstArticle}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {articles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`article-card-${index}`}
              onClick={() => setSelectedArticle(article)}
              className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {article.category}
                  </span>
                </div>
              </div>
              <h3 className="font-outfit text-xl font-medium text-zinc-900 mb-2">{article.title}</h3>
              <p className="font-plex text-sm text-zinc-600 line-clamp-3 mb-4">
                {article.content}
              </p>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-plex">
                  {t.by} {article.created_by_name}</span>
                <span className="font-plex">{new Date(article.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Article Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="create-article-dialog" className="max-w-2xl rounded-2xl" aria-describedby="create-article-description">
          <DialogHeader>
            <DialogTitle className="font-outfit text-2xl font-medium">{t.createNewArticle}</DialogTitle>
          </DialogHeader>
          <div id="create-article-description" className="sr-only">Form to create a new knowledge base article</div>
          <form onSubmit={handleCreateArticle} className="space-y-4">
            <div>
              <label className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                {t.title}
              </label>
              <Input
                data-testid="article-title-input"
                value={newArticle.title}
                onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                className="rounded-xl border-zinc-200"
                placeholder={t.articleTitlePlaceholder}
                required
              />
            </div>
            <div>
              <label className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                {t.category}
              </label>
              <select
                data-testid="article-category-select"
                value={newArticle.category}
                onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white font-plex text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="general">{t.categoryGeneral}</option>
                <option value="onboarding">{t.categoryOnboarding}</option>
                <option value="processes">{t.categoryProcesses}</option>
                <option value="guidelines">{t.categoryGuidelines}</option>
                <option value="technical">{t.categoryTechnical}</option>
              </select>
            </div>
            <div>
              <label className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                {t.content}
              </label>
              <Textarea
                data-testid="article-content-textarea"
                value={newArticle.content}
                onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                className="rounded-xl border-zinc-200 min-h-[200px]"
                placeholder={t.articleContentPlaceholder}
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                data-testid="cancel-article-button"
                type="button"
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
                className="rounded-full"
              >
                {t.cancel}
              </Button>
              <Button
                data-testid="submit-article-button"
                type="submit"
                className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
              >
                {t.createArticle}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent data-testid="view-article-dialog" className="max-w-3xl rounded-2xl max-h-[80vh] overflow-y-auto" aria-describedby="view-article-description">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 mb-3">
                  {selectedArticle?.category}
                </span>
                <DialogTitle className="font-outfit text-3xl font-medium mb-2">
                  {selectedArticle?.title}
                </DialogTitle>
                <p className="font-plex text-sm text-zinc-500">
                  {t.by} {selectedArticle?.created_by_name} • {selectedArticle && new Date(selectedArticle.created_at).toLocaleDateString()}
                </p>
              </div>
              {(user.role === 'admin' || user.role === 'manager' || selectedArticle?.created_by === user.id) && (
                <Button
                  data-testid="delete-article-button"
                  onClick={() => handleDeleteArticle(selectedArticle?.id)}
                  variant="outline"
                  className="rounded-full text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          <div id="view-article-description" className="sr-only">Full article content and details</div>
          <div className="mt-6">
            <p className="font-plex text-base text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {selectedArticle?.content}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
