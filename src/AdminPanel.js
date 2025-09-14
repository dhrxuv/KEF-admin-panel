/* global __app_id */
import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase";

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

function AdminPanel() {
  // --- State ---
  const [newsItems, setNewsItems] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [books, setBooks] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [research, setResearch] = useState([]);

  const [newNewsText, setNewNewsText] = useState("");
  const [newCaseStudyTitle, setNewCaseStudyTitle] = useState("");
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBlogTitle, setNewBlogTitle] = useState("");
  const [newBlogText, setNewBlogText] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newResearchTitle, setNewResearchTitle] = useState("");

  const [caseStudyFile, setCaseStudyFile] = useState(null);
  const [bookFile, setBookFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [researchFile, setResearchFile] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);

  const [newsError, setNewsError] = useState(null);
  const [caseStudyError, setCaseStudyError] = useState(null);
  const [bookError, setBookError] = useState(null);
  const [blogError, setBlogError] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [researchError, setResearchError] = useState(null);

  // --- Firestore listeners ---
  useEffect(() => {
    const createListener = (path, setter) => {
      const q = query(
        collection(db, `/artifacts/${appId}/public/data/${path}`),
        orderBy("createdAt", "desc")
      );
      return onSnapshot(q, snapshot =>
        setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      );
    };

    const unsubNews = createListener("newsItems", setNewsItems);
    const unsubCase = createListener("caseStudies", setCaseStudies);
    const unsubBooks = createListener("books", setBooks);
    const unsubBlogs = createListener("blogs", setBlogs);
    const unsubVideos = createListener("videos", setVideos);
    const unsubResearch = createListener("research", setResearch);

    return () => {
      unsubNews();
      unsubCase();
      unsubBooks();
      unsubBlogs();
      unsubVideos();
      unsubResearch();
    };
  }, []);

  // --- File upload helper ---
  const uploadFile = (file, pathPrefix, setError, setInputFile) =>
    new Promise((resolve, reject) => {
      if (!file) return reject("No file provided");
      const storagePath = `${pathPrefix}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        snapshot =>
          setUploadProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          ),
        err => {
          setError(`Upload failed: ${err.message}`);
          setUploadProgress(0);
          reject(err);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadProgress(0);
          setInputFile(null);
          resolve({ downloadURL, storagePath });
        }
      );
    });

  // --- Add handlers ---
  const addDocHandler = async (collectionName, data, resetFields) => {
    try {
      await addDoc(
        collection(db, `/artifacts/${appId}/public/data/${collectionName}`),
        { ...data, createdAt: serverTimestamp() }
      );
      resetFields && resetFields();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNews = e => {
    e.preventDefault();
    if (!newNewsText.trim()) return;
    addDocHandler("newsItems", { text: newNewsText }, () => setNewNewsText(""));
  };

  const handleAddBlog = e => {
    e.preventDefault();
    if (!newBlogTitle.trim() || !newBlogText.trim()) return;
    addDocHandler("blogs", { title: newBlogTitle, text: newBlogText }, () => {
      setNewBlogTitle("");
      setNewBlogText("");
    });
  };

  const handleAddFileItem = async (
    e,
    title,
    file,
    collectionName,
    pathPrefix,
    setTitle,
    setFile,
    setError
  ) => {
    e.preventDefault();
    if (!title || !file) return;
    try {
      const { downloadURL, storagePath } = await uploadFile(
        file,
        pathPrefix,
        setError,
        setFile
      );
      addDocHandler(
        collectionName,
        { title, fileURL: downloadURL, storagePath, fileName: file.name },
        () => setTitle("")
      );
    } catch (err) {}
  };

  // --- Delete handler ---
  const handleDelete = async (item, collectionName, setError) => {
    try {
      await deleteDoc(
        doc(db, `/artifacts/${appId}/public/data/${collectionName}`, item.id)
      );
      if (item.storagePath) await deleteObject(ref(storage, item.storagePath));
    } catch (err) {
      setError && setError(err.message);
      console.error(err);
    }
  };

  const renderFileSection = (
    title,
    items,
    newTitle,
    setNewTitle,
    newFile,
    setNewFile,
    collectionName,
    setError
  ) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-cyan-300 mb-3">{title}</h2>
      <form
        onSubmit={e =>
          handleAddFileItem(
            e,
            newTitle,
            newFile,
            collectionName,
            `artifacts/${appId}/${collectionName}`,
            setNewTitle,
            setNewFile,
            setError
          )
        }
        className="mb-3 space-y-2"
      >
        <input
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Title"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <input type="file" onChange={e => setNewFile(e.target.files[0])} />
        <button className="bg-cyan-600 px-3 py-1 rounded">
          Add {title.slice(0, -1)}
        </button>
      </form>
      <ul>
        {items.map(i => (
          <li
            key={i.id}
            className="flex justify-between items-center mb-1 break-words"
          >
            {i.fileURL ? (
              <a href={i.fileURL} target="_blank" rel="noopener noreferrer">
                {i.title || i.fileName}
              </a>
            ) : (
              <span>{i.title}</span>
            )}
            <button
              className="bg-red-600 px-2 py-0.5 rounded"
              onClick={() => handleDelete(i, collectionName, setError)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold text-cyan-400 mb-6">Admin Panel</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* News */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-3">News</h2>
          <form onSubmit={handleAddNews} className="mb-3">
            <input
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="News text"
              value={newNewsText}
              onChange={e => setNewNewsText(e.target.value)}
            />
            <button className="mt-2 bg-cyan-600 px-3 py-1 rounded">Add</button>
          </form>
          <ul>
            {newsItems.map(n => (
              <li
                key={n.id}
                className="flex justify-between items-center mb-1 break-words"
              >
                <span>{n.text}</span>
                <button
                  className="bg-red-600 px-2 py-0.5 rounded"
                  onClick={() => handleDelete(n, "newsItems", setNewsError)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Blogs */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-cyan-300 mb-3">Blogs</h2>
          <form onSubmit={handleAddBlog} className="mb-3 space-y-2">
            <input
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="Blog title"
              value={newBlogTitle}
              onChange={e => setNewBlogTitle(e.target.value)}
            />
            <textarea
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="Blog content"
              value={newBlogText}
              onChange={e => setNewBlogText(e.target.value)}
            />
            <button className="bg-cyan-600 px-3 py-1 rounded">Add Blog</button>
          </form>
          <ul>
            {blogs.map(b => (
              <li
                key={b.id}
                className="flex justify-between items-center mb-1 break-words"
              >
                <span>
                  <strong>{b.title}</strong>: {b.text}
                </span>
                <button
                  className="bg-red-600 px-2 py-0.5 rounded"
                  onClick={() => handleDelete(b, "blogs", setBlogError)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* File Sections */}
        {renderFileSection(
          "Case Studies",
          caseStudies,
          newCaseStudyTitle,
          setNewCaseStudyTitle,
          caseStudyFile,
          setCaseStudyFile,
          "caseStudies",
          setCaseStudyError
        )}
        {renderFileSection(
          "Books",
          books,
          newBookTitle,
          setNewBookTitle,
          bookFile,
          setBookFile,
          "books",
          setBookError
        )}
        {renderFileSection(
          "Videos",
          videos,
          newVideoTitle,
          setNewVideoTitle,
          videoFile,
          setVideoFile,
          "videos",
          setVideoError
        )}
        {renderFileSection(
          "Research",
          research,
          newResearchTitle,
          setNewResearchTitle,
          researchFile,
          setResearchFile,
          "research",
          setResearchError
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
