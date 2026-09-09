import '/style.css';
import { login, logout, isLoggedIn, getCurrentUser } from './auth.js';
import { collection, addDoc, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
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

const messageDisplay1 = document.getElementById("message-display-1");
const messageDisplay2 = document.getElementById("message-display-2");
const messageEdit = document.getElementById("message-edit");
const messageInput1 = document.getElementById("message-input-1");
const messageInput2 = document.getElementById("message-input-2");
const editMessageButton = document.getElementById("editMessageButton");
const saveMessageButton = document.getElementById("saveMessageButton");
const cancelMessageButton = document.getElementById("cancelMessageButton");

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
    // メッセージを読み込む
    await loadMessages();
  } else {
    console.log("ログインしていません");
    loginPage.style.display = "block";
    content.style.display = "none";
  }
});

// Firebase Storageから2人分の写真一覧を取得
async function loadPhotos() {
  try {
    const userIds = [
      "bjLXVi1seENM1pb5S8G44zBo1Xp1",
      "tPqKbOKHIVgVIpp148eu1Jzzo5y2"
    ];

    photoGallery.innerHTML = "";
    const photos = [];

    // ==============================
    // Firebase Storageから写真取得
    // ==============================
    for (const userId of userIds) {

      const photosRef = ref( storage, `photos/${userId}` );
      const result = await listAll(photosRef);

      for (const item of result.items) {
        const url = await getDownloadURL(item);
        photos.push({
          item: item,
          url: url
        });
      }
    }

    // 写真がない場合
    if (photos.length === 0) {
      photoGallery.innerHTML =
        "<p>まだ写真がないよ📷</p>";
      return;
    }

    // ==============================
    // 横スクロール
    // ==============================
    const track = document.createElement("div");
    track.className = "photo-track";

    // 同じ写真を2セット並べる
    const photoList = [...photos, ...photos];

    for (const photo of photoList) {
      const photoContainer = document.createElement("div");
      photoContainer.className = "photo-container";

      // ==============================
      // 写真
      // ==============================
      const img = document.createElement("img");

      img.src = photo.url;
      img.alt = "お気に入りの写真";
      img.dataset.photoUrl = photo.url;

      // ==============================
      // 削除用チェックボックス
      // ==============================
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      checkbox.style.display = deleteMode ? "block" : "none";
      checkbox.addEventListener( "change", () => {
          if (checkbox.checked) {
            selectedPhotos.add(photo.item);
          } else {
            selectedPhotos.delete(photo.item);
          }
        }
      );

      // ==============================
      // 写真クリック
      // ==============================
      img.addEventListener( "click", () => {
          // --------------------------
          // 削除モード
          // --------------------------
          if (deleteMode) { 
            checkbox.checked = !checkbox.checked;

            if (checkbox.checked) {
              selectedPhotos.add( photo.item );
            } else {
              selectedPhotos.delete( photo.item );
            }
            return;
          }

          // --------------------------
          // 通常モード
          // --------------------------
          const samePhotos =
            document.querySelectorAll( `[data-photo-url="${CSS.escape(photo.url)}"]` );

          // すでに選択されているか
          const isSelected = img.classList.contains( "selected" );

          // いったん全部解除
          document
            .querySelectorAll( ".photo-container img" )
            .forEach( (photoImg) => {
                photoImg.classList.remove( "selected" );
              }
            );

          // まだ選択されていなかった場合
          // → 同じ写真のコピーも選択
          if (!isSelected) {
            samePhotos.forEach( (photoImg) => {
                photoImg.classList.add( "selected" );
              }
            );

            console.log( "選択した写真:", photo.url );
          }
        }
      );

      photoContainer.appendChild(img);
      photoContainer.appendChild(checkbox);
      track.appendChild(photoContainer);
    }
    photoGallery.appendChild(track);

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

// ==============================
// 付き合ってからの経過時間
// ==============================
const startDate = new Date("2025-08-29T00:00:00+09:00");
function updateCounters() {
  // 経過時間を計算
  const now = new Date();
  const elapsed = now - startDate;
  const totalSeconds = Math.floor(elapsed / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor(
      (totalSeconds % (24 * 60 * 60)) / (60 * 60)
  );
  const minutes = Math.floor(
      (totalSeconds % (60 * 60)) / 60
  );
  const seconds = totalSeconds % 60;
  document.getElementById("elapsed-time").textContent = `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;

  // 次の記念日を計算
  let nextAnniversary = new Date(now.getFullYear(), now.getMonth(), 29);

    // 今月29日を過ぎていたら来月29日
    if (now >= nextAnniversary) {
        nextAnniversary = new Date(now.getFullYear(), now.getMonth() + 1, 29);
    }
    const remaining = nextAnniversary - now;
    const remainingDays = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    document.getElementById("next-anniversary").textContent = `あと${remainingDays}日`;
}

// 最初に実行
updateCounters();

// 1秒ごとに更新
setInterval(updateCounters, 1000);


// =========================
// メッセージ機能
// =========================
// Firestoreからメッセージを読み込む
async function loadMessages() {
    try {
        const messageRef = doc(db, "messages", "main");
        const snapshot = await getDoc(messageRef);
        if (snapshot.exists()) {
            const data = snapshot.data();
            messageDisplay1.textContent = data.message1 || "";
            messageDisplay2.textContent = data.message2 || "";
        }
    } catch (error) {
        console.error("メッセージ読み込みエラー:", error);
    }
}


// 編集ボタン
editMessageButton.addEventListener("click", () => {
    messageInput1.value = messageDisplay1.textContent;
    messageInput2.value = messageDisplay2.textContent;
    messageDisplay1.style.display = "none";
    messageDisplay2.style.display = "none";
    messageEdit.style.display = "block";
    editMessageButton.style.display = "none";
});


// 保存ボタン
saveMessageButton.addEventListener("click", async () => {
    const message1 = messageInput1.value;
    const message2 = messageInput2.value;

    try {
        await setDoc( doc(db, "messages", "main"),
            {
                message1: message1,
                message2: message2
            }
        );

        messageDisplay1.textContent = message1;
        messageDisplay2.textContent = message2;
        messageDisplay1.style.display = "block";
        messageDisplay2.style.display = "block";
        messageEdit.style.display = "none";
        editMessageButton.style.display = "inline-block";
        alert("メッセージを保存しました！");
    } catch (error) {
        console.error("メッセージ保存エラー:", error);
        alert("保存に失敗しました。");
    }
});

// キャンセル
cancelMessageButton.addEventListener("click", () => {

    messageDisplay1.style.display = "block";
    messageDisplay2.style.display = "block";
    messageEdit.style.display = "none";
    editMessageButton.style.display = "inline-block";
});