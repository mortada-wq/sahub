import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Layout
    navDashboard: 'Dashboard',
    navTasks: 'Tasks',
    navKnowledge: 'Knowledge',
    navKnowledgeTower: 'Knowledge Tower',
    navUpdates: 'Updates',
    teamManagement: 'Team Management',
    logout: 'Logout',

    // Auth
    tagline: 'Team management made simple',
    login: 'Login',
    register: 'Register',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    role: 'Role',
    roleMember: 'Member',
    roleManager: 'Manager',
    roleAdmin: 'Admin',
    signIn: 'Sign In',
    createAccount: 'Create Account',
    loading: 'Loading...',
    welcomeBack: 'Welcome back!',
    accountCreated: 'Account created successfully!',
    authFailed: 'Authentication failed',

    // Dashboard
    welcomeBackUser: (name) => `Welcome back, ${name}`,
    dashboardSubtitle: "Here's what's happening with your team today.",
    totalTasks: 'Total Tasks',
    myTasks: 'My Tasks',
    completed: 'Completed',
    knowledgeBase: 'Knowledge Base',
    teamMembers: 'Team Members',
    recentTasks: 'Recent Tasks',
    assignedTo: 'Assigned to',

    // Tasks
    tasks: 'Tasks',
    all: 'All',
    todo: 'Todo',
    inProgress: 'In Progress',
    completedStatus: 'Completed',
    noTasksFound: 'No tasks found. Create one below!',
    assignTo: 'Assign to...',
    lowPriority: 'Low Priority',
    mediumPriority: 'Medium Priority',
    highPriority: 'High Priority',
    assignTask: 'Assign a task...',
    descriptionOptional: 'Description (optional)',
    create: 'Create',
    comments: (n) => `Comments (${n})`,
    addComment: 'Add a comment...',
    assignedToLabel: 'Assigned to:',
    due: 'Due:',
    noDescription: 'No description',

    // Knowledge
    knowledgeBaseTitle: 'Knowledge Base',
    knowledgeSubtitle: 'Company resources and documentation',
    newArticle: 'New Article',
    noArticlesYet: 'No articles yet',
    createFirstArticle: 'Create First Article',
    createNewArticle: 'Create New Article',
    title: 'Title',
    category: 'Category',
    categoryGeneral: 'General',
    categoryOnboarding: 'Onboarding',
    categoryProcesses: 'Processes',
    categoryGuidelines: 'Guidelines',
    categoryTechnical: 'Technical',
    content: 'Content',
    articleTitlePlaceholder: 'Article title...',
    articleContentPlaceholder: 'Write your article content...',
    cancel: 'Cancel',
    createArticle: 'Create Article',
    by: 'By',

    // Updates
    companyUpdates: 'Company Updates',
    updatesSubtitle: 'Latest news and announcements',
    newUpdate: 'New Update',
    noUpdatesYet: 'No updates yet',
    postFirstUpdate: 'Post First Update',
    postNewUpdate: 'Post New Update',
    type: 'Type',
    typeAnnouncement: 'Announcement',
    typeNews: 'News',
    typeFeature: 'Feature',
    updateTitlePlaceholder: 'Update title...',
    updateContentPlaceholder: 'Write your update...',
    postUpdate: 'Post Update',
    postedBy: 'Posted by',

    // KnowledgeTower
    towerTitle: 'Knowledge Tower',
    towerFolder: 'Folder',
    towerFile: 'File',
    towerRecentFiles: 'Recent Files',
    towerCreated: (date) => `Created ${date}`,
    towerModified: (date) => `Modified ${date}`,
    towerSaving: 'Saving...',
    towerSaghboopWelcome: 'Hello! I am Saghboop',
    towerSaghboopSubtitle: "Ask me anything about what's in the Knowledge Tower",
    towerSaghboopFound: (n) => `Saghboop Found ${n} Results`,
    towerSaghboopPlaceholder: 'Ask Saghboop about anything in the tower...',
    towerCreateFolder: 'Create New Folder',
    towerCreateFile: 'Create New File',
    towerFolderName: 'Folder name',
    towerFileName: 'File name',
    towerCreate: 'Create',
    towerBgColor: 'Background Color',
    towerContentPlaceholder: 'Paste or type your content here...',
    // Tower toasts
    towerFailedLoad: 'Failed to load Knowledge Tower',
    towerFolderCreated: 'Folder created',
    towerFolderFailed: 'Failed to create folder',
    towerFileCreated: 'File created',
    towerFileFailed: 'Failed to create file',
    towerFileOpenFailed: 'Failed to open file',
    towerSaved: 'Saved',
    towerSaveFailed: 'Failed to save',
    towerFileDeleted: 'File deleted',
    towerFileDeleteFailed: 'Failed to delete file',
    towerFolderDeleted: 'Folder deleted',
    towerFolderDeleteFailed: 'Failed to delete folder',
    towerSearchFailed: 'Search failed',
    towerBgUpdated: 'Background updated',
    towerBgUpdateFailed: 'Failed to update',
    taskCreated: 'Task created successfully!',
    failedToCreateTask: 'Failed to create task',
    taskUpdated: 'Task updated!',
    failedToUpdateTask: 'Failed to update task',
    taskDeleted: 'Task deleted',
    failedToDeleteTask: 'Failed to delete task',
    commentAdded: 'Comment added',
    failedToAddComment: 'Failed to add comment',
    failedToLoadArticles: 'Failed to load articles',
    articleCreated: 'Article created successfully!',
    failedToCreateArticle: 'Failed to create article',
    articleDeleted: 'Article deleted',
    failedToDeleteArticle: 'Failed to delete article',
    failedToLoadUpdates: 'Failed to load updates',
    updatePosted: 'Update posted successfully!',
    failedToCreateUpdate: 'Failed to create update',
    updateDeleted: 'Update deleted',
    failedToDeleteUpdate: 'Failed to delete update',
  },
  ar: {
    // Layout
    navDashboard: 'لوحة التحكم',
    navTasks: 'المهام',
    navKnowledge: 'المعرفة',
    navKnowledgeTower: 'برج المعرفة',
    navUpdates: 'التحديثات',
    teamManagement: 'إدارة الفريق',
    logout: 'تسجيل الخروج',

    // Auth
    tagline: 'إدارة الفريق بشكل بسيط',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    role: 'الدور',
    roleMember: 'عضو',
    roleManager: 'مدير',
    roleAdmin: 'مسؤول',
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    loading: 'جارٍ التحميل...',
    welcomeBack: 'مرحباً بعودتك!',
    accountCreated: 'تم إنشاء الحساب بنجاح!',
    authFailed: 'فشل في المصادقة',

    // Dashboard
    welcomeBackUser: (name) => `مرحباً بعودتك، ${name}`,
    dashboardSubtitle: 'إليك ما يحدث مع فريقك اليوم.',
    totalTasks: 'إجمالي المهام',
    myTasks: 'مهامي',
    completed: 'مكتملة',
    knowledgeBase: 'قاعدة المعرفة',
    teamMembers: 'أعضاء الفريق',
    recentTasks: 'المهام الأخيرة',
    assignedTo: 'مُعيَّن إلى',

    // Tasks
    tasks: 'المهام',
    all: 'الكل',
    todo: 'قيد الانتظار',
    inProgress: 'قيد التنفيذ',
    completedStatus: 'مكتملة',
    noTasksFound: 'لا توجد مهام. أنشئ واحدة أدناه!',
    assignTo: 'عيِّن إلى...',
    lowPriority: 'أولوية منخفضة',
    mediumPriority: 'أولوية متوسطة',
    highPriority: 'أولوية عالية',
    assignTask: 'عيِّن مهمة...',
    descriptionOptional: 'الوصف (اختياري)',
    create: 'إنشاء',
    comments: (n) => `التعليقات (${n})`,
    addComment: 'أضف تعليقاً...',
    assignedToLabel: 'مُعيَّن إلى:',
    due: 'الموعد النهائي:',
    noDescription: 'لا يوجد وصف',

    // Knowledge
    knowledgeBaseTitle: 'قاعدة المعرفة',
    knowledgeSubtitle: 'موارد الشركة والتوثيق',
    newArticle: 'مقالة جديدة',
    noArticlesYet: 'لا توجد مقالات بعد',
    createFirstArticle: 'أنشئ أول مقالة',
    createNewArticle: 'إنشاء مقالة جديدة',
    title: 'العنوان',
    category: 'الفئة',
    categoryGeneral: 'عام',
    categoryOnboarding: 'الإعداد',
    categoryProcesses: 'العمليات',
    categoryGuidelines: 'الإرشادات',
    categoryTechnical: 'تقني',
    content: 'المحتوى',
    articleTitlePlaceholder: 'عنوان المقالة...',
    articleContentPlaceholder: 'اكتب محتوى المقالة...',
    cancel: 'إلغاء',
    createArticle: 'إنشاء مقالة',
    by: 'بواسطة',

    // Updates
    companyUpdates: 'تحديثات الشركة',
    updatesSubtitle: 'آخر الأخبار والإعلانات',
    newUpdate: 'تحديث جديد',
    noUpdatesYet: 'لا توجد تحديثات بعد',
    postFirstUpdate: 'انشر أول تحديث',
    postNewUpdate: 'نشر تحديث جديد',
    type: 'النوع',
    typeAnnouncement: 'إعلان',
    typeNews: 'أخبار',
    typeFeature: 'ميزة',
    updateTitlePlaceholder: 'عنوان التحديث...',
    updateContentPlaceholder: 'اكتب تحديثك...',
    postUpdate: 'نشر التحديث',
    postedBy: 'نشر بواسطة',

    // KnowledgeTower
    towerTitle: 'برج المعرفة',
    towerFolder: 'مجلد',
    towerFile: 'ملف',
    towerRecentFiles: 'الملفات الأخيرة',
    towerCreated: (date) => `أُنشئ ${date}`,
    towerModified: (date) => `عُدِّل ${date}`,
    towerSaving: 'جارٍ الحفظ...',
    towerSaghboopWelcome: 'مرحبا! أنا صغبوب',
    towerSaghboopSubtitle: 'اسألني عن أي شيء في برج المعرفة',
    towerSaghboopFound: (n) => `وجد صغبوب ${n} نتيجة`,
    towerSaghboopPlaceholder: 'اسأل صغبوب عن أي شيء في البرج...',
    towerCreateFolder: 'إنشاء مجلد جديد',
    towerCreateFile: 'إنشاء ملف جديد',
    towerFolderName: 'اسم المجلد',
    towerFileName: 'اسم الملف',
    towerCreate: 'إنشاء',
    towerBgColor: 'لون الخلفية',
    towerContentPlaceholder: 'الصق أو اكتب المحتوى هنا...',
    // Tower toasts
    towerFailedLoad: 'فشل في تحميل برج المعرفة',
    towerFolderCreated: 'تم إنشاء المجلد',
    towerFolderFailed: 'فشل في إنشاء المجلد',
    towerFileCreated: 'تم إنشاء الملف',
    towerFileFailed: 'فشل في إنشاء الملف',
    towerFileOpenFailed: 'فشل في فتح الملف',
    towerSaved: 'تم الحفظ',
    towerSaveFailed: 'فشل في الحفظ',
    towerFileDeleted: 'تم حذف الملف',
    towerFileDeleteFailed: 'فشل في حذف الملف',
    towerFolderDeleted: 'تم حذف المجلد',
    towerFolderDeleteFailed: 'فشل في حذف المجلد',
    towerSearchFailed: 'فشل في البحث',
    towerBgUpdated: 'تم تحديث الخلفية',
    towerBgUpdateFailed: 'فشل في التحديث',
    taskCreated: 'تم إنشاء المهمة بنجاح!',
    failedToCreateTask: 'فشل في إنشاء المهمة',
    taskUpdated: 'تم تحديث المهمة!',
    failedToUpdateTask: 'فشل في تحديث المهمة',
    taskDeleted: 'تم حذف المهمة',
    failedToDeleteTask: 'فشل في حذف المهمة',
    commentAdded: 'تمت إضافة التعليق',
    failedToAddComment: 'فشل في إضافة التعليق',
    failedToLoadArticles: 'فشل في تحميل المقالات',
    articleCreated: 'تم إنشاء المقالة بنجاح!',
    failedToCreateArticle: 'فشل في إنشاء المقالة',
    articleDeleted: 'تم حذف المقالة',
    failedToDeleteArticle: 'فشل في حذف المقالة',
    failedToLoadUpdates: 'فشل في تحميل التحديثات',
    updatePosted: 'تم نشر التحديث بنجاح!',
    failedToCreateUpdate: 'فشل في نشر التحديث',
    updateDeleted: 'تم حذف التحديث',
    failedToDeleteUpdate: 'فشل في حذف التحديث',
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('language', next);
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
