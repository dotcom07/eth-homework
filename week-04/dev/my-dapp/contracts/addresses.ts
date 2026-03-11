// contracts/addresses.ts

export const sepoliaId = 11155111;

export const CONTRACT_ADDRESSES = {
  [sepoliaId]: {
    counter: '0x7b1E2a5e73b7ab00161e60BF63FF87df1A7adeF3',
    bayToken: '0xC0A7FCbf4Fa5E9E10aE554d4532021152D8B3E7F',
    starToken: '0x3E1a693D32a9Cc4274193710B42B0B78Fd8FDd6d',
  },
} as const;