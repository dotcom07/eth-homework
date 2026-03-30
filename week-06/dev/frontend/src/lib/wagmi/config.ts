import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { statusTestnet } from '../chains/statusTestnet'

export const wagmiConfig = createConfig({
  chains: [statusTestnet],
  connectors: [injected()],
  transports: {
    [statusTestnet.id]: http(statusTestnet.rpcUrls.default.http[0]),
  },
  ssr: false,
})
