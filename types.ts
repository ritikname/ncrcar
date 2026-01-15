
export type ViewMode = 'customer' | 'owner';

export type CarStatus = 'available' | 'sold';

export type FuelType = 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
export type Transmission = 'Automatic' | 'Manual';
export type CarCategory = 'All' | 'SUV' | 'Sedan' | 'Hatchback';

export interface Car {
  id: string;
  name: string;
  pricePerDay: number;
  imageBase64: string; // Main Thumbnail
  galleryImages: string[]; // Additional photos
  status: CarStatus;
  createdAt: number;
  
  fuelType: FuelType;
  transmission: Transmission;
  seats: number;
  rating: number; // 1-5
  totalStock: number; 
  category: CarCategory; 
}

export interface Booking {
  id: string;
  carId: string;
  carName: string;
  carImage: string;
  customerName: string;
  customerPhone: string;
  // New Contact Fields
  email: string;
  userLocation: string; // Geolocation
  aadharPhone: string;
  altPhone: string;
  
  startDate: string;
  endDate: string;
  totalCost: number;
  advanceAmount: number;
  transactionId: string;
  days: number;
  location: string; 
  createdAt: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  
  // Approval Flag
  isApproved?: boolean;
  
  // KYC & Deposit Fields
  aadharFront?: string;
  aadharBack?: string;
  licensePhoto?: string;
  securityDepositType?: string; // Changed from literal union to string to match '₹5,000 Cash'
  securityDepositTransactionId?: string; // New field for deposit UTR
  
  // Legal
  signature?: string; // Base64 signature image
}

export interface UserProfile {
  name: string;
  phone: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

export interface OwnerSettings {
  paymentQrCode?: string;
  heroSlides?: HeroSlide[];
}
