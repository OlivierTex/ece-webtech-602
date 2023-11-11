import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('user');
  const [editedComments, setEditedComments] = useState({}); // Added state for editedComments
  const [isEditingComment, setIsEditingComment] = useState(false); // Added state for isEditingComment

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
  };

  const deleteUser = async (userId) => {
    const { data, error } = await supabase.from('users').delete().match({ id: userId });

    if (error) {
      console.error('Error deleting user:', error);
    } else {
      setUsers(users.filter((user) => user.id !== userId));
      console.log('User deleted successfully:', data);
    }
  };

  const filteredUsers = users.filter((user) => filter === 'all' || user.type_compte === filter);

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      const passwordHash = password;

      const { data, error } = await supabase.from('users').insert([
        { email: email, username: username, password_hash: passwordHash, type_compte: accountType },
      ]);

      if (error) {
        throw error;
      }

      console.log('Inscription réussie:', data);
      router.push('/dashboard/users');
    } catch (error) {
      console.error("Une erreur s'est produite lors de l'inscription:", error.message);
    }
  };

  const deconnecterUtilisateur = () => {
    Cookies.remove('mon_cookie_auth');
    router.push('/login');
  };

  const retirerSignalement = async (commentId) => {
    try {
      const { data, error } = await supabase
        .from('commentaire')
        .update({ signaler: false })
        .eq('id', commentId);

      if (error) {
        throw error;
      }

      console.log('Signalement retiré avec succès:', data);
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors du retrait du signalement:', error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const userIdCookie = Cookies.get('userId');
      if (!userIdCookie) {
        console.error('User not logged in');
        return;
      }

      const { data, error } = await supabase
        .from('commentaire')
        .delete()
        .eq('id', commentId)
        .eq('id_user', userIdCookie);

      window.location.reload();

      if (error) {
        throw error;
      }
      // setEditingCommentId(commentId); // Commented out as setEditingCommentId is not defined
      setIsEditingComment(true);
    } catch (error) {
      console.error('Error deleting comment:', error.message);
    }
  };

  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('commentaire')
        .select('*')
        .filter('signaler', 'eq', true);

      if (error) {
        console.error('Error fetching comments:', error);
      } else {
        setComments(data);
      }
    } catch (error) {
      console.error('An error occurred while fetching comments:', error.message);
    }
  };

  
  return (
  <div className={`bg-light dark:bg-dark p-8`}>
    <div className="content-center mb-4">
      <h1 className="text-3xl text-center font-bold ">Compte Admin</h1>
      <button onClick={deconnecterUtilisateur} className="bg-gray-800 text-white px-4 py-2 rounded-mdt">
        Se déconnecter
      </button>
    </div>

  <div className="mb-4">
    <h2 className="h2">Ajout utilisateur</h2>
    <div className="mt-4 overflow-hidden sm:rounded-lg">
      <form onSubmit={handleSignUp} className="flex flex-col space-y-4">
        <select
          onChange={(e) => setAccountType(e.target.value)}
          value={accountType}
          className="px-4 py-2 border rounded"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom d'utilisateur"
          type="text"
          className="px-4 py-2 border rounded"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="px-4 py-2 border rounded"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          type="password"
          className="px-4 py-2 border rounded"
        />
        <button
          onClick={() => {
            if (window.confirm('Êtes-vous sûr de vouloir ajouter cet utilisateur ?'))
              deleteUser(user.id);
          }}
          type="submit"
          className="text-white bg-blue-600 hover:bg-blue-900 px-4 py-2 rounded"
        >
          Ajouter utilisateur
        </button>
      </form>
    </div>
  </div>

  <div className="mb-4">
    <h2 className="h2">Gestion utilisateur</h2>
    <select onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border rounded">
      <option value="all">Tous</option>
      <option value="admin">Admin</option>
      <option value="user">User</option>
    </select>
    <div className="mt-4 overflow-hidden shadow-md rounded">
      <table className="min-w-full divide-y divide-gray-200">
        {filteredUsers.map((user) => (
          <tr key={user.id} className="bg-white">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {user.type_compte}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {user.username}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {user.email}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                onClick={() => {
                  if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?'))
                    deleteUser(user.id);
                }}
                className="text-red-600 hover:text-red-900"
              >
                Supprimer
              </button>
            </td>
          </tr>
        ))}
      </table>
    </div>
  </div>

  <div>
  <h2 className="h2">Commentaires Signaler</h2>
    <ul className="space-y-6">
        {comments.map((comment) => (
            <li key={comment.id} className="border p-6 rounded-md bg-white shadow-md">
                <p className="text-xl font-semibold mb-2 text-blue-600">{comment.username}</p>
                {editedComments[comment.id] ? (
                    <div className="mb-4">
                        <textarea
                            value={comment.newComment || ''}
                            onChange={(e) => handleCommentChange(comment.id, e.target.value)}
                            className="w-full p-2 border rounded-md"
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button
                                onClick={() => handleSaveEdit(comment.id)}
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700">{comment.commentaire}</p>
                )}
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 hover:underline focus:outline-none"
                    >
                        Supprimer
                    </button>
                    <button
                        onClick={() => retirerSignalement(comment.id)}
                        className="text-green-500 hover:underline focus:outline-none"
                    >
                        Signaler
                    </button>
                </div>
            </li>
        ))}
    </ul>
  </div>
</div>

  );
}

