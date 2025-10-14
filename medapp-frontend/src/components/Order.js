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
  const [filterStatus, setFilterStatus] = useState('all');

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

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: user.id })
      });

      if (response.ok) {
        alert('✓ Order cancelled successfully');
        fetchOrders();
        if (selectedOrder === orderId) {
          setSelectedOrder(null);
          setOrderDetails(null);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order');
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

  const canCancelOrder = (status) => {
    return ['pending', 'confirmed'].includes(status);
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.order_status === filterStatus);

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
        <div className="orders-header-section">
          <h1>My Orders</h1>
          <div className="status-filter-tabs">
            <button 
              className={filterStatus === 'all' ? 'active' : ''}
              onClick={() => setFilterStatus('all')}
            >
              All Orders ({orders.length})
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

        {filteredOrders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h2>
              {filterStatus === 'all' ? 'No orders yet' : `No ${filterStatus} orders`}
            </h2>
            <p>
              {filterStatus === 'all' 
                ? 'Start shopping to see your orders here' 
                : `You don't have any ${filterStatus} orders`}
            </p>
            {filterStatus === 'all' && (
              <button onClick={() => navigate('/')} className="shop-now-btn">
                Shop Now
              </button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order.order_number}</h3>
                    <p className="order-date">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
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

                  <div className="order-actions">
                    <button 
                      className="view-details-btn"
                      onClick={() => fetchOrderDetails(order.id)}
                    >
                      View Details
                    </button>
                    {canCancelOrder(order.order_status) && (
                      <button 
                        className="cancel-order-btn"
                        onClick={() => cancelOrder(order.id)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
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
                  {getStatusIcon(orderDetails.order.order_status)} {orderDetails.order.order_status.toUpperCase()}
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
              {orderDetails.order.seller_phone && (
                <div className="meta-item">
                  <strong>Seller Contact:</strong>
                  <span>{orderDetails.order.seller_phone}</span>
                </div>
              )}
            </div>

            {/* Order Progress Tracker */}
            <div className="order-progress">
              <div className={`progress-step ${['pending', 'confirmed', 'processing', 'shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}>
                <div className="progress-dot">✓</div>
                <span>Order Placed</span>
              </div>
              <div className={`progress-line ${['confirmed', 'processing', 'shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}></div>
              <div className={`progress-step ${['confirmed', 'processing', 'shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}>
                <div className="progress-dot">✓</div>
                <span>Confirmed</span>
              </div>
              <div className={`progress-line ${['processing', 'shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}></div>
              <div className={`progress-step ${['processing', 'shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}>
                <div className="progress-dot">📦</div>
                <span>Processing</span>
              </div>
              <div className={`progress-line ${['shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}></div>
              <div className={`progress-step ${['shipped', 'delivered'].includes(orderDetails.order.order_status) ? 'completed' : ''}`}>
                <div className="progress-dot">🚚</div>
                <span>Shipped</span>
              </div>
              <div className={`progress-line ${orderDetails.order.order_status === 'delivered' ? 'completed' : ''}`}></div>
              <div className={`progress-step ${orderDetails.order.order_status === 'delivered' ? 'completed' : ''}`}>
                <div className="progress-dot">✅</div>
                <span>Delivered</span>
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
                        ⚕️ {item.rx_status === 'verified' ? 'Verified' : 'Pending Verification'}
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

            {canCancelOrder(orderDetails.order.order_status) && (
              <div className="modal-actions">
                <button 
                  className="cancel-order-btn-large"
                  onClick={() => cancelOrder(orderDetails.order.id)}
                >
                  Cancel This Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;