import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { ArrowLeft, Camera, Save, User as UserIcon, BookOpen, Hash, Briefcase, HeartHandshake } from 'lucide-react';
import { getDefaultAvatarUrl } from '../utils/avatarUtils';

interface EditProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({ user, onUpdate }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const isParent = user.role === UserRole.PARENT;
  const [grade, setGrade] = useState(user.grade || '');
  const [section, setSection] = useState(user.section || '');
  const [occupation, setOccupation] = useState(user.occupation || '');
  const [relationship, setRelationship] = useState(user.relationship || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [previewUrl, setPreviewUrl] = useState(user.avatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [relationshipError, setRelationshipError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!isValidType) {
      setPhotoError('Please upload a JPG or PNG image.');
      return;
    }

    if (file.size > maxSizeBytes) {
      setPhotoError('Image must be 5MB or smaller.');
      return;
    }

    setPhotoError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Full name is required.');
      hasError = true;
    } else if (trimmedName.length > 50) {
      setNameError('Full name must be 50 characters or fewer.');
      hasError = true;
    } else {
      setNameError('');
    }

    if (isParent) {
      if (!relationship) {
        setRelationshipError('Please select your relationship.');
        hasError = true;
      } else {
        setRelationshipError('');
      }
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    // Simulate network delay for effect
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        name: trimmedName,
        grade: isParent ? user.grade : grade,
        section: isParent ? user.section : section,
        avatarUrl,
        occupation: isParent ? occupation : user.occupation,
        relationship: isParent ? relationship : user.relationship
      };

      onUpdate(updatedUser);
      setIsLoading(false);
      navigate('/profile');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Edit Profile</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <form onSubmit={handleSubmit} className="p-6 max-w-lg mx-auto space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 relative">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={getDefaultAvatarUrl(name || user.id, user.role)}
                  alt="Default Avatar" 
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white drop-shadow-md" size={32} />
              </div>
            </div>
            
            <button 
              type="button"
              className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-full shadow-lg border-4 border-slate-50 hover:bg-blue-700 transition-colors"
            >
              <Camera size={18} />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/png" 
              className="hidden" 
            />
          </div>
          <p className="mt-4 text-sm text-slate-500 font-medium">Tap to change photo</p>
          {photoError && (
            <p className="mt-2 text-xs text-red-500 font-medium">{photoError}</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon size={18} />
              </div>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                placeholder="Enter your full name"
                maxLength={50}
              />
            </div>
            {nameError && (
              <p className="text-xs text-red-500 font-medium ml-1 mt-1">{nameError}</p>
            )}
          </div>

          {isParent ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Occupation</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Briefcase size={18} />
                  </div>
                  <input
                    type="text"
                    value={occupation}
                    onChange={e => setOccupation(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    placeholder="e.g. Engineer, Business Owner"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Business Owner', 'Engineer', 'Teacher', 'Nurse', 'Government Employee'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setOccupation(option)}
                      className="px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 active:scale-95 transition"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Relationship to student</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <HeartHandshake size={18} />
                  </div>
                  <select
                    value={relationship}
                    onChange={e => setRelationship(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Select relationship</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {relationshipError && (
                  <p className="text-xs text-red-500 font-medium ml-1 mt-1">{relationshipError}</p>
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Grade Level</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <BookOpen size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={grade} 
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Section</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Hash size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={section} 
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    placeholder="e.g. Newton"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
