import { login, logout, isLoggedIn, getCurrentUser } from './auth.js';
import { collection, addDoc, getDocs} from 'firebase/firestore';
import { db, auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

// HTML要素
const loginPage = document.getElementById("login-page");      //ログイン画面
const content = document.getElementById("content");           //メイン画面
const loginButton = document.getElementById("loginButton");   //ログインボタン
const logoutButton = document.getElementById("logoutButton"); //ログアウトボタン

// ログイン
loginButton.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      // Firebase Authenticationでログイン
      const user = await login(email, password);
      console.log(user);

      // FireStoreにテストデータを保存
      await addDoc(collection(db, "test"), {
        message: "きらりへ💌",
        uid: user.uid,
        createAt: new Date()
      });

      console.log("Firebaseへの保存成功");

      //ログイン画面を隠す
      loginPage.style.display = "none";

      //メイン画面を表示
      content.style.display = "block";
    }
    catch (error) {
      console.error(error);
      alert(error.message);
    }
});

// ログアウト
logoutButton.addEventListener("click", async () => {
  await logout();

  // メイン画面を隠す
  content.style.display = "none";
  
  // ログイン画面を表示
  loginPage.style.display = "block";
})

// Firebaseのログイン状態を監視
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    console.log("ログイン済み:", user);
    loginPage.style.display = "none";
    content.style.display = "block";
  } else {
    console.log("ログインしていません");
    loginPage.style.display = "block";
    content.style.display = "none";

  }

});

