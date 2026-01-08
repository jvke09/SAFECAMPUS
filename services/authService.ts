import { auth, db } from "./firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { UserRole } from '../types';

export const authService = {
  // ---------------- REGISTER ----------------
  register: async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    username: string
  ) => {
    try {
      const normalizedUsername = username.trim().toLowerCase();

      const existingUsername = await db
        .collection("users")
        .where("username", "==", normalizedUsername)
        .limit(1)
        .get();

      if (!existingUsername.empty) {
        const err: any = new Error("Username already taken");
        err.code = "auth/username-already-in-use";
        throw err;
      }

      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (!cred.user) throw new Error("Registration failed");
      await cred.user.updateProfile({ displayName });
      await cred.user.sendEmailVerification();

      await db.collection("users").doc(cred.user.uid).set({
        role,
        email,
        displayName,
        username: normalizedUsername,
        status: "PENDING_VERIFICATION",
        emailVerified: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return cred.user;
    } catch (error) {
      throw error;
    }
  },

  // ---------------- LOGIN ----------------
  login: async (
    identifier: string,
    password: string,
    expectedRole: UserRole
  ) => {
    try {
      let loginEmail = identifier.trim();

      if (!identifier.includes("@")) {
        const normalizedUsername = identifier.trim().toLowerCase();
        const snapshot = await db
          .collection("users")
          .where("username", "==", normalizedUsername)
          .limit(1)
          .get();

        if (snapshot.empty) {
          const err: any = new Error("Account not found");
          err.code = "auth/user-not-found";
          throw err;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        if (!data.email) {
          const err: any = new Error("Account not found");
          err.code = "auth/user-not-found";
          throw err;
        }

        loginEmail = data.email;
      }

      const cred = await auth.signInWithEmailAndPassword(loginEmail, password);
      const user = cred.user;
      if (!user) throw new Error("Authentication failed");

      if (!user.emailVerified) {
        try {
          await user.sendEmailVerification();
        } catch {
          // Silently fail - user will see the verification message anyway
        }

        await auth.signOut();

        const verificationError: any = new Error(
          "Please verify your email address. A verification link has been sent."
        );
        verificationError.code = "auth/email-not-verified";
        throw verificationError;
      }

      const userDoc = await db.collection("users").doc(user.uid).get();

      if (!userDoc.exists) {
        await auth.signOut();
        throw new Error("Account record missing. Please contact admin.");
      }

      const data = userDoc.data();
      if (data && data.emailVerified !== true && user.emailVerified) {
        await userDoc.ref.update({
          emailVerified: true,
          status: data.status === "PENDING_VERIFICATION" ? "ACTIVE" : data.status
        });
      }

      if (data?.role !== expectedRole) {
        await auth.signOut();
        throw new Error(
          `This account is registered as ${data?.role}. Please switch tabs.`
        );
      }

      return user;
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await auth.signOut();
    } catch (error) {
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      await auth.sendPasswordResetEmail(email);
    } catch (error) {
      throw error;
    }
  },

  loginWithGoogle: async (expectedRole: UserRole) => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await auth.signInWithPopup(provider);
      const user = cred.user;
      if (!user) throw new Error("Authentication failed");

      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          role: expectedRole,
          email: user.email || null,
          displayName: user.displayName || "",
          status: user.emailVerified ? "ACTIVE" : "PENDING_VERIFICATION",
          emailVerified: !!user.emailVerified,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const data = userDoc.data();
        if (data && data.emailVerified !== true && user.emailVerified) {
          await userRef.update({
            emailVerified: true,
            status: data.status === "PENDING_VERIFICATION" ? "ACTIVE" : data.status
          });
        }

        if (data?.role !== expectedRole) {
          await auth.signOut();
          throw new Error(
            `This account is registered as ${data?.role}. Please switch tabs.`
          );
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  },

  loginWithFacebook: async (expectedRole: UserRole) => {
    try {
      const provider = new firebase.auth.FacebookAuthProvider();
      const cred = await auth.signInWithPopup(provider);
      const user = cred.user;
      if (!user) throw new Error("Authentication failed");

      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          role: expectedRole,
          email: user.email || null,
          displayName: user.displayName || "",
          status: user.emailVerified ? "ACTIVE" : "PENDING_VERIFICATION",
          emailVerified: !!user.emailVerified,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const data = userDoc.data();
        if (data && data.emailVerified !== true && user.emailVerified) {
          await userRef.update({
            emailVerified: true,
            status: data.status === "PENDING_VERIFICATION" ? "ACTIVE" : data.status
          });
        }

        if (data?.role !== expectedRole) {
          await auth.signOut();
          throw new Error(
            `This account is registered as ${data?.role}. Please switch tabs.`
          );
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  },

  loginWithApple: async (expectedRole: UserRole) => {
    try {
      const provider = new firebase.auth.OAuthProvider("apple.com");
      const cred = await auth.signInWithPopup(provider);
      const user = cred.user;
      if (!user) throw new Error("Authentication failed");

      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          role: expectedRole,
          email: user.email || null,
          displayName: user.displayName || "",
          status: user.emailVerified ? "ACTIVE" : "PENDING_VERIFICATION",
          emailVerified: !!user.emailVerified,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const data = userDoc.data();
        if (data && data.emailVerified !== true && user.emailVerified) {
          await userRef.update({
            emailVerified: true,
            status: data.status === "PENDING_VERIFICATION" ? "ACTIVE" : data.status
          });
        }

        if (data?.role !== expectedRole) {
          await auth.signOut();
          throw new Error(
            `This account is registered as ${data?.role}. Please switch tabs.`
          );
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  },

  startPhoneLogin: async (phoneNumber: string, recaptchaContainerId: string) => {
    try {
      const verifier = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
        size: "invisible"
      });
      const confirmation = await auth.signInWithPhoneNumber(phoneNumber, verifier);
      return confirmation;
    } catch (error) {
      throw error;
    }
  },

  confirmPhoneLogin: async (
    confirmation: firebase.auth.ConfirmationResult,
    code: string,
    expectedRole: UserRole
  ) => {
    try {
      const cred = await confirmation.confirm(code);
      const user = cred.user;
      if (!user) throw new Error("Authentication failed");

      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          role: expectedRole,
          email: user.email || null,
          phoneNumber: user.phoneNumber || null,
          displayName: user.displayName || user.phoneNumber || "",
          status: "ACTIVE",
          emailVerified: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const data = userDoc.data();
        if (data?.role !== expectedRole) {
          await auth.signOut();
          throw new Error(
            `This account is registered as ${data?.role}. Please switch tabs.`
          );
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
};
