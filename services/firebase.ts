import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCq0fWtdpyLL7P4QdKSxwNcXZiBnQe5dfA",
  authDomain: "safepath-ph.firebaseapp.com",
  projectId: "safepath-ph",
  storageBucket: "safepath-ph.appspot.com",
  messagingSenderId: "499759412964",
  appId: "1:499759412964:web:02ccc2d969df049a279ef1"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

if (typeof window !== 'undefined') {
	db.enablePersistence({ synchronizeTabs: true }).catch(() => {
		return;
	});
}

export { auth, db };
