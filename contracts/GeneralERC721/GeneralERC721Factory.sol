// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './GeneralERC721V1.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';
import '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol';

contract GeneralERC721Factory is Ownable {
  ProxyAdmin public admin;
  address public immutable logic;
  TransparentUpgradeableProxy[] public proxies;
  string public baseUri;
  address public immutable caliverseHotwallet;
  bytes16 private constant HEX_DIGITS = '0123456789abcdef';
  bytes16 private constant HEX_CAPITAL = '0123456789ABCDEF';

  constructor(address logic_, string memory baseUri_, address caliverseHotwallet_) {
    require(logic_ != address(0), 'GeneralERC721Factory: logic_ is zero address');
    require(caliverseHotwallet_ != address(0), 'GeneralERC721Factory: caliverseHotwallet_ is zero address');
    admin = new ProxyAdmin();
    logic = logic_;
    baseUri = baseUri_;
    caliverseHotwallet = caliverseHotwallet_;
    admin.renounceOwnership();
  }

  function toChecksumHexString(address addr) public pure returns (string memory) {
    bytes memory lowercase = new bytes(40);
    uint160 currentAddressValue = uint160(addr);
    for (uint i = 40; i > 0; --i) {
      lowercase[i - 1] = HEX_DIGITS[currentAddressValue & 0xf];
      currentAddressValue >>= 4;
    }
    bytes32 hashed_addr = keccak256(abi.encodePacked(lowercase));

    bytes memory buffer = new bytes(42);
    buffer[0] = '0';
    buffer[1] = 'x';

    uint160 addrValue = uint160(addr);
    uint160 hashValue = uint160(bytes20(hashed_addr));
    for (uint i = 41; i > 1; --i) {
      uint hashIndex = hashValue & 0xf;
      if (hashIndex > 7) {
        buffer[i] = HEX_CAPITAL[addrValue & 0xf];
      } else {
        buffer[i] = HEX_DIGITS[addrValue & 0xf];
      }
      addrValue >>= 4;
      hashValue >>= 4;
    }
    return string(abi.encodePacked(buffer));
  }

  function build(string memory name_, string memory symbol_, uint256 collectionSize_) public {
    require(logic != address(0), 'GeneralERC721Factory: logic is zero address');
    require(caliverseHotwallet != address(0), 'GeneralERC721Factory: caliverseHotwallet is zero address');
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(logic), address(admin), '');

    proxies.push(proxy);
    GeneralERC721V1(address(proxy)).initialize(
      name_,
      symbol_,
      collectionSize_,
      string(abi.encodePacked(baseUri, toChecksumHexString(address(proxy)), '/metadata/')),
      caliverseHotwallet
    );
    GeneralERC721V1(address(proxy)).transferOwnership(msg.sender);
  }

  function setUri(string memory baseUri_) public onlyOwner {
    baseUri = baseUri_;
  }

  function totalProxies() public view returns (uint256) {
    return proxies.length;
  }
}
