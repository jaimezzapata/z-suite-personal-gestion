import { getFirestore } from "firebase/firestore";

import { getFirebaseApp } from "./client";

export const firestore = getFirestore(getFirebaseApp());

