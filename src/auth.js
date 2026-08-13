
import { auth } from './firebase.js';
import { 
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut
} from 'firebase/auth';

// Firebase Authenticationでログイン
export async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword( auth, email, password );

    // メール認証済みか確認
    const user = userCredential.user;
    if(!user.emailVerified){
        //認証メールを送信
        await sendEmailVerification(user);

        //ログアウト
        await signOut(auth);

        throw new Error(
            "認証メール未完了。認証メールを確認してください。"
        )
    }
    // メール認証済みならログイン成功
    return user;
}

// ログアウト
export async function logout() {
    await signOut(auth);
}

// 認証メール送信
export async function sendVerification() {
    
}

// ログイン状態確認
export function isLoggedIn() {
    return auth.currentUser !== null;
}

// 現在のユーザー取得
export function getCurrentUser() {
    return auth.currentUser;
}
