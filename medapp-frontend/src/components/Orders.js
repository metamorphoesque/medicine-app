import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Orders.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/signup');
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/orders/buyer/${user.id}`);
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

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✓',
      processing: '📦',
      shipped: '🚚',
      delivered: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>My Orders</h1>

        {orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here</p>
            <button onClick={() => navigate('/')} className="shop-now-btn">
              Shop Now
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order.order_number}</h3>
                    <p className="order-date">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div 
                    className="order-status"
                    style={{ 
                      background: `${getStatusColor(order.order_status)}20`,
                      color: getStatusColor(order.order_status)
                    }}
                  >
                    {getStatusIcon(order.order_status)} {order.order_status.toUpperCase()}
                  </div>
                </div>

                <div className="order-body">
                  <div className="order-summary">
                    <p><strong>Seller:</strong> {order.seller_name}</p>
                    <p><strong>Items:</strong> {order.item_count}</p>
                    <p><strong>Total:</strong> ${parseFloat(order.total_amount).toFixed(2)}</p>
                    {!order.prescription_verified && order.order_status !== 'cancelled' && (
                      <p className="rx-status pending">
                        ⚕️ Prescription verification pending
                      </p>
                    )}
                    {order.prescription_verified && (
                      <p className="rx-status verified">
                        ✓ Prescription verified
                      </p>
                    )}
                  </div>

                  <button 
                    className="view-details-btn"
                    onClick={() => fetchOrderDetails(order.id)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && orderDetails && (
        <div className="order-details-modal" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
              ×
            </button>

            <h2>Order Details</h2>
            <div className="order-number-large">#{orderDetails.order.order_number}</div>

            <div className="order-meta">
              <div className="meta-item">
                <strong>Status:</strong>
                <span style={{ color: getStatusColor(orderDetails.order.order_status) }}>
                  {orderDetails.order.order_status.toUpperCase()}
                </span>
              </div>
              <div className="meta-item">
                <strong>Order Date:</strong>
                <span>{new Date(orderDetails.order.created_at).toLocaleDateString()}</span>
              </div>
              <div className="meta-item">
                <strong>Seller:</strong>
                <span>{orderDetails.order.seller_name}</span>
              </div>
            </div>

            <h3>Items</h3>
            <div className="order-items-list">
              {orderDetails.items.map((item) => (
                <div key={item.id} className="order-item">
                  <div className="item-info">
                    <strong>{item.medicine_name}</strong>
                    {item.generic && <p className="generic">{item.generic}</p>}
                  </div>
                  <div className="item-quantity">Qty: {item.quantity}</div>
                  <div className="item-price">
                    ${parseFloat(item.total_price).toFixed(2)}
                  </div>
                  {item.prescription_image_url && (
                    <div className="item-rx">
                      <span className="rx-indicator">
                        ⚕️ {item.rx_status === 'verified' ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="order-total">
              <strong>Total:</strong>
              <strong>${parseFloat(orderDetails.order.total_amount).toFixed(2)}</strong>
            </div>

            {orderDetails.order.shipping_address && (
              <div className="shipping-address">
                <h3>Shipping Address</h3>
                <p>{orderDetails.order.shipping_address}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;