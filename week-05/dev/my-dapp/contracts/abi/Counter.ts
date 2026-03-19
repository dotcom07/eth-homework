// contracts/abi/Counter.ts

// Counter 컨트랙트의 ABI만 따로 export 합니다.
// wagmi의 useReadContract / useWriteContract 에서 사용합니다.
//
// 이 값은 Foundry가 컴파일 후 생성한
// out/Counter.sol/Counter.json 의 "abi" 배열을 가져온 것입니다.

export const counterAbi = [
  {
    "type": "function",
    "name": "count",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decrement",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "increment",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setCount",
    "inputs": [
      {
        "name": "newCount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;