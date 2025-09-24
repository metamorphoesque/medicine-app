import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/login", formData);
      setMessage(res.data.message);
      setIsError(false);
      if (res.data.userId) {
        localStorage.setItem("userId", res.data.userId);
        navigate("/medicines"); // redirect to medicines page after login
      }
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong");
      setIsError(true);
    }
  };

  const devLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/dev-login");
      localStorage.setItem("userId", res.data.userId);
      navigate("/medicines");
    } catch (err) {
      setMessage("Dev login failed");
      setIsError(true);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleSubmit}>
        <div className="auth-header">Login</div>
        {message && <p className={isError ? "error" : "success"}>{message}</p>}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" className="auth-button">Login</button>
        <button type="button" className="auth-button dev-login" onClick={devLogin}>
          Dev Login
        </button>
      </form>
    </div>
  );
}

export default Login;
