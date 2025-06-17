
````
# 🧰 Stream Wallet SDK for Solana

A lightweight TypeScript/React SDK to interact with the [Stream Wallet Program](https://github.com/YOUR_USERNAME/stream-wallet-program) on the Solana blockchain. This SDK enables developers to easily integrate stream-based token deposit, distribution, and refund workflows into their dApps.

> ✅ Built for the Solana ecosystem using Anchor and React  
> 🔌 Focused on developer experience—simple hooks, minimal boilerplate

## ✨ Features

- 🔄 Create and manage stream wallets (PDAs)
- 💸 Deposit SPL tokens into on-chain stream wallets
- 🪙 Distribute tokens to stream participants
- 🔁 Refund donors if a stream is canceled or ends
- 🧩 React hooks for seamless integration into frontend apps

````
## 📦 Installation

```
npm install @vidbloq/react
```
or
```
yarn add @vidbloq/react
````

## 🚀 Quick Start

```ts
import { useStreamWallet } from '@your-scope/stream-wallet-sdk';

const {
  createStream,
  depositTokens,
  distributeTokens,
  refundTokens,
} = useStreamWallet({ connection, wallet });
```

Each function returns a Promise that resolves once the transaction is confirmed.

### Example: Creating a Stream

```ts
await createStream({
  streamId: 'my-stream',
  authority: wallet.publicKey,
  // optional metadata like description or participant info
});
```

## 🧠 SDK API Overview

| Hook Function      | Description                                       |
| ------------------ | ------------------------------------------------- |
| `createStream`     | Initializes a stream wallet (PDA)                 |
| `depositTokens`    | Deposits SPL tokens into the stream wallet        |
| `distributeTokens` | Distributes tokens to specified wallet addresses  |
| `refundTokens`     | Refunds donors or resets wallet state post-stream |

All interactions are permissioned based on the wallet provider passed into the hook.

## 🔧 Configuration

The hook accepts an object with:

* `connection`: a `Connection` instance from `@solana/web3.js`
* `wallet`: a `wallet-adapter` compatible object

Example:

```ts
const connection = new Connection(clusterApiUrl('devnet'));
const { publicKey, signTransaction, signAllTransactions } = useWallet();
```

## 🧪 Running the Demo Locally

Clone the repo:

```bash
git clone https://github.com/YOUR_USERNAME/stream-wallet-sdk.git
cd stream-wallet-sdk
npm install
npm run dev
```

> Connect your wallet on Devnet and try running `createStream()` and other functions in the demo.

## 🧱 Powered By

* [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
* [Anchor](https://book.anchor-lang.com/)
* [React](https://reactjs.org/)
* [Vite](https://vitejs.dev/) (for demo site)

## 🌍 Related Projects

* [🎥 Vidbloq Program] - https://github.com/VidbloqHQ/bookish-octo-doodle
* [🌐 SDK Demo Site] - https://jade-duckanoo-edb1bd.netlify.app/

## 🧑‍💻 Author

**Chiamaka Ezemba** –  https://x.com/Ada_ezemba
Passionate about building real-time, decentralized tools on Solana.


