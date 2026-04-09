import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { addHours, isAfter, isBefore } from "date-fns";

export function getVotingStatus(matchDate: string, matchTime: string) {
  if (!matchDate || !matchTime) {
    return { isOpen: false, isLocked: true, isExpired: false, startVoting: new Date(), endVoting: new Date() };
  }

  // Cria o objeto de data usando o formato ISO local (YYYY-MM-DDTHH:mm)
  // O parse do Date sem o "Z" no final assume o fuso horário da máquina do usuário
  const matchDateTime = new Date(`${matchDate}T${matchTime}:00`);
  const now = new Date();

  // Regra: Abre 1h depois do início
  const startVoting = addHours(matchDateTime, 1);
  // Regra: Fecha 48h depois de abrir
  const endVoting = addHours(startVoting, 48);

  const isLocked = isBefore(now, startVoting);
  const isOpen = isAfter(now, startVoting) && isBefore(now, endVoting);
  const isExpired = isAfter(now, endVoting);

  return { isOpen, isLocked, isExpired, startVoting, endVoting };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
