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

// --- FUNÇÕES AUXILIARES DE GRUPO ---

export const getUserGroups = async (email: string) => {
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

export const isUserAdmin = (group: any, email: string) => {
  if (!group || !email) return false;
  return group.adminsEmails?.includes(email.toLowerCase()) || false;
};

// --- SERVIÇO DE GRUPOS ---

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

      // Verifica se já é membro para evitar duplicidade
      if (groupData.membersEmails?.includes(emailLower)) {
        return { status: 'already_member' };
      }

      // Adiciona o usuário aos arrays de membros
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

  /**
   * EXCLUSÃO EM CASCATA COMPLETA
   * Limpa Matches, Sub-votos de Matches, e Players_meta
   */
  async deleteGroupCascade(groupId: string) {
    const batch = writeBatch(db);

    try {
      // 1. Deletar Subcoleção 'players_meta'
      const playersMetaSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'players_meta'));
      playersMetaSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Deletar Subcoleção 'matches' e suas respectivas subcoleções internas (votos)
      const matchesSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'matches'));

      for (const matchDoc of matchesSnap.docs) {
        // Deletar technical_ratings dentro da match
        const techRatingsSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'matches', matchDoc.id, 'technical_ratings'));
        techRatingsSnap.forEach(v => batch.delete(v.ref));

        // Deletar votes (MVP antigo) dentro da match
        const legacyVotesSnap = await getDocs(collection(db, GROUPS_COLLECTION, groupId, 'matches', matchDoc.id, 'votes'));
        legacyVotesSnap.forEach(v => batch.delete(v.ref));

        // Deletar a partida em si
        batch.delete(matchDoc.ref);
      }

      // 3. Deletar o documento do Grupo
      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      batch.delete(groupRef);

      // Executar tudo
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

// --- EXPORTS DIRETOS ---

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