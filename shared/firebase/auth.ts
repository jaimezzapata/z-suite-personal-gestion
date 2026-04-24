import { getAuth } from "firebase/auth";

import { getFirebaseApp } from "./client";

export const firebaseAuth = getAuth(getFirebaseApp());

