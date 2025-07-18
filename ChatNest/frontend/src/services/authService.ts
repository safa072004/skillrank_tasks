
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User 
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export const registerWithEmailAndPassword = async (
  email: string, 
  password: string, 
  name: string
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update the user's display name
  await updateProfile(user, {
    displayName: name
  });
  
  return user;
};

export const loginWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};
