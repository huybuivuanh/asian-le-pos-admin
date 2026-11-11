import { bizCol } from "@/lib/business";
import { callAdminApi } from "@/services/adminApi";
import {
  query,
  orderBy,
  onSnapshot,
  DocumentData,
  Unsubscribe,
} from "firebase/firestore";
import { asTimestamp } from "@/lib/firestore-timestamp";

export function listenUsers(
  onUpdate: (users: User[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const usersRef = bizCol("users");
  const q = query(usersRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const users: User[] = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          role: data.role,
          createdAt: asTimestamp(data.createdAt),
        };
      });
      onUpdate(users);
    },
    (err) => onError(err)
  );
}

/** POSTs to a user API route with the signed-in admin's ID token (the route checks it). */
async function postAsAdmin(path: string, body: unknown) {
  await callAdminApi(path, { method: "POST", body });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  await postAsAdmin("/api/users/createUser", data);
}

export async function updateUser(
  uid: string,
  data: Partial<User> & { password?: string }
) {
  await postAsAdmin("/api/users/updateUser", { uid, ...data });
}

export async function deleteUser(uid: string) {
  await postAsAdmin("/api/users/deleteUser", { uid });
}
