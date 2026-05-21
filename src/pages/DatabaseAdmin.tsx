import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore, SKILL_CATEGORIES } from '../store';
import { Trash2, UserCog, Key, Plus, Save, X, Eye, EyeOff, Shield, ShieldAlert, Pencil, GraduationCap, ChevronDown, ChevronUp, Check, XCircle, Clock, RotateCcw, Crown } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { User, SkillMetadata, RaceChangeRequest } from '../lib/api/types';

type SkillResponsibleField =
  | 'responsible_person_name_hogwarts'
  | 'responsible_person_link_hogwarts'
  | 'responsible_person_name_md'
  | 'responsible_person_link_md';

const normalizeSkillMetadata = (skillName: string, metadata?: SkillMetadata): SkillMetadata => ({
  skill_name: skillName,
  responsible_person_name: metadata?.responsible_person_name || '',
  responsible_person_link: metadata?.responsible_person_link || '',
  responsible_person_name_hogwarts: metadata?.responsible_person_name_hogwarts ?? metadata?.responsible_person_name ?? '',
  responsible_person_link_hogwarts: metadata?.responsible_person_link_hogwarts ?? metadata?.responsible_person_link ?? '',
  responsible_person_name_md: metadata?.responsible_person_name_md || '',
  responsible_person_link_md: metadata?.responsible_person_link_md || '',
  description: metadata?.description,
  updated_at: metadata?.updated_at
});

