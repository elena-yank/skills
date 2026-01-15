import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Trash2, UserCog, Key, Plus, Save, X, Eye, EyeOff, Shield, ShieldAlert, Pencil } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface WizardUser {
  id: string;
  name: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
}

export const DatabaseAdmin: React.FC = () => {
  const { user } = useStore();
  const [users, setUsers] = useState<WizardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // New user form state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({
    isOpen: false,
    userId: null,
    userName: ''
  });

  // Edit password state
  const [editingPassword, setEditingPassword] = useState<{ userId: string | null; newPassword: '' }>({
    userId: null,
    newPassword: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wizards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Ошибка при загрузке пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteUser = (user: WizardUser) => {
    setDeleteConfirmation({
      isOpen: true,
      userId: user.id,
      userName: user.name
    });
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmation.userId) return;
    
    try {
      const { error } = await supabase
        .from('wizards')
        .delete()
        .eq('id', deleteConfirmation.userId);

      if (error) throw error;
      setUsers(users.filter(u => u.id !== deleteConfirmation.userId));
      setDeleteConfirmation({ isOpen: false, userId: null, userName: '' });
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка при удалении пользователя');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('wizards')
        .insert({
          name: newUserName,
          password: newUserPassword,
          role: newUserRole
        })
        .select()
        .single();

      if (error) throw error;

      setUsers([data, ...users]);
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole('user');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Ошибка при добавлении пользователя. Возможно, имя уже занято.');
    }
  };

  const toggleRole = async (user: WizardUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Изменить роль ${user.name} на ${newRole}?`)) return;

    try {
      const { error } = await supabase
        .from('wizards')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Ошибка при изменении роли');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const startEditingPassword = (user: WizardUser) => {
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
          const { error } = await supabase
            .from('wizards')
            .update({ password: editingPassword.newPassword })
            .eq('id', userId);

          if (error) throw error;

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

  // Only allow admin access
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <UserCog className="w-8 h-8" />
            Управление базой данных волшебников
          </h1>
          <button
            onClick={() => setIsAddingUser(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить пользователя
          </button>
        </header>

        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Удаление пользователя</h3>
              <p className="text-gray-600 mb-6">
                Вы уверены, что хотите удалить волшебника <strong>{deleteConfirmation.userName}</strong>? 
                Это действие необратимо и приведет к удалению всех связанных данных.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
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
                  onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="user">Участник</option>
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

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пароль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата регистрации</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Загрузка...</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {u.role === 'admin' ? 'Администратор' : 'Участник'}
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
                        onClick={() => toggleRole(u)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Сменить роль"
                      >
                        {u.role === 'admin' ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => confirmDeleteUser(u)}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить"
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
  );
};
