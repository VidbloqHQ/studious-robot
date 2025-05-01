import React, { useState, useEffect } from 'react';

const SolanaWalletSetter = () => {
  // Default Solana wallet addresses for quick testing
  const sampleAddresses = [
    "D1MGu7SWvnKYkMcbvrMC4HUDpgPRr4cCLhRhXjbRTrmp", // Example valid Solana address 1
    "9BRF5UBQbWHwKJnMdPLxYQpeQbRKiCeKZMHVNxRnUrq9", // Example valid Solana address 2
    "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq"  // Example valid Solana address 3
  ];

  const [walletAddress, setWalletAddress] = useState('');
  const [storageKey, setStorageKey] = useState('walletPublicKey'); // Changed default to walletPublicKey
  const [message, setMessage] = useState('');
  const [savedAddress, setSavedAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if there's already a saved wallet
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(stored);
          if (parsed.address || parsed.publicKey) {
            setSavedAddress(parsed.address || parsed.publicKey);
          } else {
            setSavedAddress(stored);
          }
        } catch (e) {
          // If not JSON, use as is
          setSavedAddress(stored);
        }
      }
    } catch (err) {
      console.error("Error reading from localStorage:", err);
    }
  }, [storageKey]);

  // Save wallet address to localStorage
  const saveWalletAddress = () => {
    if (!walletAddress.trim()) {
      setMessage('Please enter a wallet address');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Check if it looks like a Solana address (base58 encoded, usually 32-44 chars)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        setMessage('Warning: This doesn\'t look like a valid Solana address');
        setTimeout(() => setMessage(''), 5000);
      }

      // Simple storage as string
      localStorage.setItem(storageKey, walletAddress);
      
      // Also try storing in JSON format that many wallets use
      const walletJson = JSON.stringify({
        publicKey: walletAddress,
        address: walletAddress
      });
      localStorage.setItem(`${storageKey}_json`, walletJson);
      
      setSavedAddress(walletAddress);
      setWalletAddress('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setMessage(`Error saving to localStorage: ${err.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Clear the stored wallet
  const clearWallet = () => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_json`);
      setSavedAddress('');
      setMessage('Wallet cleared from localStorage');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error clearing localStorage: ${err.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Use sample address
  const useSampleAddress = (address) => {
    setWalletAddress(address);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Solana Wallet Setup</h2>
      
      {/* Storage key selection */}
      <div className="mb-4">
        <label className="block mb-1">Storage Key:</label>
        <select
          value={storageKey}
          onChange={(e) => setStorageKey(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="walletPublicKey">walletPublicKey</option>
          <option value="wallet">wallet</option>
          <option value="solanaWallet">solanaWallet</option>
          <option value="publicKey">publicKey</option>
          <option value="userWallet">userWallet</option>
        </select>
      </div>
      
      {/* Wallet address input */}
      <div className="mb-4">
        <label className="block mb-1">Solana Wallet Address:</label>
        <textarea
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter your Solana wallet address"
          className="w-full p-2 border rounded font-mono text-sm"
          rows={2}
        />
      </div>
      
      {/* Sample addresses */}
      <div className="mb-4">
        <p className="text-sm mb-1">Sample addresses:</p>
        <div className="flex flex-wrap gap-2">
          {sampleAddresses.map((address, index) => (
            <button
              key={index}
              onClick={() => useSampleAddress(address)}
              className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 font-mono"
            >
              {address.substring(0, 8)}...{address.substring(address.length - 4)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={saveWalletAddress}
          className="bg-blue-500 text-white px-4 py-2 rounded flex-1"
        >
          Save Address
        </button>
        
        <button
          onClick={clearWallet}
          className="bg-red-500 text-white px-4 py-2 rounded"
          disabled={!savedAddress}
        >
          Clear
        </button>
      </div>
      
      {/* Messages */}
      {message && (
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
          {message}
        </div>
      )}
      
      {/* Success message */}
      {showSuccess && (
        <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded text-sm">
          Wallet address saved successfully! Your app can now access it.
        </div>
      )}
      
      {/* Currently saved wallet */}
      {savedAddress && (
        <div className="mt-6 p-3 bg-gray-50 rounded border">
          <h3 className="font-bold text-sm mb-1">Currently Saved Address:</h3>
          <p className="font-mono text-xs break-all">{savedAddress}</p>
          <div className="mt-2 text-xs text-gray-500">
            Saved to: <span className="font-mono">{storageKey}</span> and <span className="font-mono">{storageKey}_json</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-100 text-sm">
        <p className="font-bold mb-1">How this works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enter your Solana wallet address or use a sample</li>
          <li>Save it to your browser's localStorage</li>
          <li>When you access your app, it will find this wallet address</li>
          <li>Your backend can now validate this address and generate a token</li>
        </ol>
      </div>
    </div>
  );
};

export default SolanaWalletSetter;