// Firebase本体読み込み
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);

// Firebase Cloud Messaging(Fcm) = push通知機能 の読み込み
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyA9iYwDwojK_dG74GiSaQ64PMT97EUq85c",
  authDomain: "challenge1-kirari.firebaseapp.com",
  projectId: "challenge1-kirari",
  storageBucket: "challenge1-kirari.firebasestorage.app",
  messagingSenderId: "753884909362",
  appId: "1:753884909362:web:3aa9d05b685d8b50e8d12b",
  measurementId: "G-K6VV5RCYHD"
});

const messaging = firebase.messaging();