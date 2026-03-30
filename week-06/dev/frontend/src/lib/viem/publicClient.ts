import { createPublicClient, http } from 'viem'
import { statusTestnet } from '../chains/statusTestnet'

export const publicClient = createPublicClient({
  chain: statusTestnet,
  transport: http(statusTestnet.rpcUrls.default.http[0]),
})
