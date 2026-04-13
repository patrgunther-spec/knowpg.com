// Phase 2: Push Notification Cloud Function
//
// This function fires when a new pop is created in Firestore.
// It looks up the creator's friends, gets their FCM tokens,
// and sends a push notification to all of them.
//
// To deploy:
//   1. Install Firebase CLI: npm install -g firebase-tools
//   2. cd PopIn/firebase/functions && npm install
//   3. firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.onNewPop = functions.firestore
  .document("pops/{popId}")
  .onCreate(async (snap, context) => {
    const pop = snap.data();
    const creatorId = pop.creatorId;

    // Get creator's friends
    const friendsSnap = await admin
      .firestore()
      .collection("users")
      .doc(creatorId)
      .collection("friends")
      .get();

    const friendIds = friendsSnap.docs.map((doc) => doc.id);
    if (friendIds.length === 0) return;

    // Get FCM tokens for all friends
    const tokens = [];
    for (const friendId of friendIds) {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(friendId)
        .get();
      if (userDoc.exists && userDoc.data().fcmToken) {
        tokens.push(userDoc.data().fcmToken);
      }
    }

    if (tokens.length === 0) return;

    // Send push notification
    await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: {
        title: `${pop.creatorName} is popping in!`,
        body: pop.destination,
      },
      data: {
        popId: context.params.popId,
      },
    });
  });
