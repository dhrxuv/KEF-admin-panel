import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./Login";
import AdminPanel from "./AdminPanel";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div>
      <button
        onClick={() => signOut(getAuth())}
        className="absolute top-4 right-4 bg-red-600 px-4 py-2 rounded text-white"
      >
        Logout
      </button>
      <AdminPanel />
    </div>
  );
}

export default App;
