# Week 3 퀴즈: EVM/Security patterns

**제출 방법:**
1. 이 파일을 복사하여 `quiz-03-solution.md`로 저장
2. 각 문제에 답변 작성 (왜 그런지 설명 포함)
3. Pull Request 생성 (`quiz_submission` 템플릿 사용)

**평가 기준:**
- 정답 여부보다 **개념 이해도**를 중점 평가합니다
- 특히 **보안 취약점 식별과 방어 패턴**을 중점 평가합니다
- 코드 문제는 문법보다 보안 논리를 평가합니다

---

## 문제 1: [이론] EVM 개념 (객관식)

EVM(Ethereum Virtual Machine)이 "결정론적(deterministic)"으로 실행되어야 하는 이유는?

**보기:**
A) 모든 노드가 같은 CPU를 사용해야 하므로
B) 모든 노드가 같은 입력에 대해 같은 결과를 얻어야 합의가 가능하므로
C) 트랜잭션 처리 속도를 높이기 위해
D) 개발자가 코드를 디버깅하기 쉽게 하기 위해

**답변:**
<!--
정답과 함께, EVM에서 랜덤 함수나 외부 API 호출이 금지된 이유를 설명하세요.
-->
B
먼저 랜덤 함수의 경우 노드마다 그 결과가 달라서 합의를 할 수 없게 된다.
또한, 외부 API 호출의 경우 응답이 그 API를 처리하는 서버 상태에 따라 다를 수 있어서 금지된다.
---

## 문제 2: [이론] Storage vs Memory (객관식)

다음 코드에서 `data` 변수의 저장 위치와 특성을 올바르게 설명한 것은?

```solidity
function process(uint[] memory data) public pure returns (uint) {
    uint sum = 0;
    for (uint i = 0; i < data.length; i++) {
        sum += data[i];
    }
    return sum;
}
```

**보기:**
A) Storage에 저장되며 함수 종료 후에도 유지된다
B) Memory에 저장되며 함수 종료 시 삭제된다
C) Stack에 저장되며 가장 비싼 저장 공간이다
D) Calldata에 저장되며 수정이 가능하다

**답변:**
<!--
정답과 함께, Storage/Memory/Stack의 비용 차이를 간단히 설명하세요.
힌트: 어떤 것이 가장 비싸고, 왜 비싼가요?
-->
B
Storage는 실제로 물리적 스토리지에 데이터를 저장해야하므로 I/O 오버헤드가 있고, 모든 노드가 그 상태를 저장하고 있어하며 상태의 변화가 일어나면 MPT를 갱신해야해 비싸다.
반면 Memory와 Stack은 RAM에서만 존재하는 작업 공간이며 트랜잭션이 끝나면 제거되므로 비용이 싸다. 그런데 stack의 경우에는 고정된 공간이며, Memory의 경우 가변적으로 확장 가능한 공간이라 더 비싸다.
---

## 문제 3: [이론] Gas 비용 (객관식)

다음 중 Gas 비용이 가장 높은 연산은?

**보기:**
A) ADD (덧셈)
B) MUL (곱셈)
C) SLOAD (Storage 읽기)
D) SSTORE (Storage 쓰기)

**답변:**
<!--
정답과 함께, 왜 Storage 관련 연산이 비싼지 설명하세요.
힌트: Storage에 저장된 데이터는 어떤 특성이 있나요?
-->
D
SSTORE는 상태를 영구적으로 변경하는 연산이다.
따라서 모든 노드가 그 변경 사항을 동일하게 반영해 state DB에 저장하고 MPT를 갱신해야 하므로 가장 비싸다.
---

## 문제 4: [이론] CEI 패턴 (단답형)

**왜** CEI(Checks-Effects-Interactions) 패턴에서 Effects(상태 변경)가 Interactions(외부 호출)보다 먼저 와야 하나요?

재진입 공격 시나리오와 연결해서 구체적으로 설명하세요.

**답변:**
<!--
2-3 문장으로 설명하세요.
힌트:
- 외부 호출 시 상대방 컨트랙트의 코드가 실행됨
- 그 코드에서 다시 원래 함수를 호출하면?
- 상태가 변경되지 않은 상태라면 어떻게 될까요?
-->
만약 Effects가 Interactions보다 나중에 오면


function withdraw() public {
    uint amount = balances[msg.sender];
    require(amount > 0, "No balance");

    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");

    balances[msg.sender] = 0;
}
위처럼
상태 변화 이전에 withdraw()를 다시 호출할 시 msg.sender.call{value: amount}("")가 반복되어 실행될 수 있다. 그 이유는 msg.sender가 컨트랙트 주소라면, eth를 보내는 동시에 그 컨트랙트의 함수가 실행될 수 있다. 그러면 withdraw() 함수 도중에 다른 컨트랙트가 끼어들어 실행을 완료한 후 다음 코드를 실행한다.

---

## 문제 5: [이론] The DAO 사건 교훈 (단답형)

2016년 The DAO 해킹($60M 피해)에서 우리가 배워야 할 **가장 중요한 교훈**은 무엇인가요?

이 사건 이후 이더리움 생태계에 어떤 변화가 있었나요?

**답변:**
<!--
2-3 문장으로 설명하세요.
교훈:
- 기술적 교훈 (코드 작성 관점)
- 생태계 교훈 (이더리움 커뮤니티 관점)
-->
먼저 코드 작성 관점에서는 CEI 패턴을 철저하게 지켜야하게 되었고 감사가 잘 이루어져야한다는 교훈을 주었다. 생태계 관점에서는 이미 일어난 일이므로 그대로 가느냐 vs 하드포크로 되돌리느냐라는 거버넌스 문제가 대두되었고, 실제로 Ethereum 재단은 하드포크를 선택하면서 Ethereum과 Ethereum Classic으로 갈라졌다.
---

## 문제 6: [코드] 재진입 공격 식별 (취약점 찾기)

다음 코드에서 재진입 공격 취약점을 찾으세요:

```solidity
// BAD CODE - 취약점 찾기
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // ETH 전송
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // 잔액 차감
        balances[msg.sender] -= amount;
    }
}
```

**1) 발견한 취약점:**
<!--
취약점 이름과 위치를 명시하세요.
힌트: withdraw 함수의 순서를 자세히 보세요.
-->
Reentrancy 취약점이 존재하고 잔액 차감보다 ETH 전송이 먼저 일어나는 것이 문제이다.

**2) 왜 이것이 문제인가:**
<!--
공격자가 어떻게 이 취약점을 악용할 수 있는지 단계별로 설명하세요.
-->
공격자 컨트랙트가 call로 eth를 받는 receive()나 fallback() 함수에서 withdraw()를 재호출하면, 잔액이 아직은 줄지 않은 상태라 같은 amount를 반복 인출할 수 있다.


**3) 올바른 수정 방법 (CEI 패턴):**
```solidity
// GOOD CODE - CEI 패턴으로 수정하세요
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    balances[msg.sender] -= amount;
    
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

---

## 문제 7: [코드] CEI 패턴 구현 (빈칸 채우기)

다음 코드의 빈칸을 채워 CEI 패턴을 완성하세요:

```solidity
function secureWithdraw(uint256 amount) public {
    // 1. Checks - 조건 확인
    require(______________________, "Insufficient balance");

    // 2. Effects - 상태 변경 (외부 호출 전에!)
    ______________________;

    // 3. Interactions - 외부 호출 (마지막에!)
    (bool success, ) = msg.sender.call{value: ______}("");
    require(success, "Transfer failed");
}
```

**답변:**
```solidity
function secureWithdraw(uint256 amount) public {
    // 1. Checks - 조건 확인
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // 2. Effects - 상태 변경 (외부 호출 전에!)
    balances[msg.sender] -= amount;

    // 3. Interactions - 외부 호출 (마지막에!)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

**왜 이 순서가 중요한가요:**
<!--
CEI 순서가 재진입을 어떻게 방지하는지 설명하세요.
-->
balances[msg.sender]를 먼저 감소시켜 재진입 공격 시에도 require에서 미리
막는 것이 가능하다.

---

## 문제 8: [코드] tx.origin 취약점 (취약점 찾기)

다음 코드에서 보안 취약점을 찾으세요:

```solidity
// BAD CODE - 취약점 찾기
contract PhishingVulnerable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) public {
        require(tx.origin == owner, "Not owner");
        owner = newOwner;
    }
}
```

**1) 발견한 취약점:**
<!--
tx.origin과 msg.sender의 차이와 관련된 문제입니다.
-->
require(tx.origin == owner, "Not owner") 이 부분이 문제이다.
tx.origin은 이 트랜잭션을 맨 처음 시작한 EOA이며, msg.sender는 현재 함수를 호출한 주체이다. 컨트랙트에서 접근 제어는 msg.sender로 하는 것이 적절하다 그 이유는 2번의 예시를 통해 알아볼 것이다.

**2) 공격 시나리오:**
<!--
공격자가 어떻게 이 취약점을 악용할 수 있나요?
힌트: 공격자 컨트랙트를 통한 우회
-->
먼저 공격자가 어떤 컨트랙트를 만들어 그 안에서 PhishingVulnerable의 transferOwnership(공격자)를 호출하게 한다.

```solidity
contract AttackContract {
    PhishingVulnerable target;
    address attacker;

    constructor(address _target) {
        target = PhishingVulnerable(_target); // 공격 대상 컨트랙트 주소를 받아서 저장

        // 공격자가 배포할 때 이렇게 new AttackContract(0x1234...); 공개되어 있는 PhishingVulnerable 컨트랙트 주소를 넣어줌

        // 이 주소(_target)에 있는 컨트랙트를 PhishingVulnerable 타입으로 취급하겠다는 선언 (컴파일러한테 저 주소에 transferOwnership 함수가 있다고 알려줌)

        attacker = msg.sender; // 공격자 EOA의 주소를 저장
    }

    function attack() public {
        target.transferOwnership(attacker);
    }
}
```
이후 공격자는 피싱 링크 등을 통해 owner(피해자 EOA)가 `AttackContract.attack()`에 서명하게 유도한다.

즉, 콜 체인이 피해자 EOA → AttackContract.attack() → PhishingVulnerable.transferOwnership()가 된다.

이때 tx.origin은 항상 해당 트랜잭션을 최초로 서명하고 시작한 EOA만을 가리킨다.

반면 msg.sender는 콜체인 단계마다 바뀐다. 
예를 들면 피해자 EOA → A 컨트랙트 → B 컨트랙트 → C 컨트랙트 에서
tx.origin 항상 피해자 EOA이지만, msg.sender은 피해자 EOA, A 컨트랙트, B 컨트랙트로 변화한다.

다시 돌아가, 위 논리를 적용하면 transferOwnership에서 require(tx.origin == owner, "Not owner");를 하면 피해자 EOA == 피해자 EOA가 되어 통과한다.

**3) 올바른 수정 방법:**
```solidity
// GOOD CODE - 수정된 코드를 작성하세요
contract PhishingVulnerable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) public {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }
}
```

따라서 이렇게 수정하면
피해자 EOA → AttackContract.attack() → PhishingVulnerable.transferOwnership()에서 

transferOwnership에서 msg.sender는 공격자고 owner은 피해자 EOA이므로 공격을 막을 수 있다.

---

## 문제 9: [코드] ReentrancyGuard 적용 (빈칸 채우기)

다음 코드의 빈칸을 채워 ReentrancyGuard를 적용하세요:

```solidity
// TODO: OpenZeppelin import
______________________________________

// TODO: 상속 추가
contract SecureVault _________________ {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // TODO: modifier 추가
    function withdraw(uint256 amount) public _________________ {
        require(balances[msg.sender] >= amount, "Insufficient");
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed");
    }
}
```

**답변:**
```solidity
// 빈칸을 채운 완성 코드를 작성하세요
// TODO: OpenZeppelin import
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// TODO: 상속 추가
// ReentrancyGuard를 상속하게 함
contract SecureVault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // TODO: modifier 추가
    // 취약한 함수에 nonReentrant modifier 적용
    // nonReentrant modifier는 내부적으로 lock variable (status flag)을 사용해 함수가 실행되는 동안 다시 들어오는 호출을 막음
    function withdraw(uint256 amount) public nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient");
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed");
    }
}
```

**CEI 패턴 vs ReentrancyGuard - 언제 무엇을 사용하나요:**
<!--
두 방법의 장단점을 설명하세요.
-->
CEI 패턴은 추가 gas 비용이나 라이브러리가 필요하지 않지만 개발자가 그 패틴을 항상 잘 지켜줘야 한다.
반면 ReentrancyGuard는  lock을 사용해 재진입을 자동으로 차단해주지만 gas 비용을 추가로 지불해야한다.

---

## 문제 10: [다이어그램] 재진입 공격 흐름 해석 (다이어그램 분석)

다음 재진입 공격 시퀀스 다이어그램을 분석하세요:

```mermaid
sequenceDiagram
    participant A as 공격자
    participant V as VulnerableVault

    Note over A,V: 초기 상태: Vault 잔액 10 ETH, 공격자 예치금 1 ETH

    A->>V: 1. withdraw(1 ether) 호출
    V->>V: 2. require 통과 (잔액 1 ETH >= 1 ETH)
    V->>A: 3. call{value: 1 ether}() - ETH 전송
    Note over A: 4. receive() 트리거됨
    A->>V: 5. receive()에서 다시 withdraw(1 ether) 호출
    V->>V: 6. require 통과 (잔액 아직 1 ETH!)
    V->>A: 7. 또 1 ETH 전송
    Note over A: 8. 반복...
    Note over V: 9. Vault 잔액 0이 될 때까지 반복
    V->>V: 10. 최종: balances[attacker] -= 1 ether (여러 번 실행됨)
```

**질문 1:** 6번에서 require 체크가 통과하는 이유는 무엇인가요?

**답변:**
<!--
상태 변경(balances 차감)이 언제 일어나는지 확인하세요.
-->


**질문 2:** CEI 패턴을 적용하면 6번에서 어떻게 되나요?

**답변:**
<!--
상태 변경 순서가 바뀌면 어떤 차이가 생기는지 설명하세요.
-->


**질문 3:** 공격자가 총 몇 ETH를 탈취할 수 있나요? (예치금 1 ETH, Vault 총 잔액 10 ETH 가정)

**답변:**
<!--
공격 시나리오를 수치로 분석해 보세요.
-->


---

## 자기 평가

모든 문제를 풀었다면, 아래 체크리스트로 자기 평가를 해보세요:

- [ ] EVM의 결정론적 실행 필요성을 이해했다
- [ ] Storage/Memory/Stack의 차이와 비용을 알고 있다
- [ ] 재진입 공격의 원리를 설명할 수 있다
- [ ] CEI 패턴으로 재진입 공격을 방어할 수 있다
- [ ] tx.origin vs msg.sender의 보안 차이를 알고 있다
- [ ] ReentrancyGuard를 적용할 수 있다

---

## 참고 자료

- 이론: `eth-materials/week-03/theory/slides.md`
- 취약한 코드: `eth-homework/week-03/dev/src/Vault.sol`
- 안전한 코드: `eth-homework/week-03/dev/src/VaultSecure.sol`
- 테스트: `eth-homework/week-03/dev/test/Vault.t.sol`
- 용어: `eth-materials/resources/glossary.md`
