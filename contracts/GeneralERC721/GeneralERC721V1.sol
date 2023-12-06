// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../libraries/LibSale.sol";
import "../libraries/LibNFTAdmin.sol";
import "../StakingContract/StakingContractV1.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GeneralERC721V1 is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721Upgradeable,
    ERC721BurnableUpgradeable,
    ERC721EnumerableUpgradeable
{
    using Strings for uint256;
    SaleInfo private saleInfo;
    uint256 public collectionSize;
    mapping(address => uint256) public numberMinted; // eg. 0x... => 12
    uint256 public nextTokenId;
    address[] private admins;
    mapping(address => uint256[]) public _holds;
    // _type public: 1, allowlist: 2
    event Purchased(
        address indexed _buyer,
        uint256 _type,
        uint256 _quantity,
        uint256 _price
    );
    address public caliverseHotwallet;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 collectionSize_,
        string calldata baseURI_,
        address admin_,
        address caliverseHotwallet_
    ) public initializer {
        __Ownable_init();
        __ERC721_init(name_, symbol_);
        __ReentrancyGuard_init();
        collectionSize = collectionSize_;
        nextTokenId = 0;
        setBaseURI(baseURI_);
        admins.push(admin_);
        caliverseHotwallet = caliverseHotwallet_;
    }

    function allowlist(address address_) public view returns (uint256) {
        return saleInfo.allowlist[address_];
    }

    function mintedDuringSale(address address_) public view returns (uint256) {
        return saleInfo.mintedDuringSale[address_];
    }

    function participants(uint256 index) public view returns (address) {
        return saleInfo.participants[index];
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

    function adminOnly() public view returns (bool) {
        return saleInfo.adminOnly;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    modifier callerIsUser() {
        require(tx.origin == msg.sender, "The caller is another contract");
        _;
    }

    function _safeSaleMint(
        address to,
        uint256 quantity_
    ) private returns (uint256[] memory) {
        uint256[] memory tokenIds = _safeMintMany(to, quantity_);
        saleInfo.mintedDuringSale[msg.sender] =
            mintedDuringSale(msg.sender) +
            quantity_;
        saleInfo.totalMinted = saleInfo.totalMinted + quantity_;

        return tokenIds;
    }

    function _safeMintMany(
        address to,
        uint256 quantity_
    ) private returns (uint256[] memory) {
        require(
            nextTokenId + quantity_ <= collectionSize,
            "exceed collection size"
        );
        require(
            totalSupply() + quantity_ <= collectionSize,
            "reached max supply"
        );

        uint256[] memory tokenIds = new uint256[](quantity_);
        for (uint256 i = 0; i < quantity_; i++) {
            _safeMint(to, nextTokenId + i);
            tokenIds[i] = nextTokenId + i;
        }
        nextTokenId = nextTokenId + quantity_;
        numberMinted[msg.sender] = numberMinted[msg.sender] + quantity_;

        addParticipant(msg.sender);

        return tokenIds;
    }

    function addParticipant(address participant) public onlyOwner {
        bool isParicipant = false;
        for (uint256 i = 0; i < saleInfo.participants.length; i++) {
            if (saleInfo.participants[i] == participant) {
                isParicipant = true;
            }
        }

        if (!isParicipant) {
            saleInfo.participants.push(participant);
        }
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
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function setSaleInfo(
        uint32 startTime_,
        uint32 endTime_,
        uint256 price_,
        uint256 limit_,
        uint32 mintType_,
        uint256 maxPerAddr_,
        uint256 maxPerTx_,
        bool adminOnly_ // 1, 0
    ) external onlyOwner {
        saleInfo.startTime = startTime_;
        saleInfo.endTime = endTime_;
        saleInfo.price = price_;
        saleInfo.limit = limit_;
        saleInfo._mintType = mintType_;
        saleInfo.maxPerTx = maxPerTx_;
        saleInfo.maxPerAddr = maxPerAddr_;
        saleInfo.adminOnly = adminOnly_;
        saleInfo.totalMinted = 0;
        for (uint256 i = 0; i < saleInfo.participants.length; i++) {
            delete saleInfo.mintedDuringSale[saleInfo.participants[i]];
        }
        delete saleInfo.participants;
    }

    function getTextLength(string memory text) public pure returns (uint256) {
        return bytes(text).length;
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
            // second 32 bytes.
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function recoverSig(
        bytes memory data,
        bytes memory sig
    ) public pure returns (address) {
        bytes32 messageHash = ECDSA.toEthSignedMessageHash(data);
        (uint8 _v, bytes32 _r, bytes32 _s) = splitSignature(sig);

        return ecrecover(messageHash, _v, _r, _s);
    }

    function publicMint(
        bytes memory walletPair,
        uint256 quantity,
        bytes memory sig
    ) external payable {
        (address externalWallet, address stakingContract) = splitWalletPair(
            walletPair
        );

        require(msg.sender == address(externalWallet), "wrong external wallet");
        require(
            recoverSig(walletPair, sig) == address(caliverseHotwallet),
            "wrong signature"
        );

        if (saleInfo.adminOnly) {
            LibNFTAdmin.isAdmin(admins);
        } else {
            LibSale.ensureCallerIsUser();
        }
        uint256[] memory tokenIds = _publicMint(stakingContract, quantity);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            StakingContractV1(stakingContract).addStakingInfo(
                externalWallet,
                tokenIds[i]
            );
        }

        emit Purchased(
            msg.sender,
            1,
            quantity,
            uint256(saleInfo.price * quantity)
        );
    }

    function _publicMint(
        address to,
        uint256 quantity
    ) private returns (uint256[] memory) {
        LibSale.validatePublicSale(saleInfo, quantity);
        uint256 totalPrice = uint256(saleInfo.price * quantity);

        uint256[] memory tokenIds = _safeSaleMint(to, quantity);
        LibSale.refundIfOver(totalPrice);
        payable(owner()).transfer(totalPrice);
        return tokenIds;
    }

    function allowMint(
        bytes memory walletPair,
        uint256 quantity,
        bytes memory sig
    ) external payable callerIsUser {
        (address externalWallet, address stakingContract) = splitWalletPair(
            walletPair
        );
        require(msg.sender == address(externalWallet), "wrong external wallet");
        require(
            recoverSig(walletPair, sig) == address(caliverseHotwallet),
            "wrong signature"
        );
        LibSale.validatePrivateSale(saleInfo, quantity);
        uint256 totalPrice = uint256(saleInfo.price * quantity);
        saleInfo.allowlist[msg.sender] =
            saleInfo.allowlist[msg.sender] -
            quantity;
        uint256[] memory tokenIds = _safeSaleMint(stakingContract, quantity);
        LibSale.refundIfOver(totalPrice);
        payable(owner()).transfer(totalPrice);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            StakingContractV1(stakingContract).addStakingInfo(
                externalWallet,
                tokenIds[i]
            );
        }
        emit Purchased(
            msg.sender,
            2,
            quantity,
            uint256(saleInfo.price * quantity)
        );
    }

    function seedAllowlist(
        address[] calldata addresses,
        uint256[] calldata numSlots
    ) external onlyOwner {
        require(addresses.length == numSlots.length, "length not match");
        for (uint256 i = 0; i < addresses.length; i++) {
            saleInfo.allowlist[addresses[i]] = numSlots[i];
        }
    }

    function mintTo(
        address[] memory addresses,
        uint256[] memory amounts
    ) public onlyOwner {
        require(addresses.length == amounts.length, "length not match");
        for (uint256 i = 0; i < addresses.length; i++) {
            _safeMintMany(addresses[i], amounts[i]);
        }
    }

    function withdrawMoney() external onlyOwner nonReentrant {
        payable(msg.sender).transfer(address(this).balance);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
                : "";
    }

    function addAdmin(address newAdmin) external isAdmin {
        admins.push(newAdmin);
    }

    modifier isAdmin() {
        LibNFTAdmin.isAdmin(admins);
        _;
    }

    function removeAdmin(address address_) external isAdmin {
        LibNFTAdmin.removeAdmin(admins, address_);
    }

    function balance(
        address account
    ) public view returns (TokenBalance[] memory) {
        uint256 _balance = balanceOf(account);
        TokenBalance[] memory result = new TokenBalance[](_balance);

        for (uint256 i = 0; i < _balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(account, i);
            result[i] = TokenBalance(tokenId, 1);
        }

        return result;
    }

    function tokenCnt(address account) public view returns (uint256) {
        return _holds[account].length;
    }

    function adminMint(address to, uint256 amount) public isAdmin {
        _safeMint(to, amount);
    }

    function adminBulkMint(
        address to,
        uint256[] memory amounts
    ) public isAdmin {
        for (uint256 i = 0; i < amounts.length; i++) {
            _safeMint(to, amounts[i]);
        }
    }

    function mintedWithinSale() public view returns (uint256) {
        return saleInfo.totalMinted;
    }

    function splitWalletPair(
        bytes memory walletPair
    ) internal pure returns (address externalWallet, address stakingContract) {
        // require(walletPair.length == 64);

        assembly {
            // first 32 bytes, after the length prefix.
            externalWallet := shr(96, mload(add(walletPair, 32)))
            // second 32 bytes.
            stakingContract := shr(96, mload(add(walletPair, 52)))
        }

        return (externalWallet, stakingContract);
    }
}

struct TokenBalance {
    uint256 tokenId;
    uint256 amount;
}
