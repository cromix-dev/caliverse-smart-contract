// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol';
import '@openzeppelin/contracts/utils/Strings.sol';
import '../libraries/LibSale.sol';
import '../StakingContract/StakingContract.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

contract GeneralERC721V1 is
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  ERC721Upgradeable,
  ERC721BurnableUpgradeable,
  EIP712Upgradeable
{
  using Strings for uint256;
  struct MintData {
    uint32 mintType; // 1: public sale, 2: allow sale
    address externalWallet;
    address stakingContract;
    uint256[] nonces;
    uint256 quantity;
  }
  SaleInfo private saleInfo;
  uint256 public collectionSize;
  // _type public: 1, allowlist: 2
  event Purchased(address indexed _buyer, uint256 _type, uint256 _quantity, uint256 _price);
  address public caliverseHotwallet;
  mapping(address => mapping(uint256 => bool)) usedNonce;
  uint256 public totalSupply;
  bytes32 constant MintData_TYPEHASH =
    keccak256(
      'MintData(uint32 mintType,address externalWallet,address stakingContract,uint256[] nonces,uint256 quantity)'
    );
  uint256[50] private __gap; // 새로운 state가 추가되면 값을 사이즈에 맞게 조금씩 줄여줘야함

  constructor() {
    _disableInitializers();
  }

  function initialize(
    string memory name_,
    string memory symbol_,
    uint256 collectionSize_,
    string calldata baseURI_,
    address caliverseHotwallet_
  ) public initializer {
    __Ownable_init();
    __ERC721_init(name_, symbol_);
    __ReentrancyGuard_init();
    collectionSize = collectionSize_;
    setBaseURI(baseURI_);
    caliverseHotwallet = caliverseHotwallet_;
    __EIP712_init(name_, 'V1');
    totalSupply = 0;
  }

  function nonceUsed(address address_, uint256 nonce) public view returns (bool) {
    return usedNonce[address_][nonce];
  }

  function startTime() public view returns (uint32) {
    return saleInfo.startTime;
  }

  function endTime() public view returns (uint32) {
    return saleInfo.endTime;
  }

  function price() public view returns (uint256) {
    return saleInfo.price;
  }

  function limit() public view returns (uint256) {
    return saleInfo.limit;
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  modifier callerIsUser() {
    require(tx.origin == msg.sender, 'The caller is another contract');
    _;
  }

  function _safeSaleMint(address to, uint256 quantity_) private returns (uint256[] memory tokenIds) {
    tokenIds = _safeMintMany(to, quantity_);
    saleInfo.totalMinted = saleInfo.totalMinted + quantity_;

    return tokenIds;
  }

  function _safeMintMany(address to, uint256 quantity_) private returns (uint256[] memory) {
    require(totalSupply + quantity_ <= collectionSize, 'reached max supply');

    uint256[] memory tokenIds = new uint256[](quantity_);
    for (uint256 i = 0; i < quantity_; i++) {
      _safeMint(to, totalSupply + i);
      tokenIds[i] = totalSupply + i;
    }

    return tokenIds;
  }

  string private _baseTokenURI;

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  function setBaseURI(string calldata baseURI) public onlyOwner {
    _baseTokenURI = baseURI;
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 firstTokenId,
    uint256 batchSize
  ) internal override(ERC721Upgradeable) {
    super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

    if (from == address(0)) {
      totalSupply = totalSupply + batchSize;
    }
  }

  function setSaleInfo(
    uint32 startTime_,
    uint32 endTime_,
    uint256 price_,
    uint256 limit_,
    uint32 mintType_,
    uint256 maxPerAddr_,
    uint256 maxPerTx_
  ) external onlyOwner {
    saleInfo.startTime = startTime_;
    saleInfo.endTime = endTime_;
    saleInfo.price = price_;
    saleInfo.limit = limit_;
    saleInfo._mintType = mintType_;
    saleInfo.maxPerTx = maxPerTx_;
    saleInfo.maxPerAddr = maxPerAddr_;
    saleInfo.totalMinted = 0;
  }

  function getTextLength(string memory text) public pure returns (uint256) {
    return bytes(text).length;
  }

  function recoverSig(bytes memory data, bytes memory sig) public pure returns (address) {
    bytes32 messageHash = ECDSA.toEthSignedMessageHash(data);

    return ECDSA.recover(messageHash, sig);
  }

  function publicMint(
    address externalWallet,
    address stakingContract,
    uint256[] calldata nonces,
    uint256 quantity,
    bytes memory sig
  ) external payable nonReentrant {
    require(msg.sender == address(externalWallet), 'wrong external wallet');
    validateSignature(1, externalWallet, stakingContract, nonces, quantity, sig);
    LibSale.ensureCallerIsUser();
    LibSale.validatePublicSale(saleInfo, quantity);
    uint256 totalPrice = uint256(saleInfo.price * quantity);
    uint256[] memory tokenIds = _safeSaleMint(stakingContract, quantity);
    LibSale.refundIfOver(totalPrice);
    uint256 usedCnt = useNonce(externalWallet, nonces, quantity);
    require(usedCnt >= quantity, 'invalid nonce');
    addStakingInfo(externalWallet, stakingContract, tokenIds);

    emit Purchased(msg.sender, 1, quantity, uint256(saleInfo.price * quantity));
  }

  function addStakingInfo(address externalWallet, address stakingContract, uint256[] memory tokenIds) private {
    StakingContract(stakingContract).addStakingInfo(externalWallet, tokenIds);
  }

  function getChainId() public view returns (uint256) {
    uint256 chainId;
    assembly {
      chainId := chainid()
    }
    return chainId;
  }

  function useNonce(
    address externalWallet,
    uint256[] calldata nonces,
    uint256 quantity
  ) private returns (uint256 usedCnt) {
    for (uint256 i = 0; i < nonces.length; i++) {
      if (!usedNonce[externalWallet][nonces[i]] && usedCnt < quantity) {
        usedCnt++;
        usedNonce[externalWallet][nonces[i]] = true;
      } else {
        continue;
      }
    }

    return usedCnt;
  }

  function validateSignature(
    uint32 mintType,
    address externalWallet,
    address stakingContract,
    uint256[] calldata nonces,
    uint256 quantity,
    bytes memory sig
  ) internal view {
    bytes32 structHash = hashMintData(MintData(mintType, externalWallet, stakingContract, nonces, quantity));
    address signer = ECDSA.recover(_hashTypedDataV4(structHash), sig);
    require(signer == caliverseHotwallet, 'wrong signature');
  }

  function allowMint(
    address externalWallet,
    address stakingContract,
    uint256[] calldata nonces,
    uint256 quantity,
    bytes memory sig
  ) external payable nonReentrant callerIsUser {
    require(msg.sender == address(externalWallet), 'wrong external wallet');
    validateSignature(2, externalWallet, stakingContract, nonces, quantity, sig);

    LibSale.validatePrivateSale(saleInfo, quantity);
    uint256 totalPrice = uint256(saleInfo.price * quantity);
    uint256 usedCnt = useNonce(externalWallet, nonces, quantity);
    require(usedCnt >= quantity, 'not eligible for allowlist mint');

    uint256[] memory tokenIds = _safeSaleMint(stakingContract, quantity);
    LibSale.refundIfOver(totalPrice);

    addStakingInfo(externalWallet, stakingContract, tokenIds);
    emit Purchased(msg.sender, 2, quantity, uint256(saleInfo.price * quantity));
  }

  function mintTo(address[] memory addresses, uint256[] memory amounts) public nonReentrant onlyOwner {
    require(addresses.length == amounts.length, 'length not match');
    for (uint256 i = 0; i < addresses.length; i++) {
      _safeMintMany(addresses[i], amounts[i]);
    }
  }

  function withdrawMoney() external onlyOwner nonReentrant {
    payable(msg.sender).transfer(address(this).balance);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');

    string memory baseURI = _baseURI();
    return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), '.json')) : '';
  }

  function mintedWithinSale() public view returns (uint256) {
    return saleInfo.totalMinted;
  }

  function setCaliverseHotwallet(address caliverseHotwallet_) public onlyOwner {
    caliverseHotwallet = caliverseHotwallet_;
  }

  function hashMintData(MintData memory mintData) public pure returns (bytes32) {
    //'MintData(uint32 mintType,address externalWallet,address stakingContract,uint256[] nonces,uint256 quantity)'
    bytes32 hash = keccak256(
      abi.encode(
        MintData_TYPEHASH,
        mintData.mintType,
        mintData.externalWallet,
        mintData.stakingContract,
        keccak256(abi.encodePacked(mintData.nonces)),
        mintData.quantity
      )
    );

    return hash;
  }
}

struct TokenBalance {
  uint256 tokenId;
  uint256 amount;
}
