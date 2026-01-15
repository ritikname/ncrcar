
import React, { useState, useRef } from 'react';
import { Car, FuelType, Transmission, CarCategory } from '../types';

interface AddCarFormProps {
  onAddCar: (car: Omit<Car, 'id' | 'createdAt'>) => void;
}

const AddCarForm: React.FC<AddCarFormProps> = ({ onAddCar }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]); // New for multi-upload
  const [imageUrl, setImageUrl] = useState(''); 
  
  const [fuelType, setFuelType] = useState<FuelType>('Petrol');
  const [transmission, setTransmission] = useState<Transmission>('Manual');
  const [category, setCategory] = useState<CarCategory>('Hatchback'); // New field
  const [seats, setSeats] = useState<number>(5);
  const [rating, setRating] = useState<string>('4.5');
  const [totalStock, setTotalStock] = useState<string>('1');

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Main Image Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageUrl(''); 
    };
    reader.readAsDataURL(file);
  };

  // Gallery Handler
  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: string[] = [];
    
    // Convert all to base64
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const result = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            newImages.push(result);
        }
    }
    setGalleryPreviews([...galleryPreviews, ...newImages]);
  };

  const removeGalleryImage = (index: number) => {
      setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUrlBlur = () => {
      if(imageUrl.trim()) {
          setImagePreview(imageUrl);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !imagePreview || !totalStock) {
      alert('Please fill in all fields and provide at least the main image.');
      return;
    }

    onAddCar({
      name,
      pricePerDay: Number(price),
      imageBase64: imagePreview,
      galleryImages: galleryPreviews.length > 0 ? galleryPreviews : [imagePreview], // Use main image as fallback gallery if empty
      status: 'available',
      fuelType,
      transmission,
      category,
      seats: Number(seats),
      rating: Number(rating),
      totalStock: Number(totalStock),
    });

    // Reset form
    setName('');
    setPrice('');
    setImagePreview(null);
    setGalleryPreviews([]);
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    
    setFuelType('Petrol');
    setTransmission('Manual');
    setCategory('Hatchback');
    setSeats(5);
    setRating('4.5');
    setTotalStock('1');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-0"></div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center relative z-10">
        <span className="bg-red-600 text-white p-2.5 rounded-xl mr-3 shadow-lg shadow-red-600/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </span>
        Add Vehicle to Fleet
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Image Uploads */}
          <div className="lg:col-span-1 space-y-4">
             {/* Main Image */}
             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Main Thumbnail</label>
                <div
                    className={`border-2 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden group ${
                        isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {imagePreview ? (
                        <>
                        <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">Change Image</div>
                        </>
                    ) : (
                        <div className="space-y-2 p-4">
                            <span className="text-sm text-gray-500">Main Photo</span>
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                
                {/* URL Input */}
                <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => {
                             setImageUrl(e.target.value);
                             if (e.target.value.match(/^https?:\/\/.+/)) {
                                 setImagePreview(e.target.value);
                             }
                        }}
                        onBlur={handleUrlBlur}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 transition-all placeholder-gray-400"
                        placeholder="Or paste image URL"
                    />
                </div>
             </div>

             {/* Gallery Upload */}
             <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gallery Photos (Optional)</label>
                <div 
                    onClick={() => galleryInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors"
                >
                    <span className="text-xs text-red-600 font-bold">+ Upload Multiple</span>
                    <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryChange} />
                </div>
                
                {/* Gallery Previews */}
                {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {galleryPreviews.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                                <button 
                                    type="button"
                                    onClick={() => removeGalleryImage(idx)}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Right Column: Inputs */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Model Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                placeholder="e.g. Toyota Fortuner Legender"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as CarCategory)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="Hatchback">Hatchback</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Day</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                  placeholder="5000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Total Stock</label>
              <input
                type="number"
                min="1"
                value={totalStock}
                onChange={(e) => setTotalStock(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                placeholder="1"
                required
              />
            </div>

            {/* Specs Grid */}
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fuel</label>
                <select 
                  value={fuelType} 
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option>Petrol</option>
                  <option>Diesel</option>
                  <option>Electric</option>
                  <option>Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trans.</label>
                <select 
                  value={transmission} 
                  onChange={(e) => setTransmission(e.target.value as Transmission)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option>Manual</option>
                  <option>Automatic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seats</label>
                <select 
                  value={seats} 
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value={2}>2 Seater</option>
                  <option value={4}>4 Seater</option>
                  <option value={5}>5 Seater</option>
                  <option value={7}>7 Seater</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
             <button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider text-sm"
            >
              Add Vehicle to Inventory
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddCarForm;
