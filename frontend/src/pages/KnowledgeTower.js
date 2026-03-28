import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Palette,
  X,
  Menu,
  Send,
  Copy,
  Edit2,
  MoveRight,
  FolderPlus,
  FilePlus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const COLORS = [
  { name: 'zinc',    class: 'text-zinc-500',    dot: 'bg-zinc-400'    },
  { name: 'red',     class: 'text-red-500',     dot: 'bg-red-500'     },
  { name: 'orange',  class: 'text-orange-500',  dot: 'bg-orange-500'  },
  { name: 'amber',   class: 'text-amber-500',   dot: 'bg-amber-500'   },
  { name: 'emerald', class: 'text-emerald-500', dot: 'bg-emerald-500' },
  { name: 'blue',    class: 'text-blue-500',    dot: 'bg-blue-500'    },
  { name: 'violet',  class: 'text-violet-500',  dot: 'bg-violet-500'  },
  { name: 'pink',    class: 'text-pink-500',    dot: 'bg-pink-500'    },
];

const BG_COLORS = [
  { name: 'White',      value: '#FFFFFF' },
  { name: 'Warm Cream', value: '#FFF8F0' },
  { name: 'Light Gray', value: '#F4F4F5' },
  { name: 'Soft Blue',  value: '#F0F4FF' },
  { name: 'Soft Green', value: '#F0FFF4' },
  { name: 'Soft Pink',  value: '#FFF0F5' },
  { name: 'Dark Mode',  value: '#18181B' },
];

const getColorClass = (colorName) =>
  (COLORS.find(c => c.name === colorName) || COLORS[0]).class;

const getDotClass = (colorName) =>
  (COLORS.find(c => c.name === colorName) || COLORS[0]).dot;

export default function KnowledgeTower({ user }) {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [treeVisible, setTreeVisible] = useState(true);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  // Saghboop search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSaghboopResponse, setShowSaghboopResponse] = useState(false);

  // Editor
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Dialogs
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showColorPickerDialog, setShowColorPickerDialog] = useState(false);
  const [showBgColorDialog, setShowBgColorDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState(null);

  // Context menu
  const [contextMenuTarget, setContextMenuTarget] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Drag and drop
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(undefined);

  const contentEditableRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setShowContextMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        axios.get(`${API}/tower/folders`, getAuthHeader()),
        axios.get(`${API}/tower/files`, getAuthHeader()),
      ]);
      setFolders(foldersRes.data);
      setFiles(filesRes.data);
    } catch {
      toast.error('Failed to load Knowledge Tower');
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const createFolder = async () => {
    if (!newItemName.trim()) return;
    try {
      const res = await axios.post(
        `${API}/tower/folders`,
        { name: newItemName, parent_id: newItemParent, color: 'zinc', order: folders.length },
        getAuthHeader()
      );
      setFolders(prev => [...prev, res.data]);
      if (newItemParent) expandFolder(newItemParent);
      resetNewItem();
      setShowNewFolderDialog(false);
      toast.success('Folder created');
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const createFile = async () => {
    if (!newItemName.trim()) return;
    try {
      const res = await axios.post(
        `${API}/tower/files`,
        { name: newItemName, folder_id: newItemParent, content: '', color: 'zinc', bg_color: '#FFFFFF', order: files.length },
        getAuthHeader()
      );
      setFiles(prev => [...prev, res.data]);
      if (newItemParent) expandFolder(newItemParent);
      resetNewItem();
      setShowNewFileDialog(false);
      toast.success('File created');
      openFile(res.data.id);
    } catch {
      toast.error('Failed to create file');
    }
  };

  const renameItem = async () => {
    if (!newItemName.trim() || !contextMenuTarget) return;
    const { type, item } = contextMenuTarget;
    try {
      if (type === 'folder') {
        const res = await axios.patch(`${API}/tower/folders/${item.id}`, { name: newItemName }, getAuthHeader());
        setFolders(prev => prev.map(f => f.id === item.id ? res.data : f));
      } else {
        const res = await axios.patch(`${API}/tower/files/${item.id}`, { name: newItemName }, getAuthHeader());
        setFiles(prev => prev.map(f => f.id === item.id ? res.data : f));
        if (selectedFile?.id === item.id) setSelectedFile(s => ({ ...s, name: newItemName }));
      }
      setNewItemName('');
      setShowRenameDialog(false);
      toast.success('Renamed');
    } catch {
      toast.error('Failed to rename');
    }
  };

  const changeItemColor = async (colorName) => {
    if (!contextMenuTarget) return;
    const { type, item } = contextMenuTarget;
    try {
      if (type === 'folder') {
        const res = await axios.patch(`${API}/tower/folders/${item.id}`, { color: colorName }, getAuthHeader());
        setFolders(prev => prev.map(f => f.id === item.id ? res.data : f));
      } else {
        const res = await axios.patch(`${API}/tower/files/${item.id}`, { color: colorName }, getAuthHeader());
        setFiles(prev => prev.map(f => f.id === item.id ? res.data : f));
        if (selectedFile?.id === item.id) setSelectedFile(s => ({ ...s, color: colorName }));
      }
      setShowColorPickerDialog(false);
      toast.success('Color updated');
    } catch {
      toast.error('Failed to update color');
    }
  };

  const duplicateFile = async (file) => {
    try {
      const full = await axios.get(`${API}/tower/files/${file.id}`, getAuthHeader());
      const res = await axios.post(
        `${API}/tower/files`,
        { name: `${file.name} (copy)`, folder_id: file.folder_id, content: full.data.content, color: file.color, bg_color: file.bg_color, order: files.length },
        getAuthHeader()
      );
      setFiles(prev => [...prev, res.data]);
      toast.success('File duplicated');
    } catch {
      toast.error('Failed to duplicate file');
    }
  };

  const moveFile = async (folderId) => {
    if (!contextMenuTarget) return;
    const { item } = contextMenuTarget;
    try {
      const res = await axios.patch(`${API}/tower/files/${item.id}`, { folder_id: folderId ?? null }, getAuthHeader());
      setFiles(prev => prev.map(f => f.id === item.id ? res.data : f));
      if (folderId) expandFolder(folderId);
      setShowMoveDialog(false);
      toast.success('File moved');
    } catch {
      toast.error('Failed to move file');
    }
  };

  const openFile = async (fileId) => {
    try {
      const res = await axios.get(`${API}/tower/files/${fileId}`, getAuthHeader());
      setSelectedFile(res.data);
      setEditingContent(res.data.content);
      setMobileTreeOpen(false);
    } catch {
      toast.error('Failed to open file');
    }
  };

  const saveFile = useCallback(async (content) => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await axios.patch(`${API}/tower/files/${selectedFile.id}`, { content }, getAuthHeader());
      setSaving(false);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    } catch {
      setSaving(false);
      toast.error('Failed to save');
    }
  }, [selectedFile]);

  const handleContentChange = () => {
    const content = contentEditableRef.current?.innerHTML || '';
    setEditingContent(content);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveFile(content), 2000);
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await axios.delete(`${API}/tower/files/${fileId}`, getAuthHeader());
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) setSelectedFile(null);
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const getAllSubfolderIds = useCallback((folderId) => {
    const subs = folders.filter(f => f.parent_id === folderId).map(f => f.id);
    return [...subs, ...subs.flatMap(id => getAllSubfolderIds(id))];
  }, [folders]);

  const deleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder and all its contents?')) return;
    try {
      await axios.delete(`${API}/tower/folders/${folderId}`, getAuthHeader());
      const subIds = getAllSubfolderIds(folderId);
      const allIds = [folderId, ...subIds];
      setFolders(prev => prev.filter(f => !allIds.includes(f.id)));
      setFiles(prev => {
        const removed = prev.filter(f => allIds.includes(f.folder_id));
        if (selectedFile && removed.some(f => f.id === selectedFile.id)) setSelectedFile(null);
        return prev.filter(f => !allIds.includes(f.folder_id));
      });
      toast.success('Folder deleted');
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const searchTower = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowSaghboopResponse(true);
    try {
      const res = await axios.get(`${API}/tower/search?q=${encodeURIComponent(searchQuery)}`, getAuthHeader());
      setSearchResults(res.data);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const seedData = async () => {
    try {
      const res = await axios.post(`${API}/tower/seed`, {}, getAuthHeader());
      if (res.data.seeded) {
        toast.success('Sample data loaded!');
        loadData();
      } else {
        toast.info('Tower already has sample data');
      }
    } catch {
      toast.error('Failed to seed data');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const expandFolder = (id) => setExpandedFolders(prev => new Set([...prev, id]));

  const toggleFolder = (id) => setExpandedFolders(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const resetNewItem = () => { setNewItemName(''); setNewItemParent(null); };

  const openContextMenu = (e, type, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTarget({ type, item });
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e, file) => {
    setDragging(file);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(folderId);
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    setDragOver(undefined);
    if (!dragging || dragging.folder_id === folderId) { setDragging(null); return; }
    try {
      const res = await axios.patch(`${API}/tower/files/${dragging.id}`, { folder_id: folderId ?? null }, getAuthHeader());
      setFiles(prev => prev.map(f => f.id === dragging.id ? res.data : f));
      if (folderId) expandFolder(folderId);
      toast.success('File moved');
    } catch {
      toast.error('Failed to move file');
    }
    setDragging(null);
  };

  // ── Tree renderer ─────────────────────────────────────────────────────────

  const renderTree = (parentId = null, level = 0) => {
    const childFolders = folders.filter(f => f.parent_id === parentId);
    const childFiles = files.filter(f => f.folder_id === parentId);
    if (childFolders.length === 0 && childFiles.length === 0) return null;

    return (
      <>
        {childFolders.map(folder => (
          <div
            key={folder.id}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            <div
              data-testid={`folder-${folder.id}`}
              style={{ paddingLeft: `${level * 20 + 8}px` }}
              className={`flex items-center gap-1.5 h-8 pr-2 rounded-lg hover:bg-zinc-100 cursor-pointer group transition-colors ${
                dragOver === folder.id ? 'bg-blue-50 ring-1 ring-blue-300' : ''
              }`}
              onClick={() => toggleFolder(folder.id)}
              onContextMenu={(e) => openContextMenu(e, 'folder', folder)}
            >
              {expandedFolders.has(folder.id)
                ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
              {expandedFolders.has(folder.id)
                ? <FolderOpen className={`w-4 h-4 flex-shrink-0 ${getColorClass(folder.color)}`} />
                : <Folder className={`w-4 h-4 flex-shrink-0 ${getColorClass(folder.color)}`} />}
              <span className="flex-1 font-plex text-sm font-medium text-zinc-900 truncate">{folder.name}</span>
              <button
                onClick={(e) => openContextMenu(e, 'folder', folder)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded flex-shrink-0 transition-opacity"
                aria-label="Folder options"
              >
                <MoreVertical className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
            {expandedFolders.has(folder.id) && renderTree(folder.id, level + 1)}
          </div>
        ))}
        {childFiles.map(file => (
          <div
            key={file.id}
            data-testid={`file-${file.id}`}
            style={{ paddingLeft: `${level * 20 + 28}px` }}
            draggable
            onDragStart={(e) => handleDragStart(e, file)}
            onDragEnd={() => setDragging(null)}
            className={`flex items-center gap-1.5 h-8 pr-2 rounded-lg hover:bg-zinc-100 cursor-pointer group transition-colors ${
              selectedFile?.id === file.id ? 'bg-zinc-100' : ''
            } ${dragging?.id === file.id ? 'opacity-50' : ''}`}
            onClick={() => openFile(file.id)}
            onContextMenu={(e) => openContextMenu(e, 'file', file)}
          >
            <FileText className={`w-4 h-4 flex-shrink-0 ${getColorClass(file.color)}`} />
            <span className="flex-1 font-plex text-sm text-zinc-900 truncate">{file.name}</span>
            {file.color && file.color !== 'zinc' && (
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotClass(file.color)}`} />
            )}
            <button
              onClick={(e) => openContextMenu(e, 'file', file)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded flex-shrink-0 transition-opacity"
              aria-label="File options"
            >
              <MoreVertical className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        ))}
      </>
    );
  };

  // ── Tree Panel (shared for desktop + mobile drawer) ───────────────────────

  const TreePanel = () => (
    <div className="h-full flex flex-col bg-zinc-50">
      <div className="p-4 border-b border-zinc-200">
        <div className="flex items-center gap-2 mb-3">
          <Library className="w-5 h-5 text-zinc-900" />
          <h2 className="font-outfit text-base font-semibold text-zinc-900">Knowledge Tower</h2>
        </div>
        <div className="flex gap-1.5">
          <Button
            data-testid="new-folder-button"
            onClick={() => { resetNewItem(); setShowNewFolderDialog(true); }}
            variant="outline"
            size="sm"
            className="flex-1 rounded-full text-xs h-7"
          >
            <Plus className="w-3 h-3 mr-1" />Folder
          </Button>
          <Button
            data-testid="new-file-button"
            onClick={() => { resetNewItem(); setShowNewFileDialog(true); }}
            variant="outline"
            size="sm"
            className="flex-1 rounded-full text-xs h-7"
          >
            <Plus className="w-3 h-3 mr-1" />File
          </Button>
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto p-2"
        onDragOver={(e) => handleDragOver(e, null)}
        onDrop={(e) => handleDrop(e, null)}
      >
        {folders.length === 0 && files.length === 0 ? (
          <div className="text-center py-10">
            <Library className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="font-plex text-xs text-zinc-400 mb-4">Tower is empty</p>
            <button
              onClick={seedData}
              className="font-plex text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Load sample data
            </button>
          </div>
        ) : (
          renderTree()
        )}
      </div>
    </div>
  );

  const isDarkMode = selectedFile?.bg_color === '#18181B';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="knowledge-tower"
      className="flex h-[calc(100vh-4rem)] overflow-hidden -m-4 sm:-m-6 lg:-m-8"
    >
      {/* Desktop tree panel */}
      <AnimatePresence initial={false}>
        {treeVisible && (
          <motion.div
            key="tree"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block border-r border-zinc-200 overflow-hidden flex-shrink-0"
          >
            <div style={{ width: 280 }}>
              <TreePanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileTreeOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileTreeOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] z-50 shadow-xl lg:hidden"
            >
              <TreePanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="px-4 py-3 border-b border-zinc-200 bg-white flex items-center gap-3 flex-shrink-0">
          {/* Mobile toggle */}
          <button
            data-testid="mobile-tree-toggle"
            onClick={() => setMobileTreeOpen(true)}
            className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg"
            aria-label="Open file tree"
          >
            <Menu className="w-5 h-5 text-zinc-600" />
          </button>
          {/* Desktop toggle */}
          <button
            data-testid="toggle-tree-button"
            onClick={() => setTreeVisible(v => !v)}
            className="hidden lg:flex p-2 hover:bg-zinc-100 rounded-lg"
            aria-label="Toggle file tree"
          >
            <Menu className="w-5 h-5 text-zinc-600" />
          </button>

          {selectedFile ? (
            <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
              <div className="min-w-0">
                <h2 className="font-outfit text-lg font-medium text-zinc-900 truncate leading-tight">
                  {selectedFile.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                  <span>Created {new Date(selectedFile.created_at).toLocaleDateString()}</span>
                  <span>Modified {new Date(selectedFile.updated_at).toLocaleDateString()}</span>
                  {saving && <span className="text-zinc-500 animate-pulse">Saving…</span>}
                  {savedIndicator && !saving && <span className="text-emerald-500">✓ Saved</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  onClick={() => setShowBgColorDialog(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  data-testid="bg-color-button"
                  title="Change background"
                >
                  <Palette className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => deleteFile(selectedFile.id)}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-red-600 hover:bg-red-50 hover:border-red-200"
                  data-testid="delete-file-button"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  data-testid="close-file-button"
                  title="Close file"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Library className="w-4 h-4 text-zinc-400" />
              <span className="font-plex text-sm text-zinc-500">Knowledge Tower</span>
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {!selectedFile ? (
            /* Welcome / Saghboop greeting */
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center">
              <div className="text-6xl mb-4 select-none">📚</div>
              <h3 className="font-outfit text-2xl font-medium text-zinc-900 mb-2">مرحبا! أنا صغبوب</h3>
              <p className="font-plex text-base text-zinc-500 mb-8 max-w-md">
                Ask me anything about what's in the Knowledge Tower
              </p>
              {files.length > 0 ? (
                <div className="w-full max-w-lg text-left">
                  <h4 className="font-plex text-sm font-semibold text-zinc-900 mb-3">Recent Files</h4>
                  <div className="grid gap-2">
                    {[...files]
                      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                      .slice(0, 5)
                      .map(file => (
                        <div
                          key={file.id}
                          onClick={() => openFile(file.id)}
                          className="p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <FileText className={`w-4 h-4 flex-shrink-0 ${getColorClass(file.color)}`} />
                          <span className="font-plex text-sm font-medium text-zinc-900 flex-1 truncate">{file.name}</span>
                          <span className="font-plex text-xs text-zinc-400 flex-shrink-0">
                            {new Date(file.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={seedData}
                  className="font-plex text-sm text-blue-500 hover:text-blue-700 underline"
                >
                  Load sample data to get started
                </button>
              )}
            </div>
          ) : (
            /* File editor */
            <div className="h-full p-4 sm:p-6 lg:p-8">
              <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                dangerouslySetInnerHTML={{ __html: editingContent }}
                data-placeholder="Paste or type your content here…"
                style={{
                  backgroundColor: selectedFile.bg_color,
                  color: isDarkMode ? '#f4f4f5' : '#18181B',
                  minHeight: 'calc(100vh - 18rem)',
                }}
                className="tower-editor w-full p-6 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-plex text-base leading-relaxed whitespace-pre-wrap"
              />
            </div>
          )}
        </div>

        {/* Saghboop sticky chat bar */}
        <div className="flex-shrink-0 border-t border-zinc-200 bg-white/90 backdrop-blur-sm p-4">
          <AnimatePresence>
            {showSaghboopResponse && (
              <motion.div
                key="response"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                className="mb-3 p-4 bg-white rounded-2xl border border-zinc-200 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0 select-none">📚</div>
                  <div className="flex-1 min-w-0">
                    {searching ? (
                      <p className="font-plex text-sm text-zinc-500 animate-pulse">
                        Saghboop is searching the tower…
                      </p>
                    ) : searchResults.length > 0 ? (
                      <>
                        <p className="font-plex text-sm font-medium text-zinc-900 mb-2">
                          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                        </p>
                        <div className="space-y-2">
                          {searchResults.map(result => (
                            <div
                              key={result.file_id}
                              onClick={() => { openFile(result.file_id); setShowSaghboopResponse(false); }}
                              className="p-2 bg-zinc-50 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${getColorClass(result.color)}`} />
                                <span className="font-plex text-sm font-medium text-zinc-900 truncate">{result.file_name}</span>
                              </div>
                              {result.snippet && (
                                <p className="font-plex text-xs text-zinc-500 pl-5 truncate">{result.snippet}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="font-plex text-sm text-zinc-500">
                        No results found for "{searchQuery}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSaghboopResponse(false)}
                    className="p-1 hover:bg-zinc-100 rounded flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <Input
              data-testid="saghboop-input"
              placeholder="Ask Saghboop about anything in the tower…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchTower()}
              className="flex-1 rounded-full border-zinc-200"
            />
            <Button
              data-testid="saghboop-search-button"
              onClick={searchTower}
              disabled={searching}
              className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
              aria-label="Search"
            >
              {searching
                ? <Search className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Context Menu ── */}
      <AnimatePresence>
        {showContextMenu && contextMenuTarget && (
          <motion.div
            key="ctx"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.08 }}
            style={{ top: contextMenuPos.y, left: contextMenuPos.x, position: 'fixed', zIndex: 200 }}
            className="bg-white rounded-xl shadow-xl border border-zinc-200 p-1 min-w-[190px]"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenuTarget.type === 'folder' ? (
              <>
                <CtxBtn icon={<Edit2 className="w-3.5 h-3.5" />} label="Rename" onClick={() => {
                  setNewItemName(contextMenuTarget.item.name);
                  setShowRenameDialog(true);
                  setShowContextMenu(false);
                }} />
                <CtxBtn icon={<Palette className="w-3.5 h-3.5" />} label="Change Color" onClick={() => {
                  setShowColorPickerDialog(true);
                  setShowContextMenu(false);
                }} />
                <CtxBtn icon={<FilePlus className="w-3.5 h-3.5" />} label="New File Inside" onClick={() => {
                  setNewItemParent(contextMenuTarget.item.id);
                  setNewItemName('');
                  setShowNewFileDialog(true);
                  setShowContextMenu(false);
                }} />
                <CtxBtn icon={<FolderPlus className="w-3.5 h-3.5" />} label="New Sub-folder" onClick={() => {
                  setNewItemParent(contextMenuTarget.item.id);
                  setNewItemName('');
                  setShowNewFolderDialog(true);
                  setShowContextMenu(false);
                }} />
                <div className="my-1 h-px bg-zinc-100" />
                <CtxBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete Folder" danger onClick={() => {
                  deleteFolder(contextMenuTarget.item.id);
                  setShowContextMenu(false);
                }} />
              </>
            ) : (
              <>
                <CtxBtn icon={<Edit2 className="w-3.5 h-3.5" />} label="Rename" onClick={() => {
                  setNewItemName(contextMenuTarget.item.name);
                  setShowRenameDialog(true);
                  setShowContextMenu(false);
                }} />
                <CtxBtn icon={<Palette className="w-3.5 h-3.5" />} label="Change Color" onClick={() => {
                  setShowColorPickerDialog(true);
                  setShowContextMenu(false);
                }} />
                <CtxBtn icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate" onClick={() => {
                  duplicateFile(contextMenuTarget.item);
                  setShowContextMenu(false);
                }} />
                <CtxBtn icon={<MoveRight className="w-3.5 h-3.5" />} label="Move to Folder" onClick={() => {
                  setShowMoveDialog(true);
                  setShowContextMenu(false);
                }} />
                <div className="my-1 h-px bg-zinc-100" />
                <CtxBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete File" danger onClick={() => {
                  deleteFile(contextMenuTarget.item.id);
                  setShowContextMenu(false);
                }} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialogs ── */}

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            className="rounded-xl"
          />
          <Button onClick={createFolder} className="rounded-full bg-zinc-900 text-white">Create Folder</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Create New File</DialogTitle></DialogHeader>
          <Input
            autoFocus
            placeholder="File name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFile()}
            className="rounded-xl"
          />
          <Button onClick={createFile} className="rounded-full bg-zinc-900 text-white">Create File</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Rename {contextMenuTarget?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="New name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && renameItem()}
            className="rounded-xl"
          />
          <Button onClick={renameItem} className="rounded-full bg-zinc-900 text-white">Rename</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showColorPickerDialog} onOpenChange={setShowColorPickerDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Choose Color</DialogTitle></DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map(color => (
              <button
                key={color.name}
                onClick={() => changeItemColor(color.name)}
                className="h-10 rounded-lg border-2 border-zinc-200 hover:border-zinc-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className={`w-4 h-4 rounded-full ${color.dot}`} />
                <span className="font-plex text-xs capitalize text-zinc-700">{color.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBgColorDialog} onOpenChange={setShowBgColorDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Background Color</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {BG_COLORS.map(color => (
              <button
                key={color.value}
                onClick={async () => {
                  try {
                    await axios.patch(`${API}/tower/files/${selectedFile.id}`, { bg_color: color.value }, getAuthHeader());
                    setSelectedFile(s => ({ ...s, bg_color: color.value }));
                    setShowBgColorDialog(false);
                    toast.success('Background updated');
                  } catch {
                    toast.error('Failed to update background');
                  }
                }}
                style={{ backgroundColor: color.value }}
                className="h-12 rounded-lg border-2 border-zinc-200 hover:border-zinc-900 flex items-center justify-center font-plex text-xs font-medium transition-colors"
              >
                <span style={{ color: color.value === '#18181B' ? '#f4f4f5' : '#18181B' }}>
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Move to Folder</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => moveFile(null)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 font-plex text-sm text-zinc-700 transition-colors"
            >
              <Library className="w-4 h-4 text-zinc-400" /> Root Level
            </button>
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => moveFile(folder.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 font-plex text-sm text-zinc-700 transition-colors"
              >
                <Folder className={`w-4 h-4 ${getColorClass(folder.color)}`} />
                {folder.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small helper component ────────────────────────────────────────────────────

function CtxBtn({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-plex text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
