
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AddCarForm from './components/AddCarForm';
import CarCard from './components/CarCard';
import Hero from './components/Hero';
import DriftingLoader from './components/DriftingLoader';
import HowItWorksModal from './components/HowItWorksModal';
import BookingModal from './components/BookingModal';
import OwnerBookings from './components/OwnerBookings';
import UserOnboardingModal from './components/UserOnboardingModal';
import OwnerSettings from './components/OwnerSettings';
import OwnerUsersList from './components/OwnerUsersList';
import GalleryModal from './components/GalleryModal';
import Toast from './components/Toast';
import { Car, ViewMode, CarStatus, Booking, UserProfile, CarCategory, HeroSlide, FuelType } from './types';
import { 
  getStoredCars, saveCars, 
  getStoredViewMode, saveViewMode, 
  getStoredBookings, saveBookings,
  getUserProfile, saveUserProfile,
  getOwnerSettings, saveOwnerSettings,
  getAllUsers, addUserToRegistry
} from './services/storage';
import { triggerAllNotifications } from './services/notification'; // Import Notification Service

const LOCATIONS = ['Hauzkhas Metro, Delhi', 'Kaushambi Metro, Delhi', 'Shiv Vihar Metro, Delhi'];

const isDateOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  return start1 <= end2 && start2 <= end1;
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('customer');
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<(UserProfile & { joinedAt: number })[]>([]);
  
  // Settings & Slides
  const [paymentQrCode, setPaymentQrCode] = useState<string | undefined>(undefined);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);

  const [loadingPhase, setLoadingPhase] = useState<'drift' | 'data' | 'ready'>('drift');
  
  // Search/Filter State
  const [searchDates, setSearchDates] = useState<{start: string, end: string}>({ start: '', end: '' });
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  
  // Top Bar Filters
  const [selectedCategory, setSelectedCategory] = useState<CarCategory>('All');
  const [selectedSeats, setSelectedSeats] = useState<number | 'All'>('All');
  const [selectedFuel, setSelectedFuel] = useState<FuelType | 'All'>('All');

  const [isSearchActive, setIsSearchActive] = useState(false); 

  // Modals & UI State
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedCarForBooking, setSelectedCarForBooking] = useState<Car | null>(null);
  const [galleryCar, setGalleryCar] = useState<Car | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [ownerTab, setOwnerTab] = useState<'fleet' | 'bookings' | 'users' | 'settings'>('fleet');

  // Load initial data
  useEffect(() => {
    const loadedCars = getStoredCars();
    const loadedViewMode = getStoredViewMode();
    const loadedBookings = getStoredBookings();
    const loadedProfile = getUserProfile();
    const loadedSettings = getOwnerSettings();
    const loadedAllUsers = getAllUsers();
    
    setTimeout(() => {
       setCars(loadedCars);
       setBookings(loadedBookings);
       setViewMode(loadedViewMode);
       setUserProfile(loadedProfile);
       setAllUsers(loadedAllUsers);
       setPaymentQrCode(loadedSettings.paymentQrCode);
       setHeroSlides(loadedSettings.heroSlides || []);
       setLoadingPhase('ready');

       if (!loadedProfile) {
         setTimeout(() => {
            setIsOnboardingOpen(true);
         }, 800);
       }
    }, 2800); 
  }, []);

  const handleToggleView = (mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
    if (mode === 'owner') setOwnerTab('fleet');
  };

  const handleUserOnboarding = (name: string, phone: string) => {
    const profile = { name, phone };
    setUserProfile(profile);
    saveUserProfile(profile);
    const updatedUserList = addUserToRegistry(profile);
    setAllUsers(updatedUserList);
    setIsOnboardingOpen(false);
    showToast(`Welcome, ${name}!`);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleAddCar = (newCarData: Omit<Car, 'id' | 'createdAt'>) => {
    const newCar: Car = {
      ...newCarData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const updatedCars = [newCar, ...cars];
    setCars(updatedCars);
    saveCars(updatedCars);
    showToast('Vehicle added to fleet successfully!');
  };

  const handleEditStock = (id: string) => {
    const car = cars.find(c => c.id === id);
    if (!car) return;
    const currentStock = car.totalStock || 1;
    const input = window.prompt(`Enter new total stock for ${car.name}:`, String(currentStock));
    if (input !== null) {
        const val = parseInt(input, 10);
        if (!isNaN(val) && val >= 0) {
            const updatedCars = cars.map(c => c.id === id ? {...c, totalStock: val} : c);
            setCars(updatedCars);
            saveCars(updatedCars);
            showToast('Stock quantity updated', 'success');
        } else {
            showToast('Invalid stock number.', 'error');
        }
    }
  };

  const handleToggleStatus = (id: string, currentStatus: CarStatus) => {
    const updatedCars = cars.map(car => 
      car.id === id 
        ? { ...car, status: (currentStatus === 'available' ? 'sold' : 'available') as CarStatus } 
        : car
    );
    setCars(updatedCars);
    saveCars(updatedCars);
    showToast('Stock status updated manually', 'info');
  };

  const handleDelete = (id: string) => {
    const updatedCars = cars.filter(car => car.id !== id);
    setCars(updatedCars);
    saveCars(updatedCars);
    showToast('Vehicle removed from fleet', 'info');
  };

  const handleBookingConfirm = async (bookingData: any) => {
    setSelectedCarForBooking(null);
    const bookedCar = cars.find(c => c.id === bookingData.carId);
    if (bookedCar) {
      const newBooking: Booking = {
        ...bookingData,
        id: crypto.randomUUID(),
        carImage: bookedCar.imageBase64,
        carName: bookedCar.name,
        location: selectedLocation || 'N/A', 
        status: 'confirmed',
        isApproved: false, // Default to not approved
        createdAt: Date.now()
      };
      const updatedBookings = [newBooking, ...bookings];
      setBookings(updatedBookings);
      saveBookings(updatedBookings);
      
      showToast(`Booking Submitted! Waiting for Owner Approval.`, 'success');
      
      // NOTE: Notifications are NOT triggered here anymore.
      // They are triggered in handleApproveBooking
    }
  };

  // New Function for Owner to Approve
  const handleApproveBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (booking.isApproved) {
        showToast("Booking is already approved.", 'info');
        return;
    }

    // 1. Update state
    const updatedBookings = bookings.map(b => 
        b.id === bookingId ? { ...b, isApproved: true } : b
    );
    setBookings(updatedBookings);
    saveBookings(updatedBookings);

    showToast("Booking Approved. Sending Emails...", 'success');

    // 2. Trigger Notifications (Email + WA link)
    const waLink = await triggerAllNotifications(booking);

    if(waLink && window.confirm("Email Sent! Open WhatsApp to send confirmation msg?")) {
         window.open(waLink, '_blank');
    }
  };

  const handleRejectBooking = (bookingId: string) => {
    const updatedBookings = bookings.map(b => 
      b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
    );
    setBookings(updatedBookings);
    saveBookings(updatedBookings);
    showToast('Booking rejected.', 'info');
  };

  const handleSaveOwnerSettings = (qrCode: string) => {
    setPaymentQrCode(qrCode);
    const settings = getOwnerSettings();
    saveOwnerSettings({ ...settings, paymentQrCode: qrCode });
    showToast('Payment settings updated!');
  };

  const handleSaveHeroSlides = (slides: HeroSlide[]) => {
    setHeroSlides(slides);
    const settings = getOwnerSettings();
    saveOwnerSettings({ ...settings, heroSlides: slides });
    showToast('Hero slides updated!');
  };

  const calculateBookedCount = (carId: string) => {
    const checkStart = searchDates.start || new Date().toISOString().split('T')[0];
    const checkEnd = searchDates.end || checkStart;
    return bookings.filter(b => 
      b.carId === carId && 
      b.status === 'confirmed' &&
      isDateOverlap(checkStart, checkEnd, b.startDate, b.endDate)
    ).length;
  };

  // Advanced Filter Logic
  const filteredCars = cars.filter(car => {
    const catMatch = selectedCategory === 'All' || car.category === selectedCategory;
    const seatMatch = selectedSeats === 'All' || car.seats === selectedSeats;
    const fuelMatch = selectedFuel === 'All' || car.fuelType === selectedFuel;
    return catMatch && seatMatch && fuelMatch;
  });

  const handleSearch = () => {
    if(!searchDates.start || !searchDates.end) {
        showToast('Please select dates first', 'error');
        return;
    }
    if(!selectedLocation) {
        showToast('Please select a location', 'error');
        return;
    }
    setIsSearchActive(true);
    setTimeout(() => {
        document.getElementById('car-results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (loadingPhase === 'drift') return <DriftingLoader />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900 overflow-x-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <UserOnboardingModal isOpen={isOnboardingOpen} onComplete={handleUserOnboarding} />
      <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} />
      
      <GalleryModal 
        isOpen={!!galleryCar} 
        images={galleryCar ? (galleryCar.galleryImages?.length ? galleryCar.galleryImages : [galleryCar.imageBase64]) : []} 
        title={galleryCar?.name || ''}
        onClose={() => setGalleryCar(null)}
      />

      <BookingModal 
        isOpen={!!selectedCarForBooking} 
        car={selectedCarForBooking}
        userProfile={userProfile}
        paymentQrCode={paymentQrCode}
        existingBookings={bookings} 
        prefillDates={searchDates} 
        onClose={() => setSelectedCarForBooking(null)} 
        onConfirm={handleBookingConfirm}
      />

      <Header viewMode={viewMode} onToggleView={handleToggleView} />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {viewMode === 'customer' ? (
          <>
            {!isSearchActive ? (
                /* LANDING / SEARCH STATE */
                <div className="animate-fade-in space-y-8">
                    <Hero onBrowseFleet={() => document.getElementById('search-panel')?.scrollIntoView({behavior:'smooth'})} onShowHowItWorks={() => setIsHowItWorksOpen(true)} slides={heroSlides} />
                    
                    <div id="search-panel" className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 max-w-4xl mx-auto relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-bl-full -z-0 opacity-50"></div>
                        
                        <h2 className="text-2xl font-black text-gray-900 mb-6 relative z-10 uppercase italic">Start Your Journey</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            {/* Date Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-500 uppercase">1. Select Dates</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        min={new Date().toISOString().split('T')[0]}
                                        value={searchDates.start}
                                        onChange={(e) => setSearchDates(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
                                    />
                                    <span className="text-gray-400 font-bold">to</span>
                                    <input 
                                        type="date" 
                                        min={searchDates.start || new Date().toISOString().split('T')[0]}
                                        value={searchDates.end}
                                        onChange={(e) => setSearchDates(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Location Selection Dropdown */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-500 uppercase">2. Select Location</label>
                                <select 
                                    value={selectedLocation} 
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
                                >
                                    <option value="" disabled>Select Pickup Point</option>
                                    {LOCATIONS.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end relative z-10">
                            <button 
                                onClick={handleSearch}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-xl shadow-lg shadow-red-500/30 transition-all transform hover:scale-105 uppercase tracking-wider"
                            >
                                Find Cars
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* RESULTS STATE */
                <div id="car-results" className="animate-fade-in">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                        <div>
                            <button onClick={() => setIsSearchActive(false)} className="text-sm text-red-600 font-bold hover:underline mb-1 uppercase tracking-wide">← Back to Search</button>
                            <h2 className="text-3xl font-black text-gray-900 uppercase italic">Available Cars in {selectedLocation}</h2>
                            <p className="text-gray-500 font-medium">
                                {new Date(searchDates.start).toLocaleDateString()} - {new Date(searchDates.end).toLocaleDateString()}
                                <span className="mx-2">•</span>
                                {filteredCars.length} vehicles found
                            </p>
                        </div>
                    </div>

                    {/* TOP FILTERS */}
                    <div className="flex flex-wrap gap-4 mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center">
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mr-2">Filters:</span>
                        
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value as CarCategory)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 outline-none"
                        >
                            <option value="All">All Categories</option>
                            <option value="Hatchback">Hatchback</option>
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV</option>
                        </select>

                        <select 
                            value={selectedSeats} 
                            onChange={(e) => setSelectedSeats(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 outline-none"
                        >
                            <option value="All">All Seats</option>
                            <option value={4}>4 Seater</option>
                            <option value={5}>5 Seater</option>
                            <option value={7}>7 Seater</option>
                        </select>

                        <select 
                            value={selectedFuel} 
                            onChange={(e) => setSelectedFuel(e.target.value as FuelType | 'All')}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 outline-none"
                        >
                            <option value="All">All Fuel Types</option>
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>

                         <button 
                            onClick={() => { setSelectedCategory('All'); setSelectedSeats('All'); setSelectedFuel('All'); }}
                            className="text-red-600 text-xs font-bold hover:underline ml-auto"
                        >
                            Reset Filters
                        </button>
                    </div>

                    {filteredCars.length === 0 ? (
                        <div className="text-center py-24">
                             <h3 className="text-xl font-bold text-gray-900">No cars found matching filters.</h3>
                             <button onClick={() => { setSelectedCategory('All'); setSelectedSeats('All'); setSelectedFuel('All'); }} className="text-red-600 mt-2 font-bold">Clear Filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                            {filteredCars.map((car, index) => {
                                const bookedCount = calculateBookedCount(car.id);
                                return (
                                    <CarCard
                                        key={car.id}
                                        car={car}
                                        viewMode={viewMode}
                                        bookedCount={bookedCount}
                                        onToggleStatus={handleToggleStatus}
                                        onDelete={handleDelete}
                                        onBook={setSelectedCarForBooking}
                                        onEditStock={handleEditStock}
                                        onViewGallery={setGalleryCar}
                                        index={index}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
          </>
        ) : (
          /* OWNER VIEW */
          <>
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 animate-fade-in">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight sm:text-4xl mb-2 uppercase italic">
                   <span className="text-red-600">Fleet</span> Management
                </h1>
                <p className="text-lg text-slate-500 font-medium">Manage stock and bookings.</p>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                  <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex items-center">
                    <button onClick={() => setOwnerTab('fleet')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${ownerTab === 'fleet' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Inventory</button>
                    <button onClick={() => setOwnerTab('bookings')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${ownerTab === 'bookings' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                      Bookings
                      {bookings.filter(b => b.status === 'confirmed').length > 0 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px]">{bookings.filter(b => b.status === 'confirmed').length}</span>}
                    </button>
                    <button onClick={() => setOwnerTab('users')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${ownerTab === 'users' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Users</button>
                    <button onClick={() => setOwnerTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${ownerTab === 'settings' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Settings</button>
                  </div>
              </div>
            </div>

            {ownerTab === 'fleet' && (
              <>
                <AddCarForm onAddCar={handleAddCar} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                    {cars.map((car, index) => (
                        <CarCard
                            key={car.id}
                            car={car}
                            viewMode={viewMode}
                            bookedCount={calculateBookedCount(car.id)}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDelete}
                            onBook={setSelectedCarForBooking}
                            onEditStock={handleEditStock}
                            onViewGallery={setGalleryCar}
                            index={index}
                        />
                    ))}
                </div>
              </>
            )}
            {ownerTab === 'bookings' && <OwnerBookings bookings={bookings} onReject={handleRejectBooking} onApprove={handleApproveBooking} />}
            {ownerTab === 'users' && <OwnerUsersList users={allUsers} />}
            {ownerTab === 'settings' && <OwnerSettings currentQrCode={paymentQrCode} heroSlides={heroSlides} onSave={handleSaveOwnerSettings} onSaveSlides={handleSaveHeroSlides} />}
          </>
        )}

      </main>

      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col leading-none select-none scale-75 origin-left">
                <span className="text-2xl font-black text-red-600 tracking-tighter transform -skew-x-6">NCR</span>
                <span className="text-2xl font-black text-black tracking-tighter transform -skew-x-6 -mt-2">DRIVE</span>
            </div>
            <span className="font-bold text-gray-800 hidden">Delhi NCR Car Rentals</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Demo Project.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
