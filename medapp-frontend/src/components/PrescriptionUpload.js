import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './PrescriptionUpload.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const PrescriptionUpload = ({ userId, onUploadSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    doctorName: '',
    doctorRegNumber: '',
    issueDate: '',
    expiryDate: '',
    notes: ''
  });
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Calculate expiry date automatically (30 days from issue date)
  const handleIssueDateChange = (issueDate) => {
    setFormData({...formData, issueDate});
    
    if (issueDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(issue);
      expiry.setDate(expiry.getDate() + 30);
      
      // Format as YYYY-MM-DD for input
      const expiryFormatted = expiry.toISOString().split('T')[0];
      setFormData(prev => ({...prev, issueDate, expiryDate: expiryFormatted}));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, JPEG)');
        return;
      }

      setPrescriptionImage(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    // Check all required fields
    if (!prescriptionImage) {
      setError('Please upload a prescription image');
      return false;
    }

    if (!formData.doctorName || formData.doctorName.trim() === '') {
      setError('Doctor\'s name is required');
      return false;
    }

    if (!formData.doctorRegNumber || formData.doctorRegNumber.trim() === '') {
      setError('Doctor\'s registration number is required');
      return false;
    }

    if (!formData.issueDate) {
      setError('Prescription issue date is required');
      return false;
    }

    if (!formData.expiryDate) {
      setError('Prescription expiry date is required');
      return false;
    }

    // Validate issue date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const issueDate = new Date(formData.issueDate);
    issueDate.setHours(0, 0, 0, 0);

    if (issueDate > today) {
      setError('Issue date cannot be in the future');
      return false;
    }

    // Validate expiry date is after issue date
    const expiryDate = new Date(formData.expiryDate);
    if (expiryDate <= issueDate) {
      setError('Expiry date must be after issue date');
      return false;
    }

    // Validate prescription is not expired
    if (expiryDate < today) {
      setError('This prescription has already expired. Please get a new prescription.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    if (!validateForm()) {
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;

        try {
          const response = await fetch(`${API_BASE}/api/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              doctor_name: formData.doctorName.trim(),
              doctor_registration_number: formData.doctorRegNumber.trim(),
              issue_date: formData.issueDate,
              expiry_date: formData.expiryDate,
              prescription_image_url: base64Image,
              notes: formData.notes.trim() || null
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to upload prescription');
          }

          const data = await response.json();
          console.log('Prescription uploaded successfully:', data);
          
          if (onUploadSuccess) {
            onUploadSuccess(data.prescription);
          }
          
          // Reset form
          setFormData({
            doctorName: '',
            doctorRegNumber: '',
            issueDate: '',
            expiryDate: '',
            notes: ''
          });
          setPrescriptionImage(null);
          setImagePreview(null);
          
        } catch (err) {
          console.error('Error uploading prescription:', err);
          setError(err.message || 'Failed to upload prescription. Please try again.');
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read image file');
        setUploading(false);
      };

      reader.readAsDataURL(prescriptionImage);
      
    } catch (err) {
      console.error('Error in upload process:', err);
      setError('Failed to upload prescription. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="prescription-upload-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>📋 Upload Prescription</h2>
          {onClose && (
            <button className="close-modal-btn" onClick={onClose} type="button">
              ×
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="prescription-form">
          {/* Image Upload Section */}
          <div className="form-section">
            <h3>Prescription Image <span className="required">*</span></h3>
            <div className="image-upload-area">
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Prescription preview" />
                  <button 
                    type="button"
                    className="change-image-btn"
                    onClick={() => {
                      setPrescriptionImage(null);
                      setImagePreview(null);
                      setError('');
                    }}
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                    required
                  />
                  <div className="upload-placeholder">
                    <span className="upload-icon">📄</span>
                    <p><strong>Click to upload prescription</strong></p>
                    <small>PNG, JPG, JPEG up to 5MB</small>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Prescription Details Section */}
          <div className="form-section">
            <h3>Prescription Details</h3>
            
            <div className="form-group">
              <label htmlFor="doctorName">
                Doctor's Name <span className="required">*</span>
              </label>
              <input
                id="doctorName"
                type="text"
                value={formData.doctorName}
                onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                placeholder="Dr. John Smith"
                className="form-input"
                required
                minLength="3"
              />
              <small className="form-hint">Enter the full name of the prescribing doctor</small>
            </div>

            <div className="form-group">
              <label htmlFor="doctorRegNumber">
                Doctor's Registration Number <span className="required">*</span>
              </label>
              <input
                id="doctorRegNumber"
                type="text"
                value={formData.doctorRegNumber}
                onChange={(e) => setFormData({...formData, doctorRegNumber: e.target.value})}
                placeholder="e.g., MCI-12345"
                className="form-input"
                required
                minLength="4"
              />
              <small className="form-hint">Medical council registration number</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="issueDate">
                  Issue Date <span className="required">*</span>
                </label>
                <input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="expiryDate">
                  Expiry Date <span className="required">*</span>
                </label>
                <input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  min={formData.issueDate || new Date().toISOString().split('T')[0]}
                  required
                  className="form-input"
                />
              </div>
            </div>
            <small className="form-hint">
              Prescriptions are typically valid for 30 days. Expiry date is auto-calculated.
            </small>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional information about the prescription..."
                rows="3"
                className="form-input"
                maxLength="500"
              />
              <small className="form-hint">{formData.notes.length}/500 characters</small>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            {onClose && (
              <button 
                type="button" 
                className="btn-secondary"
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className="btn-primary"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-small"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Upload Prescription
                </>
              )}
            </button>
          </div>
        </form>

        {/* Information Section */}
        <div className="prescription-info">
          <h4>📌 Important Information</h4>
          <ul>
            <li>✓ Ensure the prescription is clear and readable</li>
            <li>✓ Include doctor's signature and stamp on the prescription</li>
            <li>✓ All fields marked with <span className="required">*</span> are mandatory</li>
            <li>✓ Prescriptions are typically valid for 30 days from issue date</li>
            <li>✓ Seller will verify the prescription before processing your order</li>
            <li>✓ Image size should not exceed 5MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionUpload;

