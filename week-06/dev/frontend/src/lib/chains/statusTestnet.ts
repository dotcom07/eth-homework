import { defineChain } from 'viem'

export const statusTestnet = defineChain({
  id: 1660990954,
  name: 'Status Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://public.sepolia.rpc.status.network'],
    },
    public: {
      http: ['https://public.sepolia.rpc.status.network'],
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 0,
    },
  },
  testnet: true,
})
