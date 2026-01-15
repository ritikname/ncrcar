
import React, { useState, useEffect, useRef } from 'react';
import { Car, UserProfile, Booking } from '../types';

interface BookingModalProps {
  car: Car | null;
  isOpen: boolean;
  userProfile: UserProfile | null;
  paymentQrCode?: string;
  existingBookings: Booking[];
  prefillDates?: { start: string, end: string };
  onClose: () => void;
  onConfirm: (bookingData: any) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  car, isOpen, userProfile, paymentQrCode, existingBookings, prefillDates, onClose, onConfirm 
}) => {
  // Step 1 State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [email, setEmail] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [aadharPhone, setAadharPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  const [days, setDays] = useState(0);
  const [availabilityError, setAvailabilityError] = useState('');
  
  // Step 2 State
  const [transactionId, setTransactionId] = useState('');

  // Step 3 State (KYC)
  const [aadharFront, setAadharFront] = useState<string | null>(null);
  const [aadharBack, setAadharBack] = useState<string | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);
  const [securityDepositType, setSecurityDepositType] = useState('₹5,000 Cash');
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomerName(userProfile?.name || '');
      setCustomerPhone(userProfile?.phone || '');
      setEmail('');
      setUserLocation('');
      setAadharPhone('');
      setAltPhone('');
      setStartDate(prefillDates?.start || '');
      setEndDate(prefillDates?.end || '');
      setTotalCost(0);
      setDays(0);
      setTransactionId('');
      setAadharFront(null);
      setAadharBack(null);
      setLicensePhoto(null);
      setSecurityDepositType('₹5,000 Cash');
      setStep(1);
      setIsProcessing(false);
      setAvailabilityError('');
    }
  }, [isOpen, userProfile, prefillDates]);

  // Geolocation Handler
  const handleDetectLocation = () => {
    setLocLoading(true);
    setUserLocation("Triangulating precise location...");
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      setUserLocation("");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // 7 decimal places allows for ~1cm precision, sufficient for "exact location"
        const preciseCoords = `${latitude.toFixed(7)}, ${longitude.toFixed(7)}`;
        
        // Attempt to get a readable address to append to coordinates
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          if (data && data.display_name) {
             // Simplify address for demo
             const parts = data.display_name.split(',').slice(0, 3).join(',');
             // Format: "Address [Lat, Long]"
             setUserLocation(`${parts} [${preciseCoords}]`);
          } else {
             setUserLocation(preciseCoords);
          }
        } catch (e) {
          // Fallback to just coordinates if fetch fails
          setUserLocation(preciseCoords);
        }
        
        setLocLoading(false);
      },
      (error) => {
        console.error("Location error:", error);
        
        let errorMsg = "Unable to fetch location.";
        switch(error.code) {
            case 1: // PERMISSION_DENIED
                errorMsg = "Permission denied. Please allow location access.";
                break;
            case 2: // POSITION_UNAVAILABLE
                errorMsg = "GPS signal unavailable.";
                break;
            case 3: // TIMEOUT
                errorMsg = "Location request timed out. Try being outdoors.";
                break;
        }

        alert(errorMsg);
        setUserLocation(""); 
        setLocLoading(false);
      },
      // High accuracy true for GPS
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Conflict Check
  const checkConflicts = (start: string, end: string) => {
    if (!car || !start || !end) return false;
    const totalStock = car.totalStock || 1;
    const conflictingBookings = existingBookings.filter(b => 
      b.carId === car.id &&
      b.status === 'confirmed' &&
      start <= b.endDate && b.startDate <= end
    );

    if (conflictingBookings.length >= totalStock) {
      setAvailabilityError(`Sold out for selected dates. (${conflictingBookings.length}/${totalStock} booked)`);
      return true;
    }
    setAvailabilityError('');
    return false;
  };

  // Cost Calculation
  useEffect(() => {
    if (startDate && endDate && car) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      if (dayCount > 0 && end >= start) {
        setDays(dayCount);
        setTotalCost(dayCount * car.pricePerDay);
        checkConflicts(startDate, endDate);
      } else {
        setDays(0);
        setTotalCost(0);
        setAvailabilityError('Invalid date range');
      }
    }
  }, [startDate, endDate, car]);

  const handleNext = () => {
    if (step === 1) {
        if (!startDate || !endDate || days <= 0 || !customerName || !customerPhone || !email || !userLocation || !aadharPhone || !altPhone) {
            alert("Please fill all contact details.");
            return;
        }
        if (checkConflicts(startDate, endDate)) return;
        setStep(2);
    } else if (step === 2) {
        if (!transactionId.trim()) {
            alert("Please enter Transaction ID.");
            return;
        }
        setStep(3); // Move to KYC
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aadharFront || !aadharBack || !licensePhoto) {
        alert("Please upload all required KYC documents.");
        return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      if (car) {
        onConfirm({
            carId: car.id,
            customerName,
            customerPhone,
            email,
            userLocation,
            aadharPhone,
            altPhone,
            startDate,
            endDate,
            totalCost,
            advanceAmount: totalCost * 0.10,
            transactionId,
            days,
            aadharFront,
            aadharBack,
            licensePhoto,
            securityDepositType
        });
      }
    }, 1500);
  };

  if (!isOpen || !car) return null;

  const advanceAmount = Math.round(totalCost * 0.10);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative h-20 bg-black flex items-center px-6 justify-between flex-shrink-0">
           <div>
             <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-0.5">Booking Step {step}/3</div>
             <div className="text-white text-lg font-bold">
                {step === 1 ? 'Trip & Contact Details' : step === 2 ? 'Secure Payment' : 'KYC & Security'}
             </div>
           </div>
           <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto p-6 scrollbar-hide">
            
            {step === 1 && (
                <div className="space-y-4">
                    {/* Car Summary */}
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <img src={car.imageBase64} className="w-16 h-16 object-cover rounded-lg" alt="car" />
                        <div>
                            <h4 className="font-bold text-gray-900">{car.name}</h4>
                            <div className="text-xs text-gray-500">₹{car.pricePerDay}/day • {days} Days</div>
                        </div>
                    </div>

                    {availabilityError && <div className="text-red-600 text-xs font-bold bg-red-50 p-2 rounded">{availabilityError}</div>}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pick-up</label>
                            <input type="date" min={new Date().toISOString().split('T')[0]} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Return</label>
                            <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                    </div>

                    {/* Extended Contact Details */}
                    <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                             <input type="text" placeholder="Name" value={customerName} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm" />
                             <input type="text" placeholder="Phone" value={customerPhone} readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm" />
                        </div>
                        <input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        
                        <div className="flex gap-2">
                            <input type="text" placeholder="Exact Location & Coordinates" value={userLocation} onChange={(e) => setUserLocation(e.target.value)} disabled={locLoading} className={`w-full px-3 py-2 border rounded-lg text-sm ${locLoading ? 'bg-gray-50 text-gray-500' : 'bg-white'}`} />
                            <button onClick={handleDetectLocation} disabled={locLoading} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1">
                                {locLoading ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                    Triangulating
                                  </>
                                ) : '📍 Fetch GPS'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                             <input type="tel" placeholder="Aadhar Reg. Phone" value={aadharPhone} onChange={(e) => setAadharPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                             <input type="tel" placeholder="Alternative Contact" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                    </div>  
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Total Trip Cost ({days} days)</span>
                            <span className="line-through">₹{totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-red-900">Advance (10%)</span>
                            <span className="font-bold text-2xl text-red-600">₹{advanceAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">Scan QR to Pay Advance</p>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 inline-block bg-white">
                            {paymentQrCode ? <img src={paymentQrCode} alt="Payment QR" className="w-48 h-48 object-contain" /> : <div className="w-48 h-48 flex items-center justify-center text-xs">No QR</div>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Transaction ID / UTR</label>
                        <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-mono text-center uppercase" placeholder="UPI123456" />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-5">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-xs font-medium">
                        Almost done! Please upload documents for verification and select your security deposit preference.
                    </div>

                    <div className="space-y-4">
                        {/* Security Deposit */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Security Deposit Type</label>
                            <select 
                                value={securityDepositType} 
                                onChange={(e) => setSecurityDepositType(e.target.value)} 
                                className="w-full px-3 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-red-600"
                            >
                                <option value="₹5,000 Cash">₹5,000 Cash</option>
                                <option value="Laptop">Laptop</option>
                                <option value="2-Wheeler">2-Wheeler</option>
                                <option value="Passport">Passport</option>
                            </select>
                        </div>

                        {/* File Uploads */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Aadhar Front</label>
                                <div className="relative h-24 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                                    {aadharFront ? <img src={aadharFront} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">+ Upload</span>}
                                    <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => handleFileChange(e, setAadharFront)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Aadhar Back</label>
                                <div className="relative h-24 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                                    {aadharBack ? <img src={aadharBack} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">+ Upload</span>}
                                    <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => handleFileChange(e, setAadharBack)} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Driver's License</label>
                            <div className="relative h-24 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                                {licensePhoto ? <img src={licensePhoto} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">+ Upload</span>}
                                <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => handleFileChange(e, setLicensePhoto)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 mt-auto bg-gray-50">
            {step < 3 ? (
                <button 
                    onClick={handleNext}
                    disabled={step === 1 ? (days <= 0 || !!availabilityError) : (!transactionId)}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${((step === 1 && days <= 0) || (step === 2 && !transactionId)) ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {step === 1 ? (availabilityError || `Proceed to Payment (₹${advanceAmount})`) : 'Verify & Proceed to KYC'}
                </button>
            ) : (
                <button 
                    onClick={handleFinalSubmit}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                >
                    {isProcessing ? 'Confirming...' : 'Submit Booking'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
