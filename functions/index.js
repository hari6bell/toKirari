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
// 毎日8時に記念日をチェック
// ==============================
exports.sendAnniversaryNotification = onSchedule(
    {
        schedule: "0 8 * * *",
        timeZone: "Asia/Tokyo",
    },
    async (event) => {
        console.log("記念日チェック開始");

        // 今日の日付
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const today = `${month}-${day}`;

        console.log("今日の日付：", today);

        // 記念日データを取得
        const anniversarySnapshot =
            await db.collection("anniversaries").get();

        // 記念日を確認
        for (const doc of anniversarySnapshot.docs) {
            const data = doc.data();

            console.log("確認中：", data);

            // 月日が一致した場合
            if (data.date === today) {
                console.log("今日は記念日です！");

                // FCMトークンを取得
                const tokenSnapshot = await db.collection("users").get();

                for (const tokenDoc of tokenSnapshot.docs) {
                    const tokenData = tokenDoc.data();
                    const token = tokenData.fcmToken;

                    if (!token) { continue; }

                    // 通知を送信
                    await messaging.send({
                        token: token,

                        notification: {
                            title: "きらりへ 💐",
                            body:
                                data.message || "今日は記念日。いつもありがとねん",
                        },

                        webpush: {
                            fcmOptions: {
                                link:"https://hari6bell.github.io/toKirari/",
                            },
                        },
                    });
                    console.log("通知送信成功");
                }
            }
        }
        console.log("記念日チェック終了");
    }
);
