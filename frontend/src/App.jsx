import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const register = async () => {
    try {
      const res = await axios.post(`${API}/register`, { email, password });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error");
    }
  };

  const login = async () => {
    try {
      const res = await axios.post(`${API}/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      setMessage("Login Successful");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error");
    }
  };

  const makePayment = async () => {
    try {
      const res = await axios.post(
        `${API}/payment`,
        { amount, currency, merchant_id: merchantId },
        { headers: { Authorization: token } }
      );
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error");
    }
  };

  const getTransactions = async () => {
    try {
      const res = await axios.get(`${API}/transactions`, {
        headers: { Authorization: token }
      });
      setTransactions(res.data);
    } catch (err) {
      setMessage("Unauthorized");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setMessage("Logged out");
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h2>Secure Mini Payment System</h2>

      <h3>Register / Login</h3>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      /><br /><br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />

      <button onClick={register}>Register</button>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>

      <hr />

      <h3>Make Payment</h3>
      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      /><br /><br />
      <input
        placeholder="Currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      /><br /><br />
      <input
        placeholder="Merchant ID"
        value={merchantId}
        onChange={(e) => setMerchantId(e.target.value)}
      /><br /><br />

      <button onClick={makePayment}>Pay</button>

      <hr />

      <h3>Transactions</h3>
      <button onClick={getTransactions}>Load Transactions</button>

      <ul>
        {transactions.map((tx) => (
          <li key={tx._id}>
            ₹{tx.amount} - {tx.currency} - {tx.merchant_id}
          </li>
        ))}
      </ul>

      <h4>{message}</h4>
    </div>
  );
}

export default App;