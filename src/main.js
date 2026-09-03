import { login, logout, isLoggedIn, getCurrentUser } from './auth.js';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth, storage, messaging } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { getToken } from 'firebase/messaging';

// HTML要素
const loginPage = document.getElementById("login-page");        //ログイン画面
const content = document.getElementById("content");             //メイン画面
const loginButton = document.getElementById("loginButton");     //ログインボタン
const logoutButton = document.getElementById("logoutButton");   //ログアウトボタン

const photoInput = document.getElementById("photoInput");       //写真アップロード
const uploadButton = document.getElementById("uploadButton");   //アップロードボタン
const uploadMessage = document.getElementById("uploadMessage"); //アップロード時のメッセージ
const photoGallery = document.getElementById("photoGallery");   //写真を表示
const deleteModeButton = document.getElementById("deleteModeButton");
const deleteSelectedButton = document.getElementById("deleteSelectedButton");

let selectedPhotos = new Set();
let deleteMode = false;

// ログイン
loginButton.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      // Firebase Authenticationでログイン
      const user = await login(email, password);
      console.log(user);
      // Push通知を登録
      await setupNotifications();

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
    } catch (error) {
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
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    console.log("ログイン済み:", user);
    loginPage.style.display = "none";
    content.style.display = "block";
    // 写真を読み込む
    await loadPhotos();
  } else {
    console.log("ログインしていません");
    loginPage.style.display = "block";
    content.style.display = "none";
  }
});

// Firebase Storageから2人分の写真一覧を取得
async function loadPhotos() {

  try {
    // 2人のUID
    const userIds = [
      "bjLXVi1seENM1pb5S8G44zBo1Xp1",
      "tPqKbOKHIVgVIpp148eu1Jzzo5y2"
    ];

    // 一度表示をクリア
    photoGallery.innerHTML = "";

    // 2人分のフォルダを順番に取得
    for (const userId of userIds) {

      // そのユーザーの写真フォルダ
      const photosRef = ref(
        storage,
        `photos/${userId}`
      );

      // フォルダ内のファイル一覧を取得
      const result = await listAll(photosRef);

      // 写真を1枚ずつ表示
      for (const item of result.items) {

        // 写真URLを取得
        const url = await getDownloadURL(item);

        // 写真全体を囲む箱
        const photoContainer = document.createElement("div");
        photoContainer.style.display = "inline-block";
        photoContainer.style.position = "relative";
        photoContainer.style.margin = "10px";

        // 写真
        const img = document.createElement("img");
        img.src = url;
        img.alt = "お気に入りの写真";
        img.style.width = "200px";
        img.style.height = "200px";
        img.style.objectFit = "cover";
        img.style.margin = "10px";

        // チェックボックス(削除時)
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.style.position = "absolute";
        checkbox.style.top = "10px";
        checkbox.style.left = "10px";
        checkbox.style.width = "25px";
        checkbox.style.height = "25px";
        // 削除モードでないときは非表示
        checkbox.style.display = deleteMode ? "block" : "none";

        // チェック状態が変わったとき
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedPhotos.add(item);
          } else {
            selectedPhotos.delete(item);
          }
        });

        // 写真をクリックしても選択できるようにする
        img.addEventListener("click", () => {
          if (!deleteMode) { return; }
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
          selectedPhotos.add(item);
        } else {
          selectedPhotos.delete(item);
        }
      });
        // 写真と削除ボタンを追加
        photoContainer.appendChild(img);
        photoContainer.appendChild(checkbox);

        // ギャラリーに追加
        photoGallery.appendChild(photoContainer);
      }
    }
  } catch (error) {
    console.error("写真一覧取得エラー:", error);
  }
}

// 「削除モード」ボタンを作る
deleteModeButton.addEventListener("click", async () => {
  deleteMode = !deleteMode;
  if (deleteMode) {
    deleteModeButton.textContent = "キャンセル";
    deleteSelectedButton.style.display = "inline-block";
  } else {
    deleteModeButton.textContent = "🗑️ 写真を削除";
    deleteSelectedButton.style.display = "none";

    // 選択を解除
    selectedPhotos.clear();
  }

  // 写真一覧を再表示
  await loadPhotos();
});

// 「選択した写真を削除」処理
deleteSelectedButton.addEventListener("click",async () => {

    // 何も選択されていない
    if (selectedPhotos.size === 0) {
      alert("削除する写真を選択してください");
      return;
    }
    const confirmed = confirm(`本当に${selectedPhotos.size}枚の写真を削除してしまうのですか？`);
    if (!confirmed) { return; }
    try {
      // 選択された写真をすべて削除
      for (const item of selectedPhotos) {
        await deleteObject(item);
      }
      console.log("写真を削除しました");
      // 選択をリセット
      selectedPhotos.clear();

      // 削除モード終了
      deleteMode = false;

      deleteModeButton.textContent = "🗑️ 写真を削除";
      deleteSelectedButton.style.display = "none";

      // 写真一覧を更新
      await loadPhotos();
    } catch (error) {
      console.error("写真削除エラー:", error);

      alert("写真の削除に失敗しました。\n" + error.message);
    }
  }
);

// 写真アップロード
uploadButton.addEventListener("click", async () => {
  const file = photoInput.files[0];
  const user = auth.currentUser;

  // 写真が選択されているか確認
  if (!file) {
    uploadMessage.textContent = "写真を選んで！";
    return;
  }

  // ログイン中のユーザーを確認
  if (!user) {
    uploadMessage.textContent = "ログインしてください";
    return;
  }

  try {
    uploadMessage.textContent = "アップロード中...";

    // Storage内の保存先
    const photoRef = ref(
      storage,
      `photos/${user.uid}/${Date.now()}_${file.name}`
    );

    // Firebase Storageへアップロード
    await uploadBytes(photoRef, file);
    console.log("写真アップロード成功");
    uploadMessage.textContent = "写真をアップロードしました！📷";

    // 写真一覧を更新
    await loadPhotos();

    // 選択状態をリセット
    photoInput.value = "";

  } catch (error) {
    console.error("写真アップロードエラー:", error);

    uploadMessage.textContent =
      "アップロードに失敗しました: " + error.message;
  }
});

// Push通知を登録する
async function setupNotifications() {
  // 通知機能に対応しているか確認
  if (!("Notification" in window)) {
    console.log("このブラウザは通知に対応していません");
    return;
  }

  try {
    // 通知の許可を取得
    const permission = await Notification.requestPermission();

    if(permission !== "granted") {
      console.log("通知が許可されませんでした");
      return;
    }
    console.log("通知が許可されました");

    // Servise Wokerを登録
    const registration = await navigator.serviceWorker.register("/toKirari/firebase-messaging-sw.js");
    console.log("Servise Worker登録成功");

    //FCMトークンを取得
    const token = await getToken(messaging, {
      vapidKey: "BK-93gYLRQ0AkGQkTlANmhzTFyqejqH0BPCoWlhQ9WvjBIsTBIih52ETA2AYDwKcTDR2Z5OHB4K6kFy5w4hmmuw",
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log("FCMトークン取得成功");
      console.log("FCMトークン:", token);

      // ログイン中のユーザ
      const user = auth.currentUser;

      if (!user) {
        console.log("ログインユーザが取得できません");
        return;
      }

      // FirestoreにFCMトークンを保存
      await setDoc( doc(db, "users", user.uid), {
        fcmToken: token,
        updateAt: new Date()
      }, { merge: true }
      );
      console.log("FCMトークンをFirestoreに保存しました");
    } else {
      console.log("FCMトークンを取得できませんでした");
    }
  }
  catch (error) {
      console.error("通知登録エラー", error);
  }
}