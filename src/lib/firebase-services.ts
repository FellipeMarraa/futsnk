import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import type {Player} from "@/lib/types.ts";

const PLAYERS_COLLECTION = 'players';
const GROUPS_COLLECTION = 'groups';

const getUserGroups = async (email: string) => {
  if (!email) return [];
  const q = query(
      collection(db, GROUPS_COLLECTION),
      where('membersEmails', 'array-contains', email.toLowerCase())
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getGroupById = async (id: string) => {
  const docSnap = await getDoc(doc(db, GROUPS_COLLECTION, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

const isUserAdmin = (group: any, user: any): boolean => {
  if (!user) return false;

  if (user.isSuperAdmin) return true;

  const isOwner = group.ownerId === user.uid;
  const isExplicitAdmin = group.adminsEmails?.includes(user.email?.toLowerCase());

  return isOwner || isExplicitAdmin;
};

export const GroupService = {
  async createGroupFull(groupData: {
    name: string;
    day: string;
    time: string;
    location: string;
    maxPlayers: number;
    userId: string;
    userEmail: string;
    courtValue?: number;
    balance?: number;
  }) {
    try {
      const groupRef = await addDoc(collection(db, GROUPS_COLLECTION), {
        name: groupData.name,
        day: groupData.day,
        time: groupData.time,
        location: groupData.location,
        maxPlayers: groupData.maxPlayers,
        courtValue: groupData.courtValue || 0,
        balance: groupData.balance || 0,
        members: [groupData.userId],
        membersEmails: [groupData.userEmail.toLowerCase()],
        admins: [groupData.userId],
        adminsEmails: [groupData.userEmail.toLowerCase()],
        ownerId: groupData.userId,
        isPro: false,
        planType: 'free',
        expiresAt: null,
        status: 'active',
        players: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return groupRef.id;
    } catch (error) {
      console.error("Erro ao criar grupo completo:", error);
      throw error;
    }
  },

  async addMember(groupId: string, userId: string, userEmail: string) {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      membersEmails: arrayUnion(userEmail.toLowerCase())
    });
  },

  async joinGroupById(groupId: string, userId: string, userEmail: string) {
    try {
      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) throw new Error("Grupo não encontrado.");

      const groupData = groupSnap.data();
      const emailLower = userEmail.toLowerCase().trim();

      if (groupData.membersEmails?.includes(emailLower)) {
        return { status: 'already_member' };
      }

      await updateDoc(groupRef, {
        members: arrayUnion(userId),
        membersEmails: arrayUnion(emailLower),
        updatedAt: serverTimestamp()
      });

      return { status: 'success' };
    } catch (error) {
      console.error("Erro ao entrar no grupo via ID:", error);
      throw error;
    }
  },

  async updateGroup(groupId: string, data: any) {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteGroupCascade(groupId: string) {
    const batch = writeBatch(db);

    try {
      const playersMetaSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'players_meta'));
      playersMetaSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const matchesSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'matches'));

      for (const matchDoc of matchesSnap.docs) {
        const techRatingsSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'matches', matchDoc.id, 'technical_ratings'));
        techRatingsSnap.forEach(v => batch.delete(v.ref));

        const legacyVotesSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'matches', matchDoc.id, 'votes'));
        legacyVotesSnap.forEach(v => batch.delete(v.ref));

        batch.delete(matchDoc.ref);
      }

      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      batch.delete(groupRef);

      await batch.commit();
      console.log(`Clube ${groupId} totalmente removido.`);
    } catch (error) {
      console.error("Erro ao deletar grupo em cascata:", error);
      throw error;
    }
  }
};

// --- SERVIÇO DE JOGADORES ---

export const PlayerService = {
  async createPlayer(groupId: string, player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!groupId) throw new Error("Grupo não selecionado");
    try {
      const docRef = await addDoc(collection(db, PLAYERS_COLLECTION), {
        ...player,
        groupId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar jogador:", error);
      throw error;
    }
  },

  async getPlayers(groupId: string): Promise<Player[]> {
    if (!groupId) return [];
    const q = query(
        collection(db, PLAYERS_COLLECTION),
        where('groupId', '==', groupId),
        orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
    })) as Player[];
  }
};

// --- SERVIÇO DE CUPONS ---

export const CouponService = {
  async applyCoupon(groupId: string, couponCode: string, currentUser: any) {
    try {
      const codeUpper = couponCode.toUpperCase().trim();
      const couponRef = doc(db, 'coupons', codeUpper);
      const couponSnap = await getDoc(couponRef);

      if (!couponSnap.exists()) throw new Error("Cupom inválido.");

      const couponData = couponSnap.data();
      const now = new Date();

      if (!couponData.active) throw new Error("Cupom inativo.");
      if (couponData.expiresAt && couponData.expiresAt.toDate() < now) {
        throw new Error("Cupom expirado.");
      }

      if (couponData.currentUses >= couponData.maxUses) {
        throw new Error("Limite de usos deste cupom esgotado.");
      }

      if (couponData.usedBy && couponData.usedBy.includes(currentUser.uid)) {
        throw new Error("Você já utilizou este cupom.");
      }

      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) throw new Error("Grupo não encontrado.");

      const groupData = groupSnap.data();

      const currentExpiry = groupData.expiresAt?.toDate() || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + couponData.days);

      const batch = writeBatch(db);

      batch.update(groupRef, {
        isPro: true,
        planType: 'coupon',
        expiresAt: Timestamp.fromDate(newExpiry),
        updatedAt: serverTimestamp()
      });

      batch.update(couponRef, {
        currentUses: (couponData.currentUses || 0) + 1,
        usedBy: arrayUnion(currentUser.uid)
      });

      await batch.commit();
      return { success: true, daysAdded: couponData.days };

    } catch (error: any) {
      console.error("Erro ao aplicar cupom:", error);
      throw error;
    }
  }
}

// --- EXPORTS DIRETOS ---

export { getUserGroups, isUserAdmin };

export async function createGroupFull(groupData: any) {
  return GroupService.createGroupFull(groupData);
}

export async function createPlayer(groupId: string, player: any) {
  return PlayerService.createPlayer(groupId, player);
}

export async function getPlayers(groupId: string) {
  return PlayerService.getPlayers(groupId);
}

export const joinGroupById = (groupId: string, userId: string, userEmail: string) =>
    GroupService.joinGroupById(groupId, userId, userEmail);

export const updateGroup = (id: string, data: any) => GroupService.updateGroup(id, data);
export const deleteGroup = (id: string) => GroupService.deleteGroupCascade(id);

export const applyCoupon = (groupId: string, code: string, user: any) =>
    CouponService.applyCoupon(groupId, code, user);