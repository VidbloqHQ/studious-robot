import React, { useState, useEffect } from 'react';

const SolanaWalletSetter: React.FC = () => {
  // List of sample wallet addresses to choose from
  const sampleAddresses = [
    "D1MGu7SWvnKYkMcbvrMC4HUDpgPRr4cCLhRhXjbRTrmp",
    "9BRF5UBQbWHwKJnMdPLxYQpeQbRKiCeKZMHVNxRnUrq9",
    "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq",
    "3jbW3PoV3pzcYh1ZURhDaJJcffMaj3BQF89vNcvfL4Ec",
    "HN7Sajd9zRzq4PvZnrKvkwpkZ3EGToEMgb5PH9Yct1M1"
  ];

  const [walletAddress, setWalletAddress] = useState('');
  const [storageKey] = useState('walletPublicKey');
  const [message, setMessage] = useState('');
  const [savedAddress, setSavedAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if there's already a saved wallet
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedAddress(stored);
      }
    } catch (err) {
      console.error("Error reading from localStorage:", err);
    }
  }, [storageKey]);

  // Save wallet address to localStorage as a simple string
  const saveWalletAddress = () => {
    if (!walletAddress.trim()) {
      setMessage('Please enter or select a wallet address');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Store ONLY as a simple string, not JSON
      localStorage.setItem(storageKey, walletAddress);
      
      setSavedAddress(walletAddress);
      setWalletAddress(''); // Clear input
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setMessage(`Error saving to localStorage: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Function to select sample address - renamed to avoid "use" prefix
  const selectSampleAddress = (address: string) => {
    setWalletAddress(address);
  };

  return (
    <div style={{ 
      padding: '16px', 
      margin: '16px 0', 
      backgroundColor: '#f9f9f9', 
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Solana Wallet Setup</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Wallet Address:
        </label>
        <input 
          type="text" 
          value={walletAddress} 
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter wallet address"
          style={{ 
            width: '100%', 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid #d9d9d9'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Or select from sample addresses:
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sampleAddresses.map((address, index) => (
            <button
              key={index}
              onClick={() => selectSampleAddress(address)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {address.substring(0, 6)}...{address.substring(address.length - 4)}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          onClick={saveWalletAddress}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Wallet Address
        </button>
        {savedAddress && (
          <button
            onClick={() => {
              localStorage.removeItem(storageKey);
              setSavedAddress('');
              setMessage('Wallet cleared');
              setTimeout(() => setMessage(''), 3000);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Wallet
          </button>
        )}
      </div>
      
      {showSuccess && (
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '4px',
          color: '#52c41a',
          marginBottom: '16px'
        }}>
          Wallet address saved successfully as a plain string!
        </div>
      )}
      
      {message && (
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: message.includes('Error') ? '#fff2f0' : '#e6f7ff', 
          border: `1px solid ${message.includes('Error') ? '#ffccc7' : '#91d5ff'}`,
          borderRadius: '4px',
          color: message.includes('Error') ? '#ff4d4f' : '#1890ff',
          marginBottom: '16px'
        }}>
          {message}
        </div>
      )}
      
      {savedAddress && (
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Currently saved wallet:</p>
          <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>
            {savedAddress}
          </code>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
            Stored as a plain string in localStorage with key: "walletPublicKey"
          </p>
        </div>
      )}
    </div>
  );
};

export default SolanaWalletSetter;