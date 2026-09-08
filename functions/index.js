const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

setGlobalOptions({
    maxInstances: 1,
    region: "asia-northeast1",
});

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ==============================
// 毎日8時に記念日と誕生日をチェック
// ==============================
exports.sendAnniversaryNotification = onSchedule(
    {
        schedule: "0 8 * * *",
        timeZone: "Asia/Tokyo",
    },
    async (event) => {
        console.log("通知チェック開始");

        // 今日の日付
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const today = `${month}-${day}`;

        console.log("今日の日付：", today);

        // FCMトークンを取得
        const tokenSnapshot = await db.collection("users").get();

        // 通知を送信する処理
        async function checkAndSend(
            collectionName,
            notificationTitle,
            defaultMessage
        ) {
            console.log( `${collectionName} を確認します` );

            // データ取得
            const snapshot = await db.collection(collectionName).get();

            // データを確認
            for (const doc of snapshot.docs) {
                const data = doc.data();
                console.log( "確認中：", data );

                // 今日の日付と一致するか
                if (data.date !== today) { continue; }

                console.log( `${collectionName}：今日は通知日です！` );

                // 通知本文
                const message = data.message || defaultMessage;

                // 全ユーザーへ通知
                for (const tokenDoc of tokenSnapshot.docs) {
                    const tokenData = tokenDoc.data();
                    const token = tokenData.fcmToken;

                    if (!token) { continue; }

                    try {
                        await messaging.send({
                            token: token,
                            notification: {
                                title: notificationTitle,
                                body: message,
                            },

                            webpush: {
                                fcmOptions: {
                                    link: "https://hari6bell.github.io/toKirari/",
                                },
                            },
                        });

                        console.log( `${collectionName} 通知送信成功` );

                    } catch (error) {
                        console.error( `${collectionName} 通知送信失敗：`, error );
                    }
                }
            }
        }

        // ① 記念日
        await checkAndSend(
            "anniversaries",
            "💐 きらりへ ",
            "きょう記念日～✨　いつもありがとねん☺︎"
        );

        // ② 誕生日
        await checkAndSend(
            "birthday",
            "🎉 きらりへ 🎉",
            "お誕生日おめでとう～☺︎☺︎☺︎"
        );

        // ③ 通知テスト
        await checkAndSend(
            "notification-test",
            "🔔 通知テスト",
            "通知テストです！"
        );
        console.log("通知チェック終了");
    }
);