export const DatabaseAdmin: React.FC = () => {
  const { user } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Race Change Requests State
  const [raceRequests, setRaceRequests] = useState<RaceChangeRequest[]>([]);
  const [isRaceRequestsOpen, setIsRaceRequestsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Skill Metadata State
  const [skillMetadata, setSkillMetadata] = useState<Record<string, SkillMetadata>>({});
  const [isSavingSkill, setIsSavingSkill] = useState<Record<string, boolean>>({});
  const [isSkillsSectionOpen, setIsSkillsSectionOpen] = useState(false);

  const [isSchoolAdminSectionOpen, setIsSchoolAdminSectionOpen] = useState(false);
  const [isSavingSchoolAdmin, setIsSavingSchoolAdmin] = useState<Record<string, boolean>>({});
  const [isSavingVisibility, setIsSavingVisibility] = useState<Record<string, boolean>>({});
  const [isSavingMinister, setIsSavingMinister] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSkillMetadata();
    fetchRaceRequests();
  }, []);

  const fetchRaceRequests = async () => {
    try {
      const data = await api.raceRequests?.list();
      setRaceRequests(data || []);
    } catch (err) {
      console.error('Error fetching race requests:', err);
    }
  };

  const handleProcessRaceRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    
    if (status === 'rejected' && !rejectionReason[requestId]) {
      alert('Пожалуйста, укажите причину отказа');
      return;
    }

    setProcessingRequestId(requestId);
    try {
      await api.raceRequests?.process(requestId, {
        status,
        admin_id: user.id,
        rejection_reason: rejectionReason[requestId]
      });
      
      // Update local state
      setRaceRequests(prev => prev.filter(r => r.id !== requestId));
      setRejectionReason(prev => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      
      // If approved, we might want to refresh users list too
      if (status === 'approved') {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error processing race request:', err);
      alert('Ошибка при обработке заявки');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const fetchSkillMetadata = async () => {
      try {
          const data = await api.skills?.getMetadata();
          const map: Record<string, SkillMetadata> = {};
          data?.forEach(m => {
              map[m.skill_name] = normalizeSkillMetadata(m.skill_name, m);
          });
          setSkillMetadata(map);
      } catch (err) {
          console.error('Error fetching skill metadata:', err);
      }
  };

  const handleSkillMetaChange = (skillName: string, field: SkillResponsibleField, value: string) => {
      setSkillMetadata(prev => ({
          ...prev,
          [skillName]: {
              ...normalizeSkillMetadata(skillName, prev[skillName]),
              [field]: value
          }
      }));
  };

  const saveSkillMeta = async (skillName: string) => {
      const meta = skillMetadata[skillName];
      if (!meta) return;
      
      setIsSavingSkill(prev => ({ ...prev, [skillName]: true }));
      try {
          const updated = await api.skills?.updateMetadata({
              skill_name: skillName,
              responsible_person_name: meta.responsible_person_name_hogwarts || meta.responsible_person_name_md || '',
              responsible_person_link: meta.responsible_person_link_hogwarts || meta.responsible_person_link_md || '',
              responsible_person_name_hogwarts: meta.responsible_person_name_hogwarts,
              responsible_person_link_hogwarts: meta.responsible_person_link_hogwarts,
              responsible_person_name_md: meta.responsible_person_name_md,
              responsible_person_link_md: meta.responsible_person_link_md
          });
          if (updated) {
              setSkillMetadata(prev => ({
                  ...prev,
                  [skillName]: normalizeSkillMetadata(skillName, updated)
              }));
          }
      } catch (err) {
          console.error(err);
          alert('Ошибка сохранения');
      } finally {
          setIsSavingSkill(prev => ({ ...prev, [skillName]: false }));
      }
  };

  const toggleSchoolAdmin = async (targetUser: User, nextValue: boolean) => {
    setIsSavingSchoolAdmin(prev => ({ ...prev, [targetUser.id]: true }));
    try {
      await api.admin?.updateUser(targetUser.id, { is_school_admin: nextValue });
      setUsers(prev => prev.map(u => (u.id === targetUser.id ? { ...u, is_school_admin: nextValue } : u)));
    } catch (err) {
      console.error('Error updating school admin flag:', err);
      alert('Ошибка при обновлении статуса администрации школы');
    } finally {
      setIsSavingSchoolAdmin(prev => ({ ...prev, [targetUser.id]: false }));
    }
  };

  // New user form state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin' | 'moderator'>('user');

  // Permission Modal state
  const [permissionModal, setPermissionModal] = useState<{
    isOpen: boolean;
    user: User | null;
    role: 'user' | 'admin' | 'moderator';
    managedSkills: string[];
  }>({
    isOpen: false,
    user: null,
    role: 'user',
    managedSkills: []
  });

  const allSkills = React.useMemo(() => 
    Array.from(new Set(SKILL_CATEGORIES.flatMap(c => c.skills))), 
  []);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({
    isOpen: false,
    userId: null,
    userName: ''
  });
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Edit password state
  const [editingPassword, setEditingPassword] = useState<{ userId: string | null, newPassword: '' }>({ userId: null, newPassword: '' });
  const [editingName, setEditingName] = useState<{ userId: string | null, newName: string }>({ userId: null, newName: '' });

  const startEditingName = (user: User) => {
    setEditingName({
      userId: user.id,
      newName: user.name
    });
  };

  const saveName = async (userId: string) => {
    try {
      await api.admin?.updateUser(userId, { name: editingName.newName });
      setUsers(users.map(u => u.id === userId ? { ...u, name: editingName.newName } : u));
      setEditingName({ userId: null, newName: '' });
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Ошибка при обновлении имени. Возможно, такое имя уже занято.');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin?.listUsers();
      // Filter out the superuser 'Admin' so nobody can see/edit him
      setUsers((data || []).filter(u => u.name !== 'Admin'));
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Ошибка при загрузке пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteUser = (user: User) => {
    setDeleteConfirmation({
      isOpen: true,
      userId: user.id,
      userName: user.name
    });
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmation.userId || !user) return;
    
    setIsDeletingUser(true);
    try {
      await api.admin?.deleteUser(deleteConfirmation.userId, user.id, 'delete');
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmation.userId));
      setDeleteConfirmation({ isOpen: false, userId: null, userName: '' });
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка при полном удалении пользователя');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.admin?.createUser({
        name: newUserName,
        password: newUserPassword,
        role: newUserRole
      });

      if (data) {
        setUsers([data, ...users]);
        setIsAddingUser(false);
        setNewUserName('');
        setNewUserPassword('');
        setNewUserRole('user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Ошибка при добавлении пользователя. Возможно, имя уже занято.');
    }
  };

  const openPermissionModal = (user: User) => {
    setPermissionModal({
      isOpen: true,
      user,
      role: user.role,
      managedSkills: user.managed_skills || []
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionModal.user) return;
    const managedSkills = permissionModal.role === 'moderator' ? permissionModal.managedSkills : [];
    try {
      await api.admin?.updateUser(permissionModal.user.id, {
        role: permissionModal.role,
        managed_skills: managedSkills
      });
      setUsers(users.map(u => u.id === permissionModal.user!.id ? {
        ...u,
        role: permissionModal.role,
        managed_skills: managedSkills
      } : u));
      setPermissionModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Ошибка при обновлении прав');
    }
  };

  const toggleSkillPermission = (skill: string) => {
    setPermissionModal(prev => {
        const skills = prev.managedSkills.includes(skill)
            ? prev.managedSkills.filter(s => s !== skill)
            : [...prev.managedSkills, skill];
        return { ...prev, managedSkills: skills };
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const startEditingPassword = (user: User) => {
    setEditingPassword({
        userId: user.id,
        newPassword: '' // Start empty or with current password if preferred, empty is safer visually
    });
    // If we want to pre-fill, we can do: newPassword: user.password
    // But usually "change password" starts blank. Let's start with current value to make small edits easier? 
    // Actually, let's pre-fill it so they can see what they are editing.
    setEditingPassword({
        userId: user.id,
        newPassword: user.password as any // Type assertion to avoid string vs constant type issues if any
    });
  };

  const savePassword = async (userId: string) => {
      try {
          await api.admin?.updateUser(userId, { password: editingPassword.newPassword });
          setUsers(users.map(u => u.id === userId ? { ...u, password: editingPassword.newPassword as string } : u));
          setEditingPassword({ userId: null, newPassword: '' });
      } catch (error) {
          console.error('Error updating password:', error);
          alert('Ошибка при обновлении пароля');
      }
  };

  const cancelEditPassword = () => {
      setEditingPassword({ userId: null, newPassword: '' });
  };

  const setUserVisibility = async (targetUser: User, nextValue: boolean) => {
    setIsSavingVisibility(prev => ({ ...prev, [targetUser.id]: true }));
    try {
      await api.admin?.updateUser(targetUser.id, { is_visible: nextValue });
      setUsers(prev => prev.map(u => (
        u.id === targetUser.id ? { ...u, is_visible: nextValue } : u
      )));
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert(nextValue ? 'Ошибка при возврате пользователя в список' : 'Ошибка при скрытии пользователя');
    } finally {
      setIsSavingVisibility(prev => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const toggleMinister = async (targetUser: User, nextValue: boolean) => {
    setIsSavingMinister(prev => ({ ...prev, [targetUser.id]: true }));
    try {
      await api.admin?.updateUser(targetUser.id, { is_minister: nextValue });
      setUsers(prev => prev.map(u => (
        u.id === targetUser.id ? { ...u, is_minister: nextValue } : u
      )));
    } catch (error) {
      console.error('Error updating minister flag:', error);
      alert(nextValue ? 'Ошибка при выдаче ранга министра' : 'Ошибка при снятии ранга министра');
    } finally {
      setIsSavingMinister(prev => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const getRoleBadgeClass = (role: User['role']) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-800';
    if (role === 'moderator') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getRoleLabel = (role: User['role']) => {
    if (role === 'admin') return 'Администратор';
    if (role === 'moderator') return 'Участник, Экзаменатор';
    return 'Участник';
  };

  // Only allow admin access
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 md:gap-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <UserCog className="w-6 h-6 md:w-8 md:h-8" />
            Управление БД
          </h1>
          <button
            onClick={() => setIsAddingUser(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Добавить пользователя
          </button>
        </header>

        {/* Race Change Requests Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <button 
                onClick={() => setIsRaceRequestsOpen(!isRaceRequestsOpen)}
                className="w-full flex items-center justify-between text-left group"
            >
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 group-hover:text-hogwarts-gold transition-colors">
                      <Clock className="w-6 h-6" />
                      Заявки на смену расы
                  </h2>
                  {raceRequests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      {raceRequests.length}
                    </span>
                  )}
                </div>
                {isRaceRequestsOpen ? (
                    <ChevronUp className="w-6 h-6 text-gray-500 group-hover:text-hogwarts-gold transition-colors" />
                ) : (
                    <ChevronDown className="w-6 h-6 text-gray-500 group-hover:text-hogwarts-gold transition-colors" />
                )}
            </button>
            
            {isRaceRequestsOpen && (
                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {raceRequests.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 font-century italic">
                        Нет активных заявок на рассмотрении
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {raceRequests.map(request => (
                          <div key={request.id} className="border-2 border-hogwarts-bronze/20 rounded-lg p-4 bg-hogwarts-white/50 hover:bg-white transition-colors">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                              <div>
                                <h3 className="font-bold text-lg text-hogwarts-ink flex items-center gap-2">
                                  <span className="text-hogwarts-gold">{request.user_name}</span>
                                  <span className="text-sm font-normal text-gray-500">подал заявку на</span>
                                  <span className="text-hogwarts-blue">"{request.requested_race}"</span>
                                </h3>
                                <p className="text-xs text-gray-400 font-century">
                                  {new Date(request.created_at).toLocaleString('ru-RU')}
                                </p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                <button
                                  onClick={() => handleProcessRaceRequest(request.id, 'approved')}
                                  disabled={!!processingRequestId}
                                  className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                                >
                                  <Check className="w-4 h-4" />
                                  Одобрить
                                </button>
                                <button
                                  onClick={() => handleProcessRaceRequest(request.id, 'rejected')}
                                  disabled={!!processingRequestId}
                                  className="flex-1 md:flex-none bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Отказать
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Причина</span>
                                <p className="text-sm text-gray-700 font-century">{request.reason}</p>
                              </div>
                              <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Обоснование (лор)</span>
                                <p className="text-sm text-gray-700 font-century">{request.explanation}</p>
                              </div>
                            </div>

                            <div className="mt-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Комментарий при отказе (обязательно для отказа)</label>
                              <input
                                type="text"
                                value={rejectionReason[request.id] || ''}
                                onChange={(e) => setRejectionReason(prev => ({ ...prev, [request.id]: e.target.value }))}
                                placeholder="Например: Недостаточное обоснование роли в истории"
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hogwarts-red outline-none transition-all"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
            )}
        </div>

        {/* Skills Management Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <button 
                onClick={() => setIsSkillsSectionOpen(!isSkillsSectionOpen)}
                className="w-full flex items-center justify-between text-left group"
            >
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 group-hover:text-hogwarts-gold transition-colors">
                    <GraduationCap className="w-6 h-6" />
                    Ответственные за навыки
                </h2>
                {isSkillsSectionOpen ? (
                    <ChevronUp className="w-6 h-6 text-gray-500 group-hover:text-hogwarts-gold transition-colors" />
                ) : (
                    <ChevronDown className="w-6 h-6 text-gray-500 group-hover:text-hogwarts-gold transition-colors" />
                )}
            </button>
            
            {isSkillsSectionOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in fade-in slide-in-from-top-2">
                    {allSkills.map(skill => (
                        <div key={skill} className="border p-4 rounded-lg bg-gray-50 hover:shadow-sm transition-shadow">
                            <h3 className="font-bold text-gray-700 mb-3 border-b pb-2 font-serif">{skill}</h3>
                            <div className="space-y-3">
                                <div className="rounded-lg border border-hogwarts-gold/20 bg-white p-3 space-y-3">
                                    <div className="text-xs font-bold text-hogwarts-blue uppercase tracking-wide">Хогвартс</div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Имя ответственного</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                value={skillMetadata[skill]?.responsible_person_name_hogwarts || ''}
                                                onChange={(e) => handleSkillMetaChange(skill, 'responsible_person_name_hogwarts', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hogwarts-gold focus:border-transparent outline-none transition-all pr-8"
                                                placeholder="Например: Луна Лавгуд"
                                            />
                                            {skillMetadata[skill]?.responsible_person_name_hogwarts && (
                                                <button
                                                    onClick={() => handleSkillMetaChange(skill, 'responsible_person_name_hogwarts', '')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Очистить"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Ссылка ВК</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                value={skillMetadata[skill]?.responsible_person_link_hogwarts || ''}
                                                onChange={(e) => handleSkillMetaChange(skill, 'responsible_person_link_hogwarts', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hogwarts-gold focus:border-transparent outline-none transition-all pr-8"
                                                placeholder="https://vk.com/..."
                                            />
                                            {skillMetadata[skill]?.responsible_person_link_hogwarts && (
                                                <button
                                                    onClick={() => handleSkillMetaChange(skill, 'responsible_person_link_hogwarts', '')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Очистить"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-hogwarts-gold/20 bg-white p-3 space-y-3">
                                    <div className="text-xs font-bold text-hogwarts-red uppercase tracking-wide">МД</div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Имя ответственного</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                value={skillMetadata[skill]?.responsible_person_name_md || ''}
                                                onChange={(e) => handleSkillMetaChange(skill, 'responsible_person_name_md', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hogwarts-gold focus:border-transparent outline-none transition-all pr-8"
                                                placeholder="Например: Кингсли Бруствер"
                                            />
                                            {skillMetadata[skill]?.responsible_person_name_md && (
                                                <button
                                                    onClick={() => handleSkillMetaChange(skill, 'responsible_person_name_md', '')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Очистить"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Ссылка ВК</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                value={skillMetadata[skill]?.responsible_person_link_md || ''}
                                                onChange={(e) => handleSkillMetaChange(skill, 'responsible_person_link_md', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-hogwarts-gold focus:border-transparent outline-none transition-all pr-8"
                                                placeholder="https://vk.com/..."
                                            />
                                            {skillMetadata[skill]?.responsible_person_link_md && (
                                                <button
                                                    onClick={() => handleSkillMetaChange(skill, 'responsible_person_link_md', '')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Очистить"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => saveSkillMeta(skill)}
                                    disabled={isSavingSkill[skill]}
                                    className="w-full mt-2 bg-hogwarts-gold text-white text-sm py-2 rounded-md hover:bg-hogwarts-gold/90 transition-colors flex justify-center items-center gap-2 font-bold shadow-sm disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingSkill[skill] ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <button 
                onClick={() => setIsSchoolAdminSectionOpen(!isSchoolAdminSectionOpen)}
                className="w-full flex items-center justify-between text-left group"
            >
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 group-hover:text-hogwarts-gold transition-colors">
                    Администрация школы
                </h2>
                {isSchoolAdminSectionOpen ? (
                    <ChevronUp className="w-6 h-6 text-gray-500 group-hover:text-hogwarts-gold transition-colors" />
                ) : (
                    <ChevronDown className="w-6 h-6 text-gray-500 group-hover:text-hogwarts-gold transition-colors" />
                )}
            </button>

            {isSchoolAdminSectionOpen && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {[...users]
                          .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                          .map((u) => (
                            <label
                              key={u.id}
                              className="flex items-center gap-2 px-3 py-2 rounded border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                              title={u.name}
                            >
                              <input
                                type="checkbox"
                                checked={!!u.is_school_admin}
                                disabled={!!isSavingSchoolAdmin[u.id]}
                                onChange={(e) => toggleSchoolAdmin(u, e.target.checked)}
                                className="rounded border-gray-300 text-hogwarts-gold focus:ring-hogwarts-gold"
                              />
                              <span className="text-sm text-gray-800 truncate">{u.name}</span>
                            </label>
                          ))}
                    </div>
                </div>
            )}
        </div>

        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Удаление пользователя</h3>
              <p className="text-gray-600 mb-6">
                Вы уверены, что хотите полностью удалить волшебника <strong className="text-hogwarts-gold">{deleteConfirmation.userName}</strong> из базы?
                Это действие необратимо.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
                  disabled={isDeletingUser}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingUser ? 'Удаление...' : 'Удалить навсегда'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddingUser && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Новый волшебник</h2>
              <button onClick={() => setIsAddingUser(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin' | 'moderator')}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="user">Участник</option>
                  <option value="moderator">Экзаменатор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Сохранить
              </button>
            </form>
          </div>
        )}

        {permissionModal.isOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Права доступа: <span className="text-hogwarts-gold">{permissionModal.user?.name}</span></h3>
                        <button onClick={() => setPermissionModal(prev => ({ ...prev, isOpen: false }))}>
                            <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="user" 
                                        checked={permissionModal.role === 'user'}
                                        onChange={() => setPermissionModal(prev => ({ ...prev, role: 'user' }))}
                                    />
                                    <span>Участник</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="moderator" 
                                        checked={permissionModal.role === 'moderator'}
                                        onChange={() => setPermissionModal(prev => ({ ...prev, role: 'moderator' }))}
                                    />
                                    <span>Экзаменатор</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        value="admin" 
                                        checked={permissionModal.role === 'admin'}
                                        onChange={() => setPermissionModal(prev => ({ ...prev, role: 'admin' }))}
                                    />
                                    <span>Администратор</span>
                                </label>
                            </div>
                        </div>

                        {permissionModal.role === 'moderator' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Разрешенные навыки</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border p-4 rounded-md bg-gray-50">
                                    {allSkills.map(skill => (
                                        <label key={skill} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={permissionModal.managedSkills.includes(skill)}
                                                onChange={() => toggleSkillPermission(skill)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm">{skill}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Выберите навыки, которые этот пользователь может администрировать.</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => setPermissionModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Сохранить права
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Видимость</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пароль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата регистрации</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Загрузка...</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${u.is_visible === false ? 'bg-gray-50/80' : ''}`}>
                  <td className="p-4 text-hogwarts-ink font-serif font-bold">
                    {editingName.userId === u.id ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editingName.newName}
                                onChange={(e) => setEditingName({ ...editingName, newName: e.target.value })}
                                className="border border-hogwarts-gold rounded px-2 py-1 text-sm w-32 focus:outline-none focus:border-hogwarts-red font-serif"
                            />
                            <button
                                onClick={() => saveName(u.id)}
                                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                                title="Сохранить"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setEditingName({ userId: null, newName: '' })}
                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                title="Отмена"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-4 group w-full max-w-xs">
                            <span className="truncate text-hogwarts-gold" title={u.name}>{u.name}</span>
                            <button
                                onClick={() => startEditingName(u)}
                                className="p-1 text-hogwarts-gold hover:text-hogwarts-red transition-colors shrink-0"
                                title="Редактировать имя"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                    {u.is_minister && (
                        <div className="mt-1">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                            Министр
                          </span>
                        </div>
                    )}
                    {u.role === 'moderator' && u.managed_skills && u.managed_skills.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={u.managed_skills.join(', ')}>
                            {u.managed_skills.length} навыков
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      u.is_visible === false ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.is_visible === false ? 'Скрыт' : 'Виден'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingPassword.userId === u.id ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={editingPassword.newPassword}
                                onChange={(e) => setEditingPassword({ ...editingPassword, newPassword: e.target.value as any })}
                                className="border rounded px-2 py-1 text-sm w-32"
                            />
                            <button onClick={() => savePassword(u.id)} className="text-green-600 hover:text-green-800">
                                <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditPassword} className="text-red-600 hover:text-red-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {showPasswords[u.id] ? u.password : '••••••••'}
                        </code>
                        <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title={showPasswords[u.id] ? "Скрыть пароль" : "Показать пароль"}
                        >
                            {showPasswords[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => startEditingPassword(u)}
                            className="text-blue-400 hover:text-blue-600 ml-2"
                            title="Изменить пароль"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openPermissionModal(u)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Управление правами"
                      >
                        {u.role === 'admin' ? <ShieldAlert className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => toggleMinister(u, !u.is_minister)}
                        disabled={!!isSavingMinister[u.id]}
                        className={`${u.is_minister ? 'text-amber-600 hover:text-amber-900' : 'text-gray-400 hover:text-amber-700'} disabled:opacity-50`}
                        title={u.is_minister ? 'Снять ранг министра' : 'Выдать ранг министра'}
                      >
                        <Crown className="w-5 h-5" />
                      </button>
                      {u.is_visible === false && (
                        <button
                          onClick={() => setUserVisibility(u, true)}
                          disabled={!!isSavingVisibility[u.id]}
                          className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50"
                          title="Вернуть в список"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDeleteUser(u)}
                        disabled={isDeletingUser}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Удалить из базы"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};
