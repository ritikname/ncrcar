
import { Car, Booking } from '../types';
import { getStoredCars, saveCars, getStoredBookings, saveBookings, getAllUsers, addUserToRegistry } from './storage';

// Mock delay to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock User Session Management
const SESSION_KEY = 'ncr_drive_session_v1';
const ACCOUNTS_KEY = 'ncr_drive_accounts_v1';

const getSession = () => {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
};
const setSession = (user: any) => localStorage.setItem(SESSION_KEY, JSON.stringify(user));
const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const api = {
  auth: {
    me: async () => {
      await delay(500);
      const user = getSession();
      if (!user) throw new Error('Not logged in');
      return user;
    },
    login: async (creds: any) => {
      await delay(800);
      
      // Hardcoded Owner Credentials for Demo
      if (creds.email === 'admin@ncrdrive.com' && creds.password === 'admin123') {
         const user = { name: 'Owner', email: creds.email, role: 'owner', phone: '9999999999' };
         setSession(user);
         return { success: true, role: 'owner', user };
      }
      
      // Customer Login
      const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      const account = accounts.find((a: any) => a.email === creds.email && a.password === creds.password);
      
      if (account) {
         const user = { name: account.name, email: account.email, phone: account.phone, role: 'customer' };
         setSession(user);
         return { success: true, role: 'customer', user };
      }

      throw new Error('Invalid credentials');
    },
    signup: async (data: any) => {
       await delay(800);
       const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
       if (accounts.some((a: any) => a.email === data.email)) {
         throw new Error('Email already exists');
       }
       
       // Store new account
       accounts.push({ ...data, role: 'customer' });
       localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
       
       // Add to owner's user registry
       addUserToRegistry({ name: data.name, phone: data.phone });
       
       return { success: true };
    },
    logout: async () => {
       await delay(300);
       clearSession();
       return { success: true };
    },
    forgotPassword: async (email: string) => {
       await delay(600);
       return { message: 'If account exists, email sent.' };
    },
    resetPassword: async (data: any) => {
       await delay(600);
       // Mock password reset logic (success always for demo)
       return { success: true };
    },
  },
  cars: {
    getAll: async () => {
      await delay(600);
      return getStoredCars();
    },
    add: async (formData: FormData) => {
       await delay(1000);
       // Manually process FormData for local storage simulation
       const name = formData.get('name') as string;
       const price = Number(formData.get('price'));
       const fuelType = formData.get('fuelType');
       const transmission = formData.get('transmission');
       const category = formData.get('category');
       const seats = Number(formData.get('seats'));
       const totalStock = Number(formData.get('totalStock'));
       const rating = Number(formData.get('rating'));
       
       // Convert uploaded file to Base64
       const imageFile = formData.get('image') as File;
       let imageBase64 = '';
       if (imageFile) {
          try {
            imageBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
          } catch (e) {
            console.error("Image processing failed", e);
          }
       }

       const newCar: Car = {
          id: crypto.randomUUID(),
          name,
          pricePerDay: price,
          imageBase64: imageBase64 || 'https://via.placeholder.com/400x300?text=No+Image',
          galleryImages: [],
          status: 'available',
          createdAt: Date.now(),
          fuelType: fuelType as any,
          transmission: transmission as any,
          seats,
          rating: rating || 4.5,
          totalStock,
          category: category as any
       };

       const cars = getStoredCars();
       const updatedCars = [newCar, ...cars];
       saveCars(updatedCars);
       
       return { success: true, carId: newCar.id };
    },
  },
  bookings: {
    create: async (data: any) => {
      await delay(1000);
      const newBooking: Booking = {
         id: crypto.randomUUID(),
         createdAt: Date.now(),
         status: 'confirmed',
         isApproved: false,
         ...data
      };
      
      const bookings = getStoredBookings();
      saveBookings([newBooking, ...bookings]);
      return { success: true, bookingId: newBooking.id };
    },
    getMyBookings: async () => {
       await delay(500);
       const user = getSession();
       if (!user) throw new Error('Unauthorized');
       
       const allBookings = getStoredBookings();
       if (user.role === 'owner') {
          return allBookings;
       } else {
          return allBookings.filter(b => b.email === user.email || b.customerPhone === user.phone);
       }
    },
    updateStatus: async (id: string, updates: { status?: string, isApproved?: boolean }) => {
       await delay(400);
       const bookings = getStoredBookings();
       const index = bookings.findIndex(b => b.id === id);
       
       if (index !== -1) {
          if (updates.status) {
              bookings[index].status = updates.status as any;
          }
          if (updates.isApproved !== undefined) {
              bookings[index].isApproved = updates.isApproved;
          }
          saveBookings(bookings);
          return { success: true };
       }
       throw new Error('Booking not found');
    }
  }
};
