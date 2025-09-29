import React, { useState, useEffect } from 'react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    gender: '',
    address: '',
    phoneNumber: '',
    email: '',
    dateOfBirth: '',
    pincode: '',
    bloodGroup: '',
    conditions: '',
    allergies: '',
    medication: '',
    profileImage: ''
  });
  const [editingField, setEditingField] = useState('');

  // Check if user is logged in
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setIsLoggedIn(true);
      fetchUserProfile(userId);
    } else {
      // Redirect to login page
      window.location.href = '/login';
    }
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`/api/user/profile/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setProfileData(userData);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveField = async (field) => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await fetch(`/api/user/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: profileData[field]
        })
      });

      if (response.ok) {
        setEditingField('');
        alert('Field saved successfully!');
      }
    } catch (error) {
      console.error('Error saving field:', error);
    }
  };

  const handleSaveChanges = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await fetch(`/api/user/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Create a FormData object for file upload
      const formData = new FormData();
      formData.append('image', file);
      
      // For now, we'll use a local URL - you can implement proper file upload later
      const imageUrl = URL.createObjectURL(file);
      setProfileData(prev => ({
        ...prev,
        profileImage: imageUrl
      }));
    }
  };

  const handleRemoveImage = () => {
    setProfileData(prev => ({
      ...prev,
      profileImage: ''
    }));
  };

  const validateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const handleDateChange = (value) => {
    if (validateAge(value)) {
      handleInputChange('dateOfBirth', value);
    } else {
      alert('You must be 18 or older to use this service.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="loading-container">
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-content">
          
          {/* Profile Image Section */}
          <div className="profile-image-section">
            <div className="profile-image-wrapper">
              <img 
                src={profileData.profileImage || '/images/defaultimage.png'} 
                alt="Profile"
                className="profile-image"
              />
            </div>
            
            <div className="upload-section">
              <label className="upload-button">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Upload Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="file-input"
                />
              </label>
              {profileData.profileImage && (
                <button onClick={handleRemoveImage} className="remove-image-btn">
                  <svg className="remove-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Remove Image
                </button>
              )}
            </div>
          </div>

          {/* Form Fields in Two Columns */}
          <div className="form-grid">
            
            {/* Left Column */}
            <div className="form-column">
              
              {/* Full Name */}
              <div className="form-field">
                <label className="field-label">Full Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={editingField !== 'fullName' && !isEditing}
                    className={`form-input ${editingField === 'fullName' || isEditing ? 'editable' : 'disabled'}`}
                    placeholder="Enter your full name"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('fullName')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'fullName' && (
                  <button
                    onClick={() => handleSaveField('fullName')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Address */}
              <div className="form-field">
                <label className="field-label">Address</label>
                <div className="input-wrapper">
                  <textarea
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={editingField !== 'address' && !isEditing}
                    rows="3"
                    className={`form-textarea ${editingField === 'address' || isEditing ? 'editable' : 'disabled'}`}
                    placeholder="Enter your address"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('address')}
                      className="edit-button textarea-edit"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'address' && (
                  <button
                    onClick={() => handleSaveField('address')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Phone Number */}
              <div className="form-field">
                <label className="field-label">Phone Number</label>
                <div className="input-wrapper">
                  <div className="phone-input-container">
                    <span className="country-code">+91</span>
                    <input
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      disabled={editingField !== 'phoneNumber' && !isEditing}
                      className={`form-input phone-input ${editingField === 'phoneNumber' || isEditing ? 'editable' : 'disabled'}`}
                      placeholder="Enter phone number"
                      maxLength="10"
                    />
                    {!isEditing && (
                      <button
                        onClick={() => setEditingField('phoneNumber')}
                        className="edit-button"
                      >
                        <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {editingField === 'phoneNumber' && (
                  <button
                    onClick={() => handleSaveField('phoneNumber')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Conditions */}
              <div className="form-field">
                <label className="field-label">Medical Conditions</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={profileData.conditions}
                    onChange={(e) => handleInputChange('conditions', e.target.value)}
                    disabled={editingField !== 'conditions' && !isEditing}
                    className={`form-input ${editingField === 'conditions' || isEditing ? 'editable' : 'disabled'}`}
                    placeholder="Enter medical conditions"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('conditions')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'conditions' && (
                  <button
                    onClick={() => handleSaveField('conditions')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Allergies */}
              <div className="form-field">
                <label className="field-label">Allergies</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={profileData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    disabled={editingField !== 'allergies' && !isEditing}
                    className={`form-input ${editingField === 'allergies' || isEditing ? 'editable' : 'disabled'}`}
                    placeholder="Enter allergies"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('allergies')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'allergies' && (
                  <button
                    onClick={() => handleSaveField('allergies')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Medication */}
              <div className="form-field">
                <label className="field-label">Current Medication</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={profileData.medication}
                    onChange={(e) => handleInputChange('medication', e.target.value)}
                    disabled={editingField !== 'medication' && !isEditing}
                    className={`form-input ${editingField === 'medication' || isEditing ? 'editable' : 'disabled'}`}
                    placeholder="Enter current medications"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('medication')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'medication' && (
                  <button
                    onClick={() => handleSaveField('medication')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="form-column">
              
              {/* Gender */}
              <div className="form-field">
                <label className="field-label">Gender</label>
                <div className="input-wrapper">
                  <select
                    value={profileData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    disabled={editingField !== 'gender' && !isEditing}
                    className={`form-select ${editingField === 'gender' || isEditing ? 'editable' : 'disabled'}`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="-">-</option>
                  </select>
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('gender')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'gender' && (
                  <button
                    onClick={() => handleSaveField('gender')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Date of Birth */}
              <div className="form-field">
                <label className="field-label">Date of Birth</label>
                <div className="input-wrapper">
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => handleDateChange(e.target.value)}
                    disabled={editingField !== 'dateOfBirth' && !isEditing}
                    className={`form-input ${editingField === 'dateOfBirth' || isEditing ? 'editable' : 'disabled'}`}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('dateOfBirth')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'dateOfBirth' && (
                  <button
                    onClick={() => handleSaveField('dateOfBirth')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Pincode */}
              <div className="form-field">
                <label className="field-label">Pincode</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={profileData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    disabled={editingField !== 'pincode' && !isEditing}
                    className={`form-input ${editingField === 'pincode' || isEditing ? 'editable' : 'disabled'}`}
                    placeholder="Enter pincode"
                    maxLength="6"
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('pincode')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'pincode' && (
                  <button
                    onClick={() => handleSaveField('pincode')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>

              {/* Blood Group */}
              <div className="form-field">
                <label className="field-label">Blood Group</label>
                <div className="input-wrapper">
                  <select
                    value={profileData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    disabled={editingField !== 'bloodGroup' && !isEditing}
                    className={`form-select ${editingField === 'bloodGroup' || isEditing ? 'editable' : 'disabled'}`}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  {!isEditing && (
                    <button
                      onClick={() => setEditingField('bloodGroup')}
                      className="edit-button"
                    >
                      <svg className="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingField === 'bloodGroup' && (
                  <button
                    onClick={() => handleSaveField('bloodGroup')}
                    className="save-field-btn"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              onClick={handleSaveChanges}
              className="save-changes-btn"
            >
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="edit-profile-btn"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;