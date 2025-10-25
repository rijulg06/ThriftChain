import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'

/**
 * Create a Sui client instance
 * @param network - Network to connect to (default: 'testnet')
 * @returns Sui client instance
 */
export function getSuiClient(network: 'testnet' | 'mainnet' | 'devnet' = 'testnet'): SuiClient {
  const rpcUrl = getFullnodeUrl(network)
  
  return new SuiClient({
    url: rpcUrl,
  })
}

/**
 * Default Sui client for testnet
 */
export const suiClient = getSuiClient('testnet')
