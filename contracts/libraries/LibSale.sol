// SPDX-License-Identifier: MIT

import '@openzeppelin/contracts/utils/Address.sol';

pragma solidity ^0.8.12;

library LibSale {
  modifier callerIsUser() {
    ensureCallerIsUser();
    _;
  }

  function ensureCallerIsUser() public view {
    require(tx.origin == msg.sender, 'The caller is another contract');
  }

  function refundIfOver(uint256 price_) public {
    require(msg.value >= price_, 'Need to send more ETH.');
    if (msg.value > price_) {
      Address.sendValue(payable(msg.sender), msg.value - price_);
    }
  }

  function _commonValidation(SaleInfo storage saleInfo, uint256 quantity) public view {
    require(saleInfo.startTime <= block.timestamp && saleInfo.endTime >= block.timestamp, 'not opened');
    require(quantity <= saleInfo.maxPerTx, 'can not mint this many');
    require(saleInfo.mintedDuringSale[msg.sender] + quantity <= saleInfo.maxPerAddr, 'exceed max mint per address');
  }

  function validatePublicSale(SaleInfo storage saleInfo, uint256 quantity) public view {
    _commonValidation(saleInfo, quantity);

    require(saleInfo._mintType == 2, 'public sale not opened');
  }

  function validatePrivateSale(SaleInfo storage saleInfo, uint256 quantity) public view callerIsUser {
    _commonValidation(saleInfo, quantity);

    require(saleInfo._mintType == 1, 'sale not opened');
    require(saleInfo.allowlist[msg.sender] >= quantity, 'not eligible for allowlist mint');
  }
}

struct SaleInfo {
  uint32 startTime;
  uint32 endTime;
  uint256 price;
  uint256 limit; // 전체 제한이 아니라 이번 세일에서의 제한
  uint256 maxPerAddr;
  uint256 maxPerTx;
  uint32 _mintType; // 1: allow sale, 2: public sale
  mapping(address => uint256) allowlist;
  mapping(address => uint256) mintedDuringSale;
  address[] participants;
  bool adminOnly;
  uint256 totalMinted;
}
