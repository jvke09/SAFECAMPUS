import { UserRole } from '../types';

/**
 * Generates a consistent avatar URL based on a seed string and user role.
 * Uses DiceBear API for high-quality illustrations.
 * 
 * @param seed - The unique string to generate the avatar from (e.g., user ID or name)
 * @param role - The user role to determine the avatar style
 * @returns The URL of the generated avatar
 */
export const getDefaultAvatarUrl = (seed: string, role: UserRole = UserRole.STUDENT): string => {
  // Style selection:
  // - Students: 'adventurer' (playful, character-based, RPG-like)
  // - Parents: 'micah' (clean, modern, artistic, professional)
  // - Admin: 'micah' (consistent with adults)
  
  const style = role === UserRole.STUDENT ? 'adventurer' : 'micah';
  
  // Encode seed to ensure it's URL safe
  const encodedSeed = encodeURIComponent(seed);
  
  // Return the DiceBear API URL
  // Using 9.x version for latest assets
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodedSeed}`;
};
