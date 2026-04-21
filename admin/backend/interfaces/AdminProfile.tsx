// Admin Profile Interface for Admin Backend
export interface AdminProfile {
  uid: string;
  name: string;
  email: string;
  position?: string;
  photoURL?: string;
  phone?: string;
  company?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  createdAt?: number;
  updatedAt?: number;
}
