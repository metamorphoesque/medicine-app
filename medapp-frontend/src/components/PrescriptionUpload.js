import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './PrescriptionUpload.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const PrescriptionUpload = ({ onUploadSuccess, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    doctorName: '',
    doctorRegNumber: '',
    issueDate: '',
    notes: ''
  });
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prescriptionImage) {
      setError('Please upload a prescription image');
      return;
    }

    if (!formData.issueDate) {
      setError('Please enter the prescription issue date');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // In a real app, you'd upload to cloud storage (S3, Cloudinary, etc.)
      // For now, we'll simulate with base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;

        const response = await fetch(`${API_BASE}/api/prescriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            doctor_name: formData.doctorName,
            doctor_registration_number: formData.doctorRegNumber,
            issue_date: formData.issueDate,
            prescription_image_url: base64Image,
            notes: formData.notes
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (onUploadSuccess) {
            onUploadSuccess(data.prescription);
          }
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to upload prescription');
        }
      };
      reader.readAsDataURL(prescriptionImage);
    } catch (err) {
      console.error('Error uploading prescription:', err);
      setError('Failed to upload prescription');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="prescription-upload-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload Prescription</h2>
          {onClose && (
            <button className="close-modal-btn" onClick={onClose}>×</button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="prescription-form">
          <div className="form-section">
            <h3>Prescription Image</h3>
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
                  />
                  <div className="upload-placeholder">
                    <span className="upload-icon">📄</span>
                    <p>Click to upload prescription</p>
                    <small>PNG, JPG up to 5MB</small>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Prescription Details</h3>
            
            <div className="form-group">
              <label>Doctor's Name (Optional)</label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                placeholder="Dr. John Smith"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Doctor's Registration Number (Optional)</label>
              <input
                type="text"
                value={formData.doctorRegNumber}
                onChange={(e) => setFormData({...formData, doctorRegNumber: e.target.value})}
                placeholder="Registration number"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Prescription Issue Date *</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
                required
                className="form-input"
              />
              <small className="form-hint">Prescriptions are valid for 30 days</small>
            </div>

            <div className="form-group">
              <label>Additional Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional information..."
                rows="3"
                className="form-input"
              />
            </div>
          </div>

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
              disabled={uploading || !prescriptionImage}
            >
              {uploading ? 'Uploading...' : 'Upload Prescription'}
            </button>
          </div>
        </form>

        <div className="prescription-info">
          <h4>Important Information</h4>
          <ul>
            <li>Ensure the prescription is clear and readable</li>
            <li>Include doctor's signature and stamp</li>
            <li>Prescriptions are valid for 30 days from issue date</li>
            <li>Seller will verify before processing your order</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionUpload;