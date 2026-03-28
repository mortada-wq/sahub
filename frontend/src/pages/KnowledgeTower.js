import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Library,
  Folder,
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
  FolderOpen,
  Save
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
  { name: 'zinc', class: 'text-zinc-500', bg: 'bg-zinc-50' },
  { name: 'red', class: 'text-red-500', bg: 'bg-red-50' },
  { name: 'orange', class: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'amber', class: 'text-amber-500', bg: 'bg-amber-50' },
  { name: 'emerald', class: 'text-emerald-500', bg: 'bg-emerald-50' },
  { name: 'blue', class: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'violet', class: 'text-violet-500', bg: 'bg-violet-50' },
  { name: 'pink', class: 'text-pink-500', bg: 'bg-pink-50' }
];

const BG_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Warm Cream', value: '#FFF8F0' },
  { name: 'Light Gray', value: '#F4F4F5' },
  { name: 'Soft Blue', value: '#F0F4FF' },
  { name: 'Soft Green', value: '#F0FFF4' },
  { name: 'Soft Pink', value: '#FFF0F5' },
  { name: 'Dark Mode', value: '#18181B' }
];

export default function KnowledgeTower({ user }) {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [treeVisible, setTreeVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSaghboopResponse, setShowSaghboopResponse] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const contentEditableRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        axios.get(`${API}/tower/folders`, getAuthHeader()),
        axios.get(`${API}/tower/files`, getAuthHeader())
      ]);
      setFolders(foldersRes.data);
      setFiles(filesRes.data);
    } catch (error) {
      toast.error('Failed to load Knowledge Tower');
    }
  };

  const createFolder = async () => {
    if (!newItemName.trim()) return;
    try {
      const response = await axios.post(
        `${API}/tower/folders`,
        { name: newItemName, parent_id: newItemParent, color: 'zinc', order: folders.length },
        getAuthHeader()
      );
      setFolders([...folders, response.data]);
      setNewItemName('');
      setNewItemParent(null);
      setShowNewFolderDialog(false);
      toast.success('Folder created');
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const createFile = async () => {
    if (!newItemName.trim()) return;
    try {
      const response = await axios.post(
        `${API}/tower/files`,
        { name: newItemName, folder_id: newItemParent, content: '', color: 'zinc', bg_color: '#FFFFFF', order: files.length },
        getAuthHeader()
      );
      setFiles([...files, response.data]);
      setNewItemName('');
      setNewItemParent(null);
      setShowNewFileDialog(false);
      toast.success('File created');
    } catch (error) {
      toast.error('Failed to create file');
    }
  };

  const openFile = async (fileId) => {
    try {
      const response = await axios.get(`${API}/tower/files/${fileId}`, getAuthHeader());
      setSelectedFile(response.data);
      setEditingContent(response.data.content);
    } catch (error) {
      toast.error('Failed to open file');
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await axios.patch(
        `${API}/tower/files/${selectedFile.id}`,
        { content: editingContent },
        getAuthHeader()
      );
      setSelectedFile({ ...selectedFile, content: editingContent });
      toast.success('Saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = () => {
    const content = contentEditableRef.current?.innerHTML || '';
    setEditingContent(content);
    
    // Auto-save after 2 seconds
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveFile();
    }, 2000);
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await axios.delete(`${API}/tower/files/${fileId}`, getAuthHeader());
      setFiles(files.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const deleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder and all its contents?')) return;
    try {
      await axios.delete(`${API}/tower/folders/${folderId}`, getAuthHeader());
      setFolders(folders.filter(f => f.id !== folderId));
      setFiles(files.filter(f => f.folder_id !== folderId));
      toast.success('Folder deleted');
    } catch (error) {
      toast.error('Failed to delete folder');
    }
  };

  const searchTower = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowSaghboopResponse(true);
    try {
      const response = await axios.get(`${API}/tower/search?q=${encodeURIComponent(searchQuery)}`, getAuthHeader());
      setSearchResults(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getColorClass = (colorName) => {
    const color = COLORS.find(c => c.name === colorName);
    return color ? color.class : 'text-zinc-500';
  };

  const renderTree = (parentId = null, level = 0) => {
    const childFolders = folders.filter(f => f.parent_id === parentId);
    const childFiles = files.filter(f => f.folder_id === parentId);

    return (
      <>
        {childFolders.map(folder => (
          <div key={folder.id} style={{ marginLeft: `${level * 20}px` }}>
            <div
              data-testid={`folder-${folder.id}`}
              className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer group"
              onClick={() => toggleFolder(folder.id)}
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}
              {expandedFolders.has(folder.id) ? (
                <FolderOpen className={`w-4 h-4 ${getColorClass(folder.color)}`} />
              ) : (
                <Folder className={`w-4 h-4 ${getColorClass(folder.color)}`} />
              )}
              <span className="flex-1 font-plex text-sm font-medium text-zinc-900 truncate">{folder.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenu({ type: 'folder', item: folder });
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded"
              >
                <MoreVertical className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            {expandedFolders.has(folder.id) && renderTree(folder.id, level + 1)}
          </div>
        ))}
        {childFiles.map(file => (
          <div
            key={file.id}
            data-testid={`file-${file.id}`}
            style={{ marginLeft: `${level * 20 + 20}px` }}
            className={`flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer group ${
              selectedFile?.id === file.id ? 'bg-zinc-100' : ''
            }`}
            onClick={() => openFile(file.id)}
          >
            <FileText className={`w-4 h-4 ${getColorClass(file.color)}`} />
            <span className="flex-1 font-plex text-sm text-zinc-900 truncate">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ type: 'file', item: file });
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded"
            >
              <MoreVertical className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        ))}
      </>
    );
  };

  const isDarkMode = selectedFile?.bg_color === '#18181B';

  return (
    <div data-testid="knowledge-tower" className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* File Tree Panel */}
      <AnimatePresence>
        {treeVisible && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-[280px] border-r border-zinc-200 bg-white flex flex-col"
          >
            <div className="p-4 border-b border-zinc-200">
              <div className="flex items-center gap-2 mb-4">
                <Library className="w-5 h-5 text-zinc-900" />
                <h2 className="font-outfit text-lg font-medium text-zinc-900">Knowledge Tower</h2>
              </div>
              <div className="flex gap-2">
                <Button
                  data-testid="new-folder-button"
                  onClick={() => setShowNewFolderDialog(true)}
                  variant="outline"
                  className="flex-1 rounded-full text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Folder
                </Button>
                <Button
                  data-testid="new-file-button"
                  onClick={() => setShowNewFileDialog(true)}
                  variant="outline"
                  className="flex-1 rounded-full text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  File
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {renderTree()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toggle Button */}
        <div className="p-2 border-b border-zinc-200">
          <button
            data-testid="toggle-tree-button"
            onClick={() => setTreeVisible(!treeVisible)}
            className="p-2 hover:bg-zinc-100 rounded-lg"
          >
            <Menu className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-32">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="font-outfit text-2xl font-medium text-zinc-900 mb-2">مرحبا! أنا صغبوب</h3>
              <p className="font-plex text-base text-zinc-600 mb-8">Ask me anything about what's in the Knowledge Tower</p>
              {files.length > 0 && (
                <div className="w-full max-w-2xl">
                  <h4 className="font-plex text-sm font-semibold text-zinc-900 mb-3">Recent Files</h4>
                  <div className="grid gap-2">
                    {files.slice(0, 5).map(file => (
                      <div
                        key={file.id}
                        onClick={() => openFile(file.id)}
                        className="p-4 border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${getColorClass(file.color)}`} />
                          <span className="font-plex text-sm font-medium text-zinc-900">{file.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-8">
              {/* File Header */}
              <div className="mb-6 pb-4 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="font-outfit text-2xl font-medium text-zinc-900 mb-2">{selectedFile.name}</h2>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Created {new Date(selectedFile.created_at).toLocaleDateString()}</span>
                    <span>Modified {new Date(selectedFile.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {saving && <span className="text-xs text-zinc-500">Saving...</span>}
                  <Button
                    onClick={() => setShowBgColorPicker(true)}
                    variant="outline"
                    className="rounded-full"
                    data-testid="bg-color-button"
                  >
                    <Palette className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => deleteFile(selectedFile.id)}
                    variant="outline"
                    className="rounded-full text-red-600 hover:bg-red-50"
                    data-testid="delete-file-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setSelectedFile(null)}
                    variant="outline"
                    className="rounded-full"
                    data-testid="close-file-button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content Editor */}
              <div
                ref={contentEditableRef}
                contentEditable
                onInput={handleContentChange}
                dangerouslySetInnerHTML={{ __html: editingContent }}
                style={{ backgroundColor: selectedFile.bg_color, color: isDarkMode ? '#fff' : '#000' }}
                className="min-h-[500px] p-6 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-plex text-base leading-relaxed"
                placeholder="Paste or type your content here..."
              />
            </div>
          )}
        </div>

        {/* Saghboop Chat Input */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-white/80 backdrop-blur-sm border-t border-zinc-200">
          {showSaghboopResponse && searchResults.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-4 p-6 bg-white rounded-2xl border border-zinc-200 shadow-lg max-w-4xl mx-auto"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">📚</div>
                <div className="flex-1">
                  <h4 className="font-outfit text-lg font-medium text-zinc-900 mb-2">Saghboop Found {searchResults.length} Results</h4>
                  <div className="space-y-3">
                    {searchResults.map(result => (
                      <div
                        key={result.file_id}
                        onClick={() => openFile(result.file_id)}
                        className="p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className={`w-4 h-4 ${getColorClass(result.color)}`} />
                          <span className="font-plex text-sm font-medium text-zinc-900">{result.file_name}</span>
                        </div>
                        <p className="font-plex text-xs text-zinc-600">{result.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowSaghboopResponse(false)}
                  className="p-1 hover:bg-zinc-100 rounded"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </motion.div>
          )}
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              data-testid="saghboop-input"
              placeholder="Ask Saghboop about anything in the tower..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchTower()}
              className="flex-1 rounded-full border-zinc-200"
            />
            <Button
              data-testid="saghboop-search-button"
              onClick={searchTower}
              disabled={searching}
              className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {searching ? <Search className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            className="rounded-xl"
          />
          <Button onClick={createFolder} className="rounded-full bg-zinc-900 text-white">Create</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="File name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createFile()}
            className="rounded-xl"
          />
          <Button onClick={createFile} className="rounded-full bg-zinc-900 text-white">Create</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showBgColorPicker} onOpenChange={setShowBgColorPicker}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Background Color</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {BG_COLORS.map(color => (
              <button
                key={color.value}
                onClick={async () => {
                  try {
                    await axios.patch(`${API}/tower/files/${selectedFile.id}`, { bg_color: color.value }, getAuthHeader());
                    setSelectedFile({ ...selectedFile, bg_color: color.value });
                    setShowBgColorPicker(false);
                    toast.success('Background updated');
                  } catch (error) {
                    toast.error('Failed to update');
                  }
                }}
                style={{ backgroundColor: color.value }}
                className="h-12 rounded-lg border-2 border-zinc-200 hover:border-zinc-900 flex items-center justify-center font-plex text-xs font-medium"
              >
                <span style={{ color: color.value === '#18181B' ? '#fff' : '#000' }}>{color.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}