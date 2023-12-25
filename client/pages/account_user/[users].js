import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import supabase from "../../supabase";

function Users() {
  const router = useRouter();
  const { users: username } = router.query;
  const [albumData, setAlbumData] = useState([]);
  const [userInfo, setUserInfo] = useState({ username: "", bio: "" });

  useEffect(() => {
    console.log("router.query:", router.query);
    const fetchData = async () => {
      try {
        if (!username) {
          console.error("Aucun nom d'utilisateur fourni.");
          return;
        }

        console.log("Fetching user data for username:", username);

        const { data: userData, error: userError } = await supabase
          .from("user")
          .select("username, bio")
          .eq("username", username);

        if (userError) {
          throw new Error(
            "Erreur lors de la récupération des données utilisateur",
          );
        }

        if (!userData || userData.length === 0) {
          console.error("Aucune donnée utilisateur trouvée pour", username);
          return;
        }

        const { data: albumsData, error: albumError } = await supabase
          .from("album")
          .select("*")
          .eq("username", username);

        if (albumError) {
          throw new Error("Erreur lors de la récupération des albums");
        }

        if (!albumsData || albumsData.length === 0) {
          console.error("Aucun album trouvé pour l'utilisateur", username);
          return;
        }

        console.log("User data:", userData);
        console.log("Albums data:", albumsData);

        const albumsWithMedia = await Promise.all(
          albumsData.map(async (album) => {
            if (album.id) {
              const { data: imageMedia, error: imageError } = await supabase
                .from("link_image_album")
                .select("id_image, id_album, url")
                .eq("id_album", album.id)
                .limit(5);

              const { data: videoMedia, error: videoError } = await supabase
                .from("link_video_album")
                .select("id_video, id_album, url, imagevideo")
                .eq("id_album", album.id)
                .limit(5);

              if (imageError || videoError) {
                throw imageError || videoError;
              }

              return {
                ...album,
                images: imageMedia || [],
                videos: videoMedia || [],
              };
            } else {
              console.error("L'album n'a pas d'id défini :", album);
              return null;
            }
          }),
        );

        setAlbumData(albumsWithMedia);
        setUserInfo(userData[0]);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };
    if (router.isReady) {
      fetchData();
    }
  }, [router.isReady, username]);

  return (
    <div className="mx-auto w-4/5 bg-light dark:bg-dark">
      <h1 className="h1 mb-3">{userInfo.username}</h1>
      <p className="text-gray-600 ml-20 mb-4">Bio : {userInfo.bio}</p>
      <h2 className="mx-auto h2 mb-2">Album de l'utilisateur</h2>
      {albumData.map((album) => (
        <div key={album.id} className="comments-container p-6 rounded-md">
          <Link href={`/album/${album.id}`}>
            <div className="border p-6 rounded-md bg-white mb-1">
              <h2 className="text-xl font-bold mb-1">{album.name_liste}</h2>
              <p className="text-gray-600 mb-1">
                Description : {album.description_liste}
              </p>
              <p className="text-gray-500 mb-1">Créé par : {album.username}</p>
              <p className="text-gray-500 mb-1">
                Date de création : {album.created_at}
              </p>
              <p className="text-gray-600 ">Image :</p>
              <div className="flex space-x-4 mb-4">
                {album.images.map((image) => (
                  <img
                    key={image.id_image}
                    src={image.url}
                    alt={`Image ${image.id_image}`}
                    className="w-24 h-24"
                  />
                ))}
              </div>
              <p className="text-gray-600">Video :</p>
              <div className="flex space-x-4">
                {album.videos.map((video) => (
                  <img
                    key={video.id_video}
                    src={video.imagevideo}
                    alt={`Video ${video.id_video}`}
                    className="w-24 h-24"
                  />
                ))}
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default Users;
