import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getAPIKey, getAPIBaseURL } from '../../API/API_pexels';
import supabase from '../../supabase';
import { useAuth } from '../../components/AuthContext';

const ImageDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [imageDetails, setImageDetails] = useState(null);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [comments, setComments] = useState([]); 
  const [newComment, setNewComment] = useState(''); 
  const [editedComments, setEditedComments] = useState({});
  const [isLiked, setIsLiked] = useState(false);
  const { user_session } = useAuth();

  //Gestion des images 

  const addImageToDatabase = async (apiImageId, imageUrl) => {
    try {
      const { data: selectData, error: selectError } = await supabase
        .from('images')
        .select('*')
        .eq('api_image_id', apiImageId)
        .single();
  
      if (!selectData) {
        console.log('ID non trouvé. Ajout d\'une nouvelle entrée dans la table.');
        const { error: insertError } = await supabase
          .from('images')
          .insert([{ api_image_id: apiImageId, views: 1, url: imageUrl}]);
  
        if (insertError) { 
          console.error('Erreur lors de l’insertion de la nouvelle image :', insertError);
        } else {
          console.log('Nouvelle entrée ajoutée avec succès !');
        }
      } else {
        console.log('ID déjà existant dans la table.');
        const { error: updateError } = await supabase
          .from('images')
          .update({ views: selectData.views + 1 })
          .eq('api_image_id', apiImageId);
  
        if (updateError) {
          console.error('Erreur lors de la mise à jour des vues de l’image :', updateError);
        } else {
          console.log('Vues mises à jour avec succès !');
        }
      }
    } catch (error) {
      console.error('Erreur dans addImageToDatabase :', error);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      if (router.isReady && id) {
        try {
          const apiKey = getAPIKey();
          const baseUrl = getAPIBaseURL();
          const url = `${baseUrl}/photos/${id}`;
  
          const response = await axios.get(url, {
            headers: { Authorization: apiKey },
          });
  
          setImageDetails(response.data);
  
          console.log('test', response.data.src.original);
  
          addImageToDatabase(id, response.data.src.original);
        } catch (error) {
          console.error('Fetching image details failed:', error);
        }
      }
    };
  
    fetchData();
  }, [id, router.isReady]);
  
  

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await supabase
          .from('commentaire')
          .select('*')
          .eq('api_image_id', id);

        setComments(response.data);
      } catch (error) {
        console.error('Error fetching comments:', error.message);
      }
    };

    if (id) {
      fetchComments();
    }
  }, [id]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isImageFullscreen && e.target.tagName !== 'IMG') {
        setIsImageFullscreen(false);
      }
    };
  
    const handleEscapeKey = (e) => {
      if (isImageFullscreen && e.key === 'Escape') {
        setIsImageFullscreen(false);
      }
    };
  
    if (isImageFullscreen) {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }
  
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isImageFullscreen]);
  
  

  //Gestion du Download 

  const handleDownload = async (url, filename) => {
    try {
        const response = await axios.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const defaultFilename = filename || `image_${new Date().toISOString()}.png`;
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', defaultFilename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Error during image download:', error);
    }
};

  if (!imageDetails) {
    return <div>Loading...</div>;
  }

  const toggleLikeDislike = async () => {
    try {
      const IDimages = imageDetails.src.original; 

      if (!user_session) {
        console.error('Utilisateur non connecté');
        console.log(user_session);
        router.push('/../account/login');
        return;
      }

      setIsLiked((prevIsLiked) => !prevIsLiked);

      if (isLiked) {
        const { data, error } = await supabase
          .from('favoris')
          .delete()
          .eq('id_user', user_session.id)
          .eq('url_images', IDimages);

        if (error) {
          throw error;
        }

        console.log('Image n\'est plus aimée!', data);
      } else {
        const { data: existingFavorites, error } = await supabase
          .from('favoris')
          .select('*')
          .eq('id_user', user_session.id)
          .eq('url_images', IDimages);

        if (error) {
          throw error;
        }

        if (existingFavorites.length === 0) {
          const { data, error } = await supabase
            .from('favoris')
            .insert([
              { like_boolean: true, id_user: userIdCookie, url_images: IDimages, api_image_id: id },
            ]);

          if (error) {
            throw error;
          }

          console.log('Image aimée!', data);
        } else {
          console.log('Cette combinaison userIdCookie et IDimages existe déjà dans la table favoris.');
        }
      }
    } catch (error) {
      console.error('Erreur lors du basculement like/dislike:', error.message);
    }
  };


  //Gestion des commentaires

  const ajouter_commentaire = async (comment) => {
    try {
      const userIdCookie = Cookies.get('userId');
      const usernameCookie = Cookies.get('username');
      const IDimages = imageDetails.src.original;
  
      if (!userIdCookie) {
        console.error('User not logged in');
        router.push('/../login');
        return;
      }
  
      const { data, error } = await supabase
        .from('commentaire')
        .insert([
          { commentaire: comment, id_user: userIdCookie, url_image: IDimages, api_image_id: id, username: usernameCookie, signaler : false },
        ]);
  
      if (error) {
        throw error;
      }
  
      console.log('Comment added successfully:', data);
      window.location.reload();
    } catch (error) {
      console.error('Error adding comment:', error.message);
    }
  };

  const editer_commentaire = async (commentId, newComment) => {
    const userIdCookie = Cookies.get('userId');
    
    try {
        const { data: commentData, error: commentError } = await supabase
            .from('commentaire')
            .select()
            .eq('id', commentId)
            .single();

        if (commentError) {
            throw commentError;
        }

        const comment = commentData;

        if (userIdCookie === comment.id_user) {
            const { data, error } = await supabase
                .from('commentaire')
                .update({ commentaire: newComment })
                .eq('id', commentId);

            if (error) {
                throw error;
            }

            console.log('Comment edited successfully:', data);
            window.location.reload();
        } else {
            console.error('User does not have permission to edit this comment');
        }
    } catch (error) {
        console.error('Error editing comment:', error.message);
    }
};


  const handleEditComment = (commentId) => {
      setEditedComments((prev) => ({
          ...prev,
          [commentId]: true,
      }));
  };

  const handleCommentChange = (commentId, newText) => {
      setEditedComments((prev) => ({
          ...prev,
          [commentId]: true,
      }));
      setComments((prevComments) =>
          prevComments.map((comment) =>
              comment.id === commentId ? { ...comment, newComment: newText } : comment
          )
      );
  };

  const handleSaveEdit = async (commentId) => {
      const editedComment = comments.find((comment) => comment.id === commentId);

      if (editedComment.newComment) {
          await editer_commentaire(commentId, editedComment.newComment);
      }

      setEditedComments((prev) => ({
          ...prev,
          [commentId]: false,
      }));
  };
  
  const handleDeleteComment = async (commentId) => {
    const userIdCookie = Cookies.get('userId');
    try {
        if (!userIdCookie) {
            console.error('User not logged in');
            return;
        }

        const { data: commentData, error: commentError } = await supabase
            .from('commentaire')
            .select()
            .eq('id', commentId)
            .single();

        if (commentError) {
            throw commentError;
        }

        const comment = commentData;

        if (userIdCookie === comment.id_user) {
            const { data, error } = await supabase
                .from('commentaire')
                .delete()
                .eq('id', commentId)
                .eq('id_user', userIdCookie);

            if (error) {
                throw error;
            }

            setEditingCommentId(commentId);
            setIsEditingComment(true);
            console.log('Comment deleted successfully:', data);
        } else {
            console.error('User does not have permission to delete this comment');
        }
    } catch (error) {
        console.error('Error deleting comment:', error.message);
    }
};


  const signalerCommentaire = async (commentaireId) => {
    try {
      const { data, error } = await supabase
        .from('commentaire')
        .update({ signaler: true })
        .eq('id', commentaireId);
  
      if (error) {
        throw error;
      }
  
      console.log('Commentaire signalé avec succès:', data);
        } catch (error) {
      console.error('Erreur lors du signalement du commentaire:', error.message);
    }
  };
  




  return (
    <div className="body">
      <div className="relative">
        <p className="dark:text-white text-center my-5">
          <strong>Image Name:</strong> {imageDetails.alt}
        </p>
        <div className="flex justify-end space-x-2 my-5">
          <button
            onClick={toggleLikeDislike}
            className={`bg-${isLiked ? 'gray' : 'gray'}-800 text-white px-4 py-2 rounded-md ml-2`}
          >
            {isLiked ? (
              <img src="/images/heart.svg" alt="Dislike" className="w-8 h-8" />
            ) : (
              <img src="/images/hearth.svg" alt="Like" className="w-8 h-8" />
            )}
          </button>
          <button onClick={() => handleDownload(imageDetails.src.original, `${imageDetails.alt}.jpeg`)}
          className="bg-gray-800 text-white px-4 py-2 rounded-md ml-2"> Download Image </button>
        </div>
      </div>


      <div onClick={() => setIsImageFullscreen(!isImageFullscreen)} className="cursor-pointer">
        <img
          src={imageDetails.src.original}
          alt={imageDetails.alt}
          className="image-preview w-auto h-auto object-cover mx-auto max-h-screen mb-4 cursor-pointer border-4 border-custom1"/>
      </div>
      <div className="dark:text-white space-y-2 text-center">
        <p>Photographer: {imageDetails.photographer}</p>
        <p>
          Photographer URL:{' '}
          <a href={imageDetails.photographer_url} target="_blank" rel="noreferrer">
            {imageDetails.photographer_url}
          </a>
        </p>
        <p>
          Image URL:{' '}
          <a href={imageDetails.url} target="_blank" rel="noreferrer">
            {imageDetails.url}
          </a>
        </p>
        <p>
          Dimensions: {imageDetails.width} x {imageDetails.height}
        </p>
      </div>

      
      <div className="p-4">
        <textarea
          id="commentaireInput"
          className="w-full border p-2 mb-2"
          placeholder="Ajouter un commentaire..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}> </textarea>
        <button
          onClick={() => ajouter_commentaire(newComment)}
          id="ajouterCommentaireBtn"
          className="bg-gray-800 text-white p-2 rounded hover:bg-blue-600">
          Ajouter Commentaire
        </button>
      </div>

    <div className="comments-container  p-6 rounded-md shadow-md">
    <h2 className="text-3xl  mb-6 text-gray-800">Commentaires:</h2>
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
                                className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none"
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
                        className="bg-gray-800 text-white hover:underline focus:outline-none"
                    >
                        Supprimer
                    </button>
                    <button
                        onClick={() => signalerCommentaire(comment.id)}
                        className="bg-gray-800 text-white hover:underline focus:outline-none"
                    >
                        Signaler
                    </button>
                    <button
                        onClick={() => handleEditComment(comment.id)}
                        className="bg-gray-800 text-white hover:underline focus:outline-none"
                    >
                        Modifier
                    </button>
                </div>
            </li>
        ))}
    </ul>
</div>




      {isImageFullscreen && (
        <div
          className="fixed top-0 left-0 h-screen w-screen bg-black bg-opacity-75 flex justify-center items-center"
          onClick={() => setIsImageFullscreen(false)}>
          <div className="relative">
            <img src={imageDetails.src.original} alt={imageDetails.alt} className="fullscreen-image h-screen mx-auto" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsImageFullscreen(false);}}
              className="close-button absolute top-4 right-4 text-white text-3xl focus:outline-none"
            >×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDetail;
