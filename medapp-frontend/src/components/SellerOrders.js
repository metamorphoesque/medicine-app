import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SellerOrders.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SellerOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [user, filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const statusParam = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const response = await fetch(
        `${API_BASE}/api/orders/seller/${user.sellerId}${statusParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
        setSelectedOrder(orderId);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (response.ok) {
        alert('Order status updated successfully');
        fetchOrders();
        if (selectedOrder === orderId) {
          fetchOrderDetails(orderId);
        }
      } else {
        alert('Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    }
  };

  const verifyPrescription = async (orderId, verified) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${orderId}/verify-prescription`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verified })
        }
      );

      if (response.ok) {
        alert(verified ? 'Prescription verified' : 'Prescription rejected');
        fetchOrders();
        if (selectedOrder === orderId) {
          fetchOrderDetails(orderId);
        }
      } else {
        alert('Failed to verify prescription');
      }
    } catch (err) {
      console.error('Error verifying prescription:', err);
      alert('Failed to verify prescription');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f57c00',
      confirmed: '#1976d2',
      processing: '#0288d1',
      shipped: '#7b1fa2',
      delivered: '#2e7d32',
      cancelled: '#c62828'
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return (
      <div className="seller-orders">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-orders">
      <div className="orders-header">
        <h1>Orders Management</h1>
        <div className="status-filters">
          <button
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={filterStatus === 'pending' ? 'active' : ''}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button
            className={filterStatus === 'confirmed' ? 'active' : ''}
            onClick={() => setFilterStatus('confirmed')}
          >
            Confirmed
          </button>
          <button
            className={filterStatus === 'processing' ? 'active' : ''}
            onClick={() => setFilterStatus('processing')}
          >
            Processing
          </button>
          <button
            className={filterStatus === 'shipped' ? 'active' : ''}
            onClick={() => setFilterStatus('shipped')}
          >
            Shipped
          </button>
          <button
            className={filterStatus === 'delivered' ? 'active' : ''}
            onClick={() => setFilterStatus('delivered')}
          >
            Delivered
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <div className="empty-icon">📦</div>
          <h2>No orders found</h2>
          <p>
            {filterStatus === 'all' 
              ? 'You have no orders yet' 
              : `No ${filterStatus} orders`}
          </p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Prescription</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>#{order.order_number}</strong>
                  </td>
                  <td>
                    <div className="customer-info">
                      <div>{order.buyer_name}</div>
                      <small>{order.buyer_email}</small>
                    </div>
                  </td>
                  <td>{order.item_count}</td>
                  <td>
                    <strong>${parseFloat(order.total_amount).toFixed(2)}</strong>
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{
                        background: `${getStatusColor(order.order_status)}20`,
                        color: getStatusColor(order.order_status)
                      }}
                    >
                      {order.order_status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {order.prescription_verified ? (
                      <span className="rx-verified">✓ Verified</span>
                    ) : (
                      <span className="rx-pending">⚠️ Pending</span>
                    )}
                  </td>
                  <td>
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => fetchOrderDetails(order.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && orderDetails && (
        <div className="order-modal" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
              ×
            </button>

            <h2>Order Details</h2>
            <div className="order-number">#{orderDetails.order.order_number}</div>

            <div className="order-info-grid">
              <div className="info-section">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> {orderDetails.order.buyer_name}</p>
                <p><strong>Email:</strong> {orderDetails.order.buyer_email}</p>
                {orderDetails.order.phone_number && (
                  <p><strong>Phone:</strong> {orderDetails.order.phone_number}</p>
                )}
                {orderDetails.order.shipping_address && (
                  <p><strong>Address:</strong> {orderDetails.order.shipping_address}</p>
                )}
              </div>

              <div className="info-section">
                <h3>Order Status</h3>
                <select
                  value={orderDetails.order.order_status}
                  onChange={(e) => updateOrderStatus(orderDetails.order.id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <p className="status-hint">Change status to update customer</p>
              </div>
            </div>

            <h3>Order Items</h3>
            <div className="order-items">
              {orderDetails.items.map((item) => (
                <div key={item.id} className="order-item-detail">
                  <div className="item-main">
                    <div className="item-name-section">
                      <strong>{item.medicine_name}</strong>
                      {item.generic && <small>{item.generic}</small>}
                      <div className="item-meta">
                        Qty: {item.quantity} × ${parseFloat(item.price_per_unit).toFixed(2)}
                      </div>
                    </div>
                    <div className="item-total">
                      ${parseFloat(item.total_price).toFixed(2)}
                    </div>
                  </div>

                  {item.prescription_image_url && (
                    <div className="prescription-section">
                      <div className="prescription-header">
                        <span className="rx-badge">⚕️ Prescription Required</span>
                        <span className={`rx-status ${item.rx_status}`}>
                          {item.rx_status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                        </span>
                      </div>
                      
                      <div className="prescription-image">
                        <img 
                          src={item.prescription_image_url} 
                          alt="Prescription"
                          style={{ maxWidth: '100%', borderRadius: '8px' }}
                        />
                      </div>

                      {item.rx_status !== 'verified' && (
                        <div className="prescription-actions">
                          <button
                            className="verify-btn"
                            onClick={() => verifyPrescription(orderDetails.order.id, true)}
                          >
                            ✓ Verify Prescription
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => verifyPrescription(orderDetails.order.id, false)}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="order-total-section">
              <strong>Total Amount:</strong>
              <strong>${parseFloat(orderDetails.order.total_amount).toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOrders;
